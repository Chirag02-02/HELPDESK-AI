import React, { useState, useEffect } from 'react'
import { Search, MessageSquare, AlertTriangle, ShieldCheck, CheckCircle2, Inbox, ArrowUpDown, ChevronLeft, ChevronRight, UserCheck, RefreshCw, X } from 'lucide-react'
import { adminApi, ticketApi } from '../services/api'
import { useToast } from '../context/ToastContext'
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/Badges'
import Modal from '../components/Modal'
import TopBar from '../components/TopBar'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const STATUS_OPTIONS = [
  { id: '', label: 'All Statuses' },
  { id: 'OPEN', label: 'Open' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'PENDING', label: 'Waiting for Customer' },
  { id: 'CLOSED', label: 'Resolved' }
]

const PRIORITY_OPTIONS = [
  { id: '', label: 'All Priorities' },
  { id: 'HIGH', label: 'Urgent' },
  { id: 'MEDIUM', label: 'Normal' },
  { id: 'LOW', label: 'Low' }
]

const CATEGORY_OPTIONS = [
  { id: '', label: 'All Categories' },
  { id: 'TECHNICAL', label: 'Technical' },
  { id: 'ORDER', label: 'Order' },
  { id: 'BILLING', label: 'Billing' },
  { id: 'ACCOUNT', label: 'Account' },
  { id: 'REFUND', label: 'Refund' },
  { id: 'OTHER', label: 'Other' }
]

const ASSIGNEE_OPTIONS = [
  { id: '', label: 'All Assignees' },
  { id: 'UNASSIGNED', label: 'Unassigned' },
  { id: 'AI', label: 'AI Helper' },
  { id: 'Finance Team', label: 'Finance Team' },
  { id: 'Technical Team', label: 'Technical Team' },
  { id: 'Delivery Team', label: 'Delivery Team' },
  { id: 'Account Team', label: 'Account Team' }
]

