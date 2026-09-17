import { useState, useEffect } from 'react'
import { Headset, RefreshCw, MessageSquare, ArrowRight, User, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { adminApi } from '../services/api'
import { StatusBadge, PriorityBadge } from './Badges'
import { useNavigate } from 'react-router-dom'

export default function HumanSupportPanel({ onSelectTicket, compact = false }) {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadTickets = (isInitial = false) => {
    if (isInitial) setLoading(true)
    setError(null)
    adminApi.humanSupportTickets()
      .then(res => {
        setTickets(res.data || [])
      })
      .catch(err => {
        console.error('Error fetching human support tickets:', err)
        setError('Failed to load human support tickets. Please try again.')
      })
      .finally(() => {
        if (isInitial) setLoading(false)
      })
  }

  useEffect(() => {
    loadTickets(true)
    const interval = setInterval(() => loadTickets(false), 3000)
    return () => clearInterval(interval)
  }, [])

  const handleTicketClick = (ticketId) => {
    if (onSelectTicket) {
      onSelectTicket(ticketId)
    } else {
      navigate(`/chat?ticketId=${ticketId}`)
    }
  }

  const fmtTime = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div className="card" style={{ marginBottom: compact ? 12 : 20, padding: compact ? 12 : 18 }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(217,119,6,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Headset size={16} color="#d97706" />
          </div>
          <div>
            <span style={{ fontWeight: 600, fontSize: compact ? 13 : 15, color: 'var(--text)' }}>
              Human Support / Active Support
            </span>
            <span className="badge badge-pending" style={{ marginLeft: 8, fontSize: 10, padding: '2px 7px' }}>
              {tickets.length} Required
            </span>
          </div>
        </div>

        <button 
          className="btn btn-sm btn-ghost" 
          onClick={loadTickets} 
          disabled={loading}
          title="Refresh Support Queue"
          aria-label="Refresh Support Queue"
          style={{ fontSize: 11, padding: '4px 8px', height: 28 }}
        >
          <RefreshCw size={12} className={loading ? 'spin' : ''} />
          {!compact && <span style={{ marginLeft: 4 }}>Refresh</span>}
        </button>
      </div>

      {/* Body Content */}
      {loading && tickets.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
          Loading active human support queue…
        </div>
      ) : error ? (
        <div style={{ padding: 16, background: 'rgba(218,54,51,0.08)', borderRadius: 'var(--r)', color: 'var(--red)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} /> {error}
        </div>
      ) : tickets.length === 0 ? (
        <div style={{ border: '1px dashed var(--border)', borderRadius: 'var(--r)', padding: '24px 16px', textAlign: 'center' }}>
          <CheckCircle2 size={24} style={{ color: 'var(--green)', margin: '0 auto 8px', display: 'block' }} />
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', marginBottom: 4 }}>
            No active human support tickets
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
            All customer requests are currently resolved or handled by AI.
          </div>
        </div>
      ) : (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: compact ? 8 : 10, 
          maxHeight: compact ? 300 : 420, 
          overflowY: 'auto',
          paddingRight: 2
        }}>
          {tickets.map(t => (
            <div
              key={t.id}
              onClick={() => handleTicketClick(t.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                padding: compact ? '10px 12px' : '12px 14px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)',
                background: 'var(--bg-3)',
                cursor: 'pointer',
                transition: 'border-color 0.2s, background-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-bg)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              {/* Row 1: ID, Title, Status & Priority */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--accent-text)' }}>
                    #{t.id}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: compact ? 180 : 320 }}>
                    {t.title}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                </div>
              </div>

              {/* Row 2: Customer, Assigned Agent/Dept, Time */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <User size={11} /> {t.user?.name || t.user?.email || 'Customer'}
                  </span>
                  <span style={{ color: 'var(--text-2)', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 3 }}>
                    Assigned: <strong>{t.assignedTo}</strong>
                  </span>
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Clock size={10} /> {fmtTime(t.updatedAt)}
                </span>
              </div>

              {/* Row 3: Last Message snippet & Action */}
              {t.lastMessage && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  marginTop: 2, 
                  paddingTop: 6, 
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                  fontSize: 12,
                  color: 'var(--text-2)'
                }}>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '85%' }}>
                    <span style={{ color: 'var(--text-3)', fontStyle: 'italic', marginRight: 4 }}>Last msg:</span>
                    {t.lastMessage}
                  </div>
                  <ArrowRight size={13} style={{ color: 'var(--accent-text)', flexShrink: 0 }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}`}</style>
    </div>
  )
}
