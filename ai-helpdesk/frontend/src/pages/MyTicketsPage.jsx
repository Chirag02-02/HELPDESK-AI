import React, { useState, useEffect } from 'react'
import { Plus, RotateCcw, XCircle, MessageSquare, Search, Filter, LifeBuoy, AlertTriangle, Ticket } from 'lucide-react'
import { ticketApi } from '../services/api'
import { useToast } from '../context/ToastContext'
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/Badges'
import NewTicketModal from '../components/NewTicketModal'
import Modal from '../components/Modal'
import TopBar from '../components/TopBar'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const FILTERS = ['ALL', 'OPEN', 'PENDING', 'IN_PROGRESS', 'CLOSED']

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
      .catch(() => toast('Failed to load tickets', 'error'))
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

  const handleClose = async id => {
    try {
      await ticketApi.close(id)
      setTickets(t => t.map(x => x.id === id ? { ...x, status: 'CLOSED' } : x))
      setSelected(s => s?.id === id ? { ...s, status: 'CLOSED' } : s)
      toast(`Ticket #${id} closed`, 'success')
    } catch {
      toast('Failed to close ticket', 'error')
    }
  }

  const handleReopen = async id => {
    try {
      await ticketApi.reopen(id)
      setTickets(t => t.map(x => x.id === id ? { ...x, status: 'OPEN' } : x))
      setSelected(s => s?.id === id ? { ...s, status: 'OPEN' } : s)
      toast(`Ticket #${id} reopened`, 'success')
    } catch {
      toast('Failed to reopen ticket', 'error')
    }
  }

  const handleEscalate = async id => {
    try {
      const { data } = await ticketApi.escalate(id)
      setTickets(t => t.map(x => x.id === id ? data : x))
      setSelected(null)
      toast('Ticket raised for human support selection', 'success')
      navigate(`/chat?ticketId=${id}`)
    } catch {
      toast('Failed to escalate ticket', 'error')
    }
  }

  const fmt = d => d ? new Date(d).toLocaleString() : '—'

  return (
    <div className="main">
      <TopBar
        title="My Support Tickets"
        subtitle="Manage and track your customer service inquiries"
        actions={
          user?.role === 'CUSTOMER' && (
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>
              <Plus size={15} /> Submit New Ticket
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
                key={f}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.replace('_', ' ')}
                <span style={{ marginLeft: '6px', opacity: 0.8, fontSize: '11px', fontWeight: 700 }}>
                  {f === 'ALL' ? tickets.length : tickets.filter(t => t.status === f).length}
                </span>
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              className="input"
              placeholder="Search by ID or subject..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '32px' }}
            />
          </div>
        </div>

        {loading ? (
          <div className="empty">
            <div className="empty-msg">Fetching support ticket list...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><Ticket size={32} style={{ color: 'var(--text-dim)' }} /></div>
            <div className="empty-msg">No {filter !== 'ALL' ? filter.toLowerCase() + ' ' : ''}tickets matching your criteria.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Created Date</th>
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
                    <td style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>{t.assignedTo || 'Unassigned'}</td>
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
        )}
      </div>

      {/* Ticket Detail Modal */}
      {selected && (
        <Modal title={`Ticket #${selected.id} — ${selected.title}`} onClose={() => setSelected(null)}>
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
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{selected.assignedTo || 'Unassigned'}</span>
            </div>
            <div>
              <div className="form-label">AI Resolved Status</div>
              <span style={{ fontSize: '13px', color: selected.aiResolved ? 'var(--green)' : 'var(--text-muted)' }}>
                {selected.aiResolved ? 'Yes (RAG Resolved)' : 'No (Human Queue)'}
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

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-primary" onClick={() => { setSelected(null); navigate(`/chat?ticketId=${selected.id}`); }}>
              <MessageSquare size={14} /> Open Conversation Chat
            </button>
            {selected.status !== 'CLOSED' && selected.assignedTo === 'AI' && (
              <button className="btn btn-danger" onClick={() => handleEscalate(selected.id)}>
                <AlertTriangle size={14} /> Escalate to Agent Queue
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
            setShowNew(false)
          }}
        />
      )}
    </div>
  )
}
