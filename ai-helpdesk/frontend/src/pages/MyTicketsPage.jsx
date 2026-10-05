import React, { useState, useEffect } from 'react'
import { Plus, MessageSquare, Search, Ticket, Bot, CheckCircle2, AlertTriangle } from 'lucide-react'
import { ticketApi } from '../services/api'
import { useToast } from '../context/ToastContext'
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/Badges'
import NewTicketModal from '../components/NewTicketModal'
import Modal from '../components/Modal'
import TopBar from '../components/TopBar'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'OPEN', label: 'Open' },
  { id: 'PENDING', label: 'Waiting for reply' },
  { id: 'IN_PROGRESS', label: 'In progress' },
  { id: 'CLOSED', label: 'Solved' }
]

export default function MyTicketsPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [selected, setSelected] = useState(null)

  const load = () => {
    setLoading(true)
    ticketApi.myList()
      .then(r => setTickets(r.data))
      .catch(() => toast('Failed to load requests', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const filtered = tickets.filter(t => {
    const matchesFilter = filter === 'ALL' || t.status === filter
    const matchesSearch = !searchTerm.trim() || 
      t.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.id?.toString().includes(searchTerm) ||
      t.category?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const handleEscalate = async id => {
    try {
      const { data } = await ticketApi.escalate(id)
      setTickets(t => t.map(x => x.id === id ? data : x))
      setSelected(null)
      toast('Request sent to human support team', 'success')
      navigate(`/chat?ticketId=${id}`)
    } catch {
      toast('Failed to escalate request', 'error')
    }
  }

  const fmt = d => d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'

  return (
    <div className="main">
      <TopBar
        title="My Requests"
        subtitle="Track and manage all your support requests"
        actions={
          user?.role === 'CUSTOMER' && (
            <button className="btn btn-primary" onClick={() => setShowNew(true)} style={{ minHeight: '38px', padding: '6px 12px' }}>
              <Plus size={15} /> <span>Report Problem</span>
            </button>
          )
        }
      />

      <div className="page">
        {/* Search & Filter Toolbar */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button
                key={f.id}
                className={`btn btn-sm ${filter === f.id ? 'btn-primary' : ''}`}
                onClick={() => setFilter(f.id)}
                style={{ minHeight: '36px' }}
              >
                {f.label}
                <span style={{ marginLeft: '6px', opacity: 0.85, fontSize: '11px', fontWeight: 700 }}>
                  {f.id === 'ALL' ? tickets.length : tickets.filter(t => t.status === f.id).length}
                </span>
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', width: '100%', maxWidth: '260px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              className="input"
              placeholder="Search by ID or title..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '32px' }}
            />
          </div>
        </div>

        {loading ? (
          <div className="empty">
            <div className="empty-msg">Fetching your support requests...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty" style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div className="empty-icon" style={{ margin: '0 auto 12px' }}>
              <Ticket size={36} style={{ color: 'var(--text-dim)' }} />
            </div>
            <div className="empty-msg" style={{ fontSize: '15px', color: 'var(--text-main)', marginBottom: '8px' }}>
              {tickets.length === 0
                ? "You haven't sent any requests yet. Need help? Start a chat or report a problem."
                : "No requests match your current filters."}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
              <button className="btn btn-primary" onClick={() => navigate('/chat')}>
                <Bot size={15} /> Start Chat
              </button>
              <button className="btn" onClick={() => setShowNew(true)}>
                <Plus size={15} /> Report a Problem
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-wrap desktop-only">
              <table className="table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Date Created</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(t)}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-light)', fontWeight: 600 }}>
                        #{t.id}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-main)' }}>{t.title}</div>
                      </td>
                      <td><CategoryBadge category={t.category} /></td>
                      <td><PriorityBadge priority={t.priority} /></td>
                      <td><StatusBadge status={t.status} /></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>{t.assignedTo || 'AI Helper'}</td>
                      <td style={{ color: 'var(--text-dim)', fontSize: '12px' }}>{fmt(t.createdAt)}</td>
                      <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(`/chat?ticketId=${t.id}`)}
                        >
                          <MessageSquare size={13} /> Chat
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards View */}
            <div className="mobile-only-cards" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filtered.map(t => (
                <div
                  key={t.id}
                  onClick={() => setSelected(t)}
                  style={{
                    padding: '14px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)', lineHeight: 1.4 }}>{t.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>#{t.id} • {fmt(t.createdAt)}</div>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <CategoryBadge category={t.category} />
                      <PriorityBadge priority={t.priority} />
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/chat?ticketId=${t.id}`)
                      }}
                      style={{ padding: '6px 12px' }}
                    >
                      <MessageSquare size={13} /> Chat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Request Detail Modal */}
      {selected && (
        <Modal title={`Request #${selected.id} — ${selected.title}`} onClose={() => setSelected(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', marginBottom: '20px' }}>
            <div>
              <div className="form-label">Status</div>
              <StatusBadge status={selected.status} />
            </div>
            <div>
              <div className="form-label">Priority</div>
              <PriorityBadge priority={selected.priority} />
            </div>
            <div>
              <div className="form-label">Category</div>
              <CategoryBadge category={selected.category} />
            </div>
            <div>
              <div className="form-label">Assigned Handler</div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{selected.assignedTo || 'AI Helper'}</span>
            </div>
            <div>
              <div className="form-label">Solved by AI</div>
              <span style={{ fontSize: '13px', color: selected.aiResolved ? 'var(--green)' : 'var(--text-muted)' }}>
                {selected.aiResolved ? 'Yes (Answered by AI)' : 'No (Assigned to support team)'}
              </span>
            </div>
            <div>
              <div className="form-label">Submitted On</div>
              <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{fmt(selected.createdAt)}</span>
            </div>
          </div>

          {selected.description && (
            <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '14px', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-main)', marginBottom: '20px' }}>
              <div className="form-label" style={{ marginBottom: '6px' }}>Description</div>
              {selected.description}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => { setSelected(null); navigate(`/chat?ticketId=${selected.id}`); }} style={{ flex: 1 }}>
              <MessageSquare size={14} /> Open Chat
            </button>
            {selected.status !== 'CLOSED' && selected.assignedTo === 'AI' && (
              <button className="btn btn-danger" onClick={() => handleEscalate(selected.id)} style={{ flex: 1 }}>
                <AlertTriangle size={14} /> Request Agent
              </button>
            )}
          </div>
        </Modal>
      )}

      {showNew && (
        <NewTicketModal
          onClose={() => setShowNew(false)}
          onCreated={t => {
            setTickets(prev => [t, ...prev])
          }}
        />
      )}
    </div>
  )
}
