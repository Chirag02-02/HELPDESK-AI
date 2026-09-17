import React, { useState, useEffect } from 'react'
import { Search, UserCheck, MessageSquare, AlertTriangle, ShieldCheck, CheckCircle2, Inbox } from 'lucide-react'
import { adminApi, ticketApi } from '../services/api'
import { useToast } from '../context/ToastContext'
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/Badges'
import Modal from '../components/Modal'
import TopBar from '../components/TopBar'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import HumanSupportPanel from '../components/HumanSupportPanel'

const PRIORITIES = ['', 'HIGH', 'CRITICAL', 'MEDIUM', 'LOW']
const DEPARTMENTS = ['AI', 'Finance Team', 'Technical Team', 'Delivery Team', 'Account Team']

export default function AdminTicketsPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [assignTo, setAssignTo] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  useEffect(() => {
    if (selected) {
      setLoadingMessages(true)
      ticketApi.getMessages(selected.id)
        .then(res => setMessages(res.data))
        .catch(() => toast('Failed to load conversation history', 'error'))
        .finally(() => setLoadingMessages(false))
    } else {
      setMessages([])
    }
  }, [selected])

  const handleSendReply = async () => {
    if (!replyText.trim() || !selected) return
    setSendingReply(true)
    try {
      await adminApi.replyTicket(selected.id, { message: replyText.trim() })
      setReplyText('')

      const res = await ticketApi.getMessages(selected.id)
      setMessages(res.data)

      const ticketRes = await ticketApi.getOne(selected.id)
      setTickets(t => t.map(x => x.id === selected.id ? ticketRes.data : x))
      setSelected(ticketRes.data)
      toast('Support response dispatched to customer', 'success')
    } catch (err) {
      toast('Failed to send reply: ' + (err.response?.data?.message || err.message), 'error')
    } finally {
      setSendingReply(false)
    }
  }

  const load = (priority = priorityFilter) => {
    setLoading(true)
    adminApi.allTickets(priority ? { priority } : {})
      .then(r => setTickets(r.data))
      .catch(() => toast('Failed to load administrative ticket queue', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleFilterChange = v => {
    setPriorityFilter(v)
    load(v)
  }

  const filtered = tickets.filter(t =>
    !search ||
    t.title?.toLowerCase().includes(search.toLowerCase()) ||
    String(t.id).includes(search) ||
    t.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
    t.user?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const handleClose = async id => {
    try {
      await adminApi.closeTicket(id)
      setTickets(t => t.map(x => x.id === id ? { ...x, status: 'CLOSED' } : x))
      setSelected(s => s?.id === id ? { ...s, status: 'CLOSED' } : s)
      toast(`Ticket #${id} marked as resolved & closed`, 'success')
    } catch {
      toast('Failed to close ticket', 'error')
    }

  }

  const handleAssign = async () => {
    if (!assignTo || !selected) return
    setAssigning(true)
    try {
      await adminApi.assign(selected.id, { assignedTo: assignTo })
      setTickets(t => t.map(x => x.id === selected.id ? { ...x, assignedTo: assignTo, status: 'IN_PROGRESS' } : x))
      setSelected(s => ({ ...s, assignedTo: assignTo, status: 'IN_PROGRESS' }))
      toast(`Ticket #${selected.id} assigned to ${assignTo}`, 'success')
      ticketApi.getMessages(selected.id).then(res => setMessages(res.data)).catch(() => { })
    } catch {
      toast('Failed to assign ticket', 'error')
    } finally {
      setAssigning(false)
    }
  }

  const fmt = d => d ? new Date(d).toLocaleString() : '—'

  return (
    <div className="main">
      <TopBar
        title="Administrative Ticket Queue"
        subtitle="Review inbound issues, route escalations, and manage agent assignments"
        actions={
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                className="input"
                placeholder="Search ticket, customer..."
                style={{ paddingLeft: '32px' }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="select" style={{ width: '150px' }} value={priorityFilter} onChange={e => handleFilterChange(e.target.value)}>
              <option value="">All Priorities</option>
              {PRIORITIES.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        }
      />

      <div className="page">
        {user?.role === 'ADMIN' && (
          <HumanSupportPanel
            onSelectTicket={id => {
              const found = tickets.find(t => t.id === id)
              if (found) {
                setSelected(found)
                setAssignTo(found.assignedTo || '')
              } else {
                navigate(`/chat?ticketId=${id}`)
              }
            }}
          />
        )}

        {loading ? (
          <div className="empty"><div className="empty-msg">Loading ticket database...</div></div>
        ) : filtered.length === 0 ? (
          <div className="empty"><div className="empty-icon"><Inbox size={32} style={{ color: 'var(--text-dim)' }} /></div><div className="empty-msg">No tickets found in queue.</div></div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Subject</th>
                  <th>Customer</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Last Updated</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => { setSelected(t); setAssignTo(t.assignedTo || '') }}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-light)', fontWeight: 600 }}>
                      #{t.id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-main)' }}>{t.title}</div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>{t.user?.name || t.user?.email || '—'}</td>
                    <td><CategoryBadge category={t.category} /></td>
                    <td><PriorityBadge priority={t.priority} /></td>
                    <td><StatusBadge status={t.status} /></td>
                    <td style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 500 }}>{t.assignedTo || 'Unassigned'}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{fmt(t.updatedAt)}</td>
                    <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/chat?ticketId=${t.id}`)}
                      >
                        <MessageSquare size={13} /> Chat Console
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <Modal title={`Manage Ticket #${selected.id} — ${selected.title}`} onClose={() => { setSelected(null); setReplyText(''); }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 18px', marginBottom: '16px' }}>
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
              <div className="form-label">Customer Contact</div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                {selected.user?.name ? `${selected.user.name} (${selected.user.email})` : selected.user?.email || '—'}
              </span>
            </div>
            <div>
              <div className="form-label">Assigned Handler</div>
              <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 600 }}>{selected.assignedTo || 'Unassigned'}</span>
            </div>
            <div>
              <div className="form-label">AI RAG Resolution</div>
              <span style={{ fontSize: '13px', color: selected.aiResolved ? 'var(--green)' : 'var(--text-muted)' }}>
                {selected.aiResolved ? 'Resolved by Hybrid RAG' : 'Escalated for Agent Action'}
              </span>
            </div>
          </div>

          {selected.description && (
            <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-main)', marginBottom: '16px' }}>
              <div className="form-label" style={{ marginBottom: '4px' }}>Customer Description</div>
              {selected.description}
            </div>
          )}

          {/* Conversation Transcript */}
          <div className="form-label" style={{ marginBottom: '8px' }}>Conversation Activity Log</div>
          {loadingMessages ? (
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '16px' }}>Loading conversation entries...</div>
          ) : messages.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: '16px' }}>No messages recorded yet.</div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxHeight: '220px',
              overflowY: 'auto',
              background: 'var(--bg-dark)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px',
              marginBottom: '16px'
            }}>
              {messages.map(m => {
                let sender = 'Customer'
                if (m.senderType === 'AI') sender = 'HelpDesk AI'
                else if (m.senderType === 'AGENT') sender = 'Support Agent'
                else if (selected.user?.name) sender = selected.user.name

                return (
                  <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)' }}>
                      <span style={{ fontWeight: 700, color: m.senderType === 'AI' ? 'var(--accent-light)' : m.senderType === 'AGENT' ? '#60a5fa' : 'var(--text-main)' }}>
                        {sender}
                      </span>
                      <span>{m.sentAt ? new Date(m.sentAt).toLocaleTimeString() : ''}</span>
                    </div>
                    <div style={{
                      fontSize: '12.5px',
                      color: 'var(--text-main)',
                      whiteSpace: 'pre-wrap',
                      background: m.senderType === 'CUSTOMER' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(30, 41, 59, 0.6)',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)'
                    }}>
                      {m.content}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Direct Support Reply Input */}
          {selected.status !== 'CLOSED' && (
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Dispatch Support Reply to Customer</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="input"
                  placeholder="Type an official support response..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendReply()
                    }
                  }}
                  disabled={sendingReply}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleSendReply}
                  disabled={sendingReply || !replyText.trim()}
                >
                  {sendingReply ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </div>
          )}

          {/* Department Assignment */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', marginTop: '14px' }}>
            <label className="form-label">Route to Department / Agent</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <select className="select" value={assignTo} onChange={e => setAssignTo(e.target.value)} style={{ flex: 1 }}>
                <option value="">Select target department...</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <button className="btn btn-primary" onClick={handleAssign} disabled={assigning || !assignTo}>
                <UserCheck size={14} /> Reassign
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/chat?ticketId=${selected.id}`)}
              style={{ flex: 1 }}
            >
              <MessageSquare size={14} /> Open Live Chat Console
            </button>
            {selected.status !== 'CLOSED' && (user?.role?.toUpperCase() === 'ADMIN' || user?.role === 'ROLE_ADMIN') && (
              <button className="btn btn-danger" onClick={() => handleClose(selected.id)}>
                Close Ticket
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
