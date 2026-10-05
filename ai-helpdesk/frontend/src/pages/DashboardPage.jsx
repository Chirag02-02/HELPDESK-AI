import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ticket, CheckCircle2, Bot, Clock, Plus, ChevronRight, Sparkles, Inbox, MessageSquare, Headphones } from 'lucide-react'
import { ticketApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/Badges'
import NewTicketModal from '../components/NewTicketModal'
import TopBar from '../components/TopBar'
import Tooltip from '../components/Tooltip'

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
        subtitle="Get instant answers from AI or report a problem to our support team"
        actions={
          user?.role === 'CUSTOMER' && (
            <button className="btn btn-primary" onClick={() => setShowNewTicket(true)} style={{ minHeight: '38px', padding: '6px 12px' }}>
              <Plus size={15} /> <span>Get Help</span>
            </button>
          )
        }
      />

      <div className="page">
        {/* HERO SECTION: "What do you want to do?" */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            What do you want to do?
          </h2>
          <div className="hero-grid">
            {/* Card 1: Chat with AI */}
            <div className="hero-card">
              <div>
                <div className="hero-card-title">
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-dim)', color: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Bot size={20} />
                  </div>
                  <span>Need a quick answer?</span>
                </div>
                <div className="hero-card-sub">
                  Chat with our AI. Replies in seconds.
                </div>
              </div>
              <button className="btn btn-primary hero-btn" onClick={() => navigate('/chat')}>
                <MessageSquare size={16} /> Start Chat
              </button>
            </div>

            {/* Card 2: Report a Problem */}
            <div className="hero-card hero-card-secondary">
              <div>
                <div className="hero-card-title">
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Plus size={20} />
                  </div>
                  <span>Have a problem to report?</span>
                </div>
                <div className="hero-card-sub">
                  Send it to our support team.
                </div>
              </div>
              <button
                className="btn hero-btn"
                style={{ background: '#10b981', borderColor: '#10b981', color: '#ffffff' }}
                onClick={() => setShowNewTicket(true)}
              >
                <Plus size={16} /> Report a Problem
              </button>
            </div>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">
                Open Requests
                <Tooltip text="Requests currently being processed or waiting for a support reply." />
              </span>
              <div className="stat-icon" style={{ background: 'var(--blue-bg)', color: '#60a5fa' }}>
                <Ticket size={18} />
              </div>
            </div>
            <div className="stat-value">{openCount}</div>
            <div className="stat-sub">Waiting for a reply</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Solved</span>
              <div className="stat-icon" style={{ background: 'var(--green-bg)', color: '#34d399' }}>
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="stat-value" style={{ color: '#34d399' }}>{closedCount}</div>
            <div className="stat-sub">Problems fixed</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">
                Solved by AI
                <Tooltip text="Percentage of requests answered instantly by AI without needing a human agent." />
              </span>
              <div className="stat-icon" style={{ background: 'var(--accent-dim)', color: 'var(--accent-light)' }}>
                <Bot size={18} />
              </div>
            </div>
            <div className="stat-value" style={{ color: 'var(--accent-light)' }}>{avgRate}%</div>
            <div className="stat-sub">Fixed instantly without waiting</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">AI Reply Speed</span>
              <div className="stat-icon" style={{ background: 'var(--amber-bg)', color: '#fbbf24' }}>
                <Clock size={18} />
              </div>
            </div>
            <div className="stat-value" style={{ color: '#fbbf24' }}>&lt; 2s</div>
            <div className="stat-sub">Usually under 2 seconds</div>
          </div>
        </div>

        {/* Content Section */}
        <div className="two-col" style={{ gap: '20px' }}>
          {/* Recent Requests Card */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 700 }}>Recent Requests</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Latest updates on your requests</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tickets')} style={{ marginLeft: 'auto' }}>
                View All <ChevronRight size={14} />
              </button>
            </div>

            {loading ? (
              <div className="empty">
                <div className="empty-msg">Loading request details...</div>
              </div>
            ) : recentTickets.length === 0 ? (
              <div className="empty">
                <div className="empty-icon"><Inbox size={32} style={{ color: 'var(--text-dim)' }} /></div>
                <div className="empty-msg" style={{ marginBottom: '12px' }}>
                  You haven't sent any requests yet. Need help? Start a chat or report a problem.
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button className="btn btn-sm btn-primary" onClick={() => navigate('/chat')}>
                    <Bot size={14} /> Start Chat
                  </button>
                  <button className="btn btn-sm" onClick={() => setShowNewTicket(true)}>
                    <Plus size={14} /> Report a Problem
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="table-wrap desktop-only">
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

                {/* Mobile Cards */}
                <div className="mobile-only-cards">
                  {recentTickets.map(t => (
                    <div
                      key={t.id}
                      onClick={() => navigate('/tickets')}
                      style={{
                        padding: '12px 14px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>{t.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>#{t.id}</div>
                        </div>
                        <StatusBadge status={t.status} />
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <CategoryBadge category={t.category} />
                        <PriorityBadge priority={t.priority} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Quick Support Actions & How We Help You */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card">
              <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>Quick Support Actions</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button className="btn btn-primary" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/chat')}>
                  <Bot size={16} /> Chat with AI for instant help
                </button>
                {user?.role === 'CUSTOMER' && (
                  <button className="btn" style={{ justifyContent: 'flex-start' }} onClick={() => setShowNewTicket(true)}>
                    <Plus size={16} /> Report a problem to our team
                  </button>
                )}
                <button className="btn btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/tickets')}>
                  <Ticket size={16} /> See all my requests
                </button>
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Sparkles size={18} style={{ color: 'var(--accent-light)' }} />
                <h2 style={{ fontSize: '15px', fontWeight: 700 }}>How we help you</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13.5px', color: 'var(--text-main)' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <CheckCircle2 size={18} style={{ color: 'var(--green)', flexShrink: 0, marginTop: '2px' }} />
                  <span>AI answers common questions instantly</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Headphones size={18} style={{ color: '#60a5fa', flexShrink: 0, marginTop: '2px' }} />
                  <span>Complex problems go to a real support agent</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Clock size={18} style={{ color: 'var(--accent-light)', flexShrink: 0, marginTop: '2px' }} />
                  <span>You'll see updates in My Requests</span>
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
          }}
        />
      )}
    </div>
  )
}
