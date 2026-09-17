import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ticket, CheckCircle2, Bot, Clock, Plus, ChevronRight, AlertCircle, Sparkles, Activity, Inbox } from 'lucide-react'
import { ticketApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/Badges'
import NewTicketModal from '../components/NewTicketModal'
import TopBar from '../components/TopBar'

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewTicket, setShowNewTicket] = useState(false)

  useEffect(() => {
    ticketApi.myList()
      .then(r => setTickets(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const openCount = tickets.filter(t => t.status === 'OPEN' || t.status === 'PENDING' || t.status === 'IN_PROGRESS').length
  const closedCount = tickets.filter(t => t.status === 'CLOSED').length
  const aiSolvedCount = tickets.filter(t => t.aiResolved).length
  const avgRate = tickets.length ? Math.round((aiSolvedCount / tickets.length) * 100) : 85
  const recentTickets = tickets.slice(0, 5)

  return (
    <div className="main">
      <TopBar
        title={`Welcome back, ${user?.name?.split(' ')[0] || 'User'}`}
        subtitle="AI-powered customer support overview & active ticket metrics"
        actions={
          user?.role === 'CUSTOMER' && (
            <button className="btn btn-primary" onClick={() => setShowNewTicket(true)}>
              <Plus size={15} /> Submit Support Ticket
            </button>
          )
        }
      />

      <div className="page">
        {/* Metric Cards Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Active Tickets</span>
              <div className="stat-icon" style={{ background: 'var(--blue-bg)', color: '#60a5fa' }}>
                <Ticket size={18} />
              </div>
            </div>
            <div className="stat-value">{openCount}</div>
            <div className="stat-sub">In queue or pending agent reply</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Resolved Issues</span>
              <div className="stat-icon" style={{ background: 'var(--green-bg)', color: '#34d399' }}>
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="stat-value" style={{ color: '#34d399' }}>{closedCount}</div>
            <div className="stat-sub">Closed support cases</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">RAG Resolution Rate</span>
              <div className="stat-icon" style={{ background: 'var(--accent-dim)', color: 'var(--accent-light)' }}>
                <Bot size={18} />
              </div>
            </div>
            <div className="stat-value" style={{ color: 'var(--accent-light)' }}>{avgRate}%</div>
            <div className="stat-sub">Resolved directly by AI</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Avg AI Latency</span>
              <div className="stat-icon" style={{ background: 'var(--amber-bg)', color: '#fbbf24' }}>
                <Clock size={18} />
              </div>
            </div>
            <div className="stat-value" style={{ color: '#fbbf24' }}>&lt; 2s</div>
            <div className="stat-sub">Hybrid retrieval context generation</div>
          </div>
        </div>

        {/* Content Section */}
        <div className="two-col" style={{ gap: '20px' }}>
          {/* Recent Tickets Card */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 700 }}>Recent Tickets</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Latest updates from your support inquiries</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tickets')} style={{ marginLeft: 'auto' }}>
                View All <ChevronRight size={14} />
              </button>
            </div>

            {loading ? (
              <div className="empty">
                <div className="empty-msg">Loading ticket data...</div>
              </div>
            ) : recentTickets.length === 0 ? (
              <div className="empty">
                <div className="empty-icon"><Inbox size={32} style={{ color: 'var(--text-dim)' }} /></div>
                <div className="empty-msg">No recent support tickets. All systems nominal!</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID & Subject</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTickets.map(t => (
                      <tr key={t.id} onClick={() => navigate('/tickets')} style={{ cursor: 'pointer' }}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{t.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>#{t.id}</div>
                        </td>
                        <td><CategoryBadge category={t.category} /></td>
                        <td><PriorityBadge priority={t.priority} /></td>
                        <td><StatusBadge status={t.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Actions & AI Intelligence */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card">
              <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>Quick Support Actions</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button className="btn btn-primary" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/chat')}>
                  <Bot size={16} /> Interactive AI Support Assistant
                </button>
                {user?.role === 'CUSTOMER' && (
                  <button className="btn" style={{ justifyContent: 'flex-start' }} onClick={() => setShowNewTicket(true)}>
                    <Plus size={16} /> Submit New Support Ticket
                  </button>
                )}
                <button className="btn btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/tickets')}>
                  <Ticket size={16} /> Review Complete Ticket History
                </button>
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Sparkles size={18} style={{ color: 'var(--accent-light)' }} />
                <h2 style={{ fontSize: '15px', fontWeight: 700 }}>Hybrid RAG Intelligence</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--green)', flexShrink: 0, marginTop: '2px' }} />
                  <span>Real-time Semantic Vector + Keyword Search indexes verified knowledge solutions.</span>
                </div>
                {openCount > 0 && (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <AlertCircle size={16} style={{ color: '#fbbf24', flexShrink: 0, marginTop: '2px' }} />
                    <span>{openCount} active support session{openCount === 1 ? '' : 's'} in progress.</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Activity size={16} style={{ color: 'var(--accent-light)', flexShrink: 0, marginTop: '2px' }} />
                  <span>Strict anti-hallucination grounding routes complex requests to Human Support Agents.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showNewTicket && (
        <NewTicketModal
          onClose={() => setShowNewTicket(false)}
          onCreated={ticket => {
            setTickets(prev => [ticket, ...prev])
            setShowNewTicket(false)
          }}
        />
      )}
    </div>
  )
}