export default function AdminTicketsPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const paramTicketId = searchParams.get('ticketId')

  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)

  // Filter States
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')

  // Sorting & Pagination
  const [sortField, setSortField] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Modal / Selected Ticket
  const [selected, setSelected] = useState(null)
  const [assignTo, setAssignTo] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  const loadTickets = async () => {
    setLoading(true)
    try {
      const res = await adminApi.allTickets()
      const data = res.data || []
      setTickets(data)

      if (paramTicketId) {
        const found = data.find(t => t.id === parseInt(paramTicketId, 10))
        if (found) {
          setSelected(found)
          setAssignTo(found.assignedTo || '')
        }
      }
    } catch (err) {
      toast('Failed to load tickets queue', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
  }, [paramTicketId])

  useEffect(() => {
    if (selected) {
      setLoadingMessages(true)
      ticketApi.getMessages(selected.id)
        .then(res => setMessages(res.data || []))
        .catch(() => toast('Failed to load conversation log', 'error'))
        .finally(() => setLoadingMessages(false))
    } else {
      setMessages([])
    }
  }, [selected])

  const handleClearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setPriorityFilter('')
    setCategoryFilter('')
    setAssigneeFilter('')
    setCurrentPage(1)
  }

  const handleSort = field => {
    if (sortField === field) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleSendReply = async () => {
    if (!replyText.trim() || !selected) return
    setSendingReply(true)
    try {
      await adminApi.replyTicket(selected.id, { message: replyText.trim() })
      setReplyText('')
      toast('Support response sent to customer', 'success')

      const [msgRes, ticketRes] = await Promise.all([
        ticketApi.getMessages(selected.id),
        ticketApi.getOne(selected.id)
      ])
      setMessages(msgRes.data || [])
      setTickets(t => t.map(x => x.id === selected.id ? ticketRes.data : x))
      setSelected(ticketRes.data)
    } catch (err) {
      toast('Failed to send reply', 'error')
    } finally {
      setSendingReply(false)
    }
  }

  const handleAssign = async (targetAssignee = assignTo) => {
    if (!targetAssignee || !selected) return
    setAssigning(true)
    try {
      await adminApi.assign(selected.id, { assignedTo: targetAssignee })
      const updatedStatus = selected.status === 'CLOSED' ? 'CLOSED' : 'IN_PROGRESS'
      setTickets(t => t.map(x => x.id === selected.id ? { ...x, assignedTo: targetAssignee, status: updatedStatus } : x))
      setSelected(s => ({ ...s, assignedTo: targetAssignee, status: updatedStatus }))
      toast(`Assigned to ${targetAssignee}`, 'success')
    } catch {
      toast('Failed to assign ticket', 'error')
    } finally {
      setAssigning(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    if (!selected) return
    try {
      if (newStatus === 'CLOSED') {
        await adminApi.closeTicket(selected.id)
        toast('Ticket updated: Resolved', 'success')
      } else {
        await adminApi.assign(selected.id, { assignedTo: selected.assignedTo || 'AI', status: newStatus })
        toast(`Ticket updated: ${newStatus}`, 'success')
      }
      setTickets(t => t.map(x => x.id === selected.id ? { ...x, status: newStatus } : x))
      setSelected(s => ({ ...s, status: newStatus }))
    } catch {
      toast('Failed to update status', 'error')
    }
  }

  const handlePriorityChange = async (newPriority) => {
    if (!selected) return
    try {
      await adminApi.setPriority(selected.id, { priority: newPriority })
      setTickets(t => t.map(x => x.id === selected.id ? { ...x, priority: newPriority } : x))
      setSelected(s => ({ ...s, priority: newPriority }))
      toast('Ticket updated: Priority set to ' + newPriority, 'success')
    } catch {
      toast('Failed to update priority', 'error')
    }
  }

  // Filter Logic
  const filtered = tickets.filter(t => {
    const matchesSearch = !search ||
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      String(t.id).includes(search) ||
      t.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
      t.user?.name?.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = !statusFilter || t.status === statusFilter
    const matchesPriority = !priorityFilter || t.priority === priorityFilter
    const matchesCategory = !categoryFilter || t.category === categoryFilter
    const matchesAssignee = !assigneeFilter ||
      (assigneeFilter === 'UNASSIGNED' ? (!t.assignedTo || t.assignedTo === 'UNASSIGNED') : t.assignedTo === assigneeFilter)

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesAssignee
  })

  // Sort Logic
  const sorted = [...filtered].sort((a, b) => {
    let valA = a[sortField]
    let valB = b[sortField]
    if (sortField === 'customer') {
      valA = a.user?.name || a.user?.email || ''
      valB = b.user?.name || b.user?.email || ''
    }
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  // Pagination Logic
  const totalPages = Math.ceil(sorted.length / pageSize) || 1
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const fmt = d => d ? new Date(d).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'

  const hasActiveFilters = search || statusFilter || priorityFilter || categoryFilter || assigneeFilter

  return (
    <div className="main">
      <TopBar
        title="Tickets Queue"
        subtitle="Manage, route, and resolve all incoming support tickets"
        actions={
          <button className="btn btn-ghost" onClick={loadTickets} title="Refresh ticket database">
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} /> Refresh
          </button>
        }
      />

      <div className="page">
        {/* Step 4: Search + Filters Toolbar in One Row */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                className="input"
                placeholder="Search ticket ID, subject, customer..."
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                style={{ paddingLeft: '36px' }}
              />
            </div>

            {/* Filter Dropdowns */}
            <select className="select" style={{ width: '150px' }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
              {STATUS_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>

            <select className="select" style={{ width: '140px' }} value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setCurrentPage(1); }}>
              {PRIORITY_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>

            <select className="select" style={{ width: '145px' }} value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}>
              {CATEGORY_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>

            <select className="select" style={{ width: '155px' }} value={assigneeFilter} onChange={e => { setAssigneeFilter(e.target.value); setCurrentPage(1); }}>
              {ASSIGNEE_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>

            {/* Clear Filters Link */}
            {hasActiveFilters && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleClearFilters}
                style={{ color: 'var(--red)', gap: '4px' }}
              >
                <X size={13} /> Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Tickets Data Table */}
        {loading ? (
          <div className="empty">
            <div className="empty-msg">Loading ticket database...</div>
          </div>
        ) : sorted.length === 0 ? (
          <div className="empty" style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div className="empty-icon" style={{ margin: '0 auto 12px' }}>
              <Inbox size={36} style={{ color: 'var(--text-dim)' }} />
            </div>
            <div className="empty-msg" style={{ fontSize: '15px', color: 'var(--text-main)', marginBottom: '8px' }}>
              No tickets match your filters.
            </div>
            {hasActiveFilters && (
              <button className="btn btn-sm btn-ghost" onClick={handleClearFilters} style={{ margin: '8px auto 0' }}>
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-wrap desktop-only">
              <table className="table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>
                      ID <ArrowUpDown size={12} />
                    </th>
                    <th onClick={() => handleSort('title')} style={{ cursor: 'pointer' }}>
                      Subject <ArrowUpDown size={12} />
                    </th>
                    <th onClick={() => handleSort('customer')} style={{ cursor: 'pointer' }}>
                      Customer <ArrowUpDown size={12} />
                    </th>
                    <th>Category</th>
                    <th onClick={() => handleSort('priority')} style={{ cursor: 'pointer' }}>
                      Priority <ArrowUpDown size={12} />
                    </th>
                    <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                      Status <ArrowUpDown size={12} />
                    </th>
                    <th>Assignee</th>
                    <th onClick={() => handleSort('createdAt')} style={{ cursor: 'pointer' }}>
                      Created <ArrowUpDown size={12} />
                    </th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(t => (
                    <tr
                      key={t.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => { setSelected(t); setAssignTo(t.assignedTo || ''); }}
                    >
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
                      <td style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{fmt(t.createdAt)}</td>
                      <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => { setSelected(t); setAssignTo(t.assignedTo || ''); }}
                        >
                          <MessageSquare size={13} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards View */}
            <div className="mobile-only-cards" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {paginated.map(t => (
                <div
                  key={t.id}
                  onClick={() => { setSelected(t); setAssignTo(t.assignedTo || ''); }}
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
                      <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                        #{t.id} • {t.user?.name || t.user?.email || 'Customer'}
                      </div>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <CategoryBadge category={t.category} />
                      <PriorityBadge priority={t.priority} />
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); setSelected(t); setAssignTo(t.assignedTo || ''); }}>
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12.5px', color: 'var(--text-dim)' }}>
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, sorted.length)} of {sorted.length} tickets
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <span style={{ fontSize: '12px', padding: '4px 10px', color: 'var(--text-main)', fontWeight: 600, alignSelf: 'center' }}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Ticket Detail Modal (2-Column Layout) */}
      {selected && (
        <Modal title={`Ticket #${selected.id} — ${selected.title}`} onClose={() => { setSelected(null); setReplyText(''); }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'flex-start' }}>
            
            {/* Left Column (2/3 width): Conversation Log & Reply */}
            <div>
              {selected.description && (
                <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-main)', marginBottom: '16px' }}>
                  <div className="form-label" style={{ marginBottom: '4px' }}>Customer Issue Description</div>
                  {selected.description}
                </div>
              )}

              <div className="form-label" style={{ marginBottom: '8px' }}>Conversation Log</div>
              {loadingMessages ? (
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '16px' }}>Loading conversation entries...</div>
              ) : messages.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: '16px' }}>No messages recorded yet.</div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  background: 'var(--bg-dark)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px',
                  marginBottom: '16px'
                }}>
                  {messages.map(m => {
                    let sender = 'Customer'
                    if (m.senderType === 'AI') sender = 'AI Helper'
                    else if (m.senderType === 'AGENT') sender = 'Support Agent'
                    else if (selected.user?.name) sender = selected.user.name

                    const isSelf = m.senderType === 'AGENT'

                    return (
                      <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: isSelf ? 'flex-end' : 'flex-start' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '11px', color: 'var(--text-dim)' }}>
                          <span style={{ fontWeight: 700, color: m.senderType === 'AI' ? 'var(--accent-light)' : m.senderType === 'AGENT' ? '#60a5fa' : 'var(--text-main)' }}>
                            {sender}
                          </span>
                          <span>{m.sentAt ? new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                        <div style={{
                          fontSize: '12.5px',
                          color: 'var(--text-main)',
                          whiteSpace: 'pre-wrap',
                          background: isSelf ? 'linear-gradient(135deg, var(--accent), #4f46e5)' : (m.senderType === 'CUSTOMER' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(30, 41, 59, 0.6)'),
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                          maxWidth: '85%'
                        }}>
                          {m.content}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Reply Input Box */}
              {selected.status !== 'CLOSED' && (
                <div>
                  <label className="form-label" style={{ marginBottom: '6px' }}>Dispatch Response to Customer</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      className="input"
                      placeholder="Type official support response..."
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
            </div>

            {/* Right Column (1/3 width): Ticket Side Panel & Controls */}
            <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                Ticket Details
              </h3>

              {/* Status Dropdown */}
              <div>
                <label className="form-label">Status</label>
                <select
                  className="select"
                  value={selected.status}
                  onChange={e => handleStatusChange(e.target.value)}
                  style={{ fontSize: '12.5px' }}
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="PENDING">Waiting for Customer</option>
                  <option value="CLOSED">Resolved / Closed</option>
                </select>
              </div>

              {/* Priority Dropdown */}
              <div>
                <label className="form-label">Priority</label>
                <select
                  className="select"
                  value={selected.priority}
                  onChange={e => handlePriorityChange(e.target.value)}
                  style={{ fontSize: '12.5px' }}
                >
                  <option value="HIGH">Urgent</option>
                  <option value="MEDIUM">Normal</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              {/* Assignee Dropdown */}
              <div>
                <label className="form-label">Assignee</label>
                <select
                  className="select"
                  value={selected.assignedTo || 'UNASSIGNED'}
                  onChange={e => {
                    setAssignTo(e.target.value)
                    handleAssign(e.target.value)
                  }}
                  disabled={assigning}
                  style={{ fontSize: '12.5px' }}
                >
                  <option value="UNASSIGNED">Unassigned</option>
                  <option value="AI">AI Helper</option>
                  <option value="Finance Team">Finance Team</option>
                  <option value="Technical Team">Technical Team</option>
                  <option value="Delivery Team">Delivery Team</option>
                  <option value="Account Team">Account Team</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="form-label">Category</label>
                <CategoryBadge category={selected.category} />
              </div>

              {/* Resolution Handling */}
              <div>
                <label className="form-label">Resolution Mechanism</label>
                <span style={{ fontSize: '12px', fontWeight: 600, color: selected.aiResolved ? 'var(--green)' : 'var(--text-muted)' }}>
                  {selected.aiResolved ? 'Resolved by AI' : 'Escalated to Agent'}
                </span>
              </div>

              {/* Customer */}
              <div>
                <label className="form-label">Customer</label>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', wordBreak: 'break-all' }}>
                  {selected.user?.name ? `${selected.user.name}` : selected.user?.email || '—'}
                </div>
                {selected.user?.email && <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{selected.user.email}</div>}
              </div>

              {/* Created Date */}
              <div>
                <label className="form-label">Created Date</label>
                <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>{fmt(selected.createdAt)}</span>
              </div>

              <div style={{ paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate(`/chat?ticketId=${selected.id}`)}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <MessageSquare size={14} /> Open Live Chat
                </button>
              </div>
            </div>

          </div>
        </Modal>
      )}
    </div>
  )
}
