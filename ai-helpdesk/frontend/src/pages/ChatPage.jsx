import React, { useState, useRef, useEffect } from 'react'
import { Bot, Send, Plus, Loader2, Key, Package, Headphones, User, AlertTriangle, Sparkles, CheckCircle2, UserCheck, MessageSquare } from 'lucide-react'
import { chatApi, ticketApi, adminApi } from '../services/api'
import { useToast } from '../context/ToastContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/Badges'
import { useAuth } from '../context/AuthContext'
import TopBar from '../components/TopBar'

const CHAT_SUGGESTIONS = [
  { icon: Package, label: 'Where is my order?', msg: 'Where is my order?' },
  { icon: Key, label: "I can't log in", msg: "I can't log in to my account." },
  { icon: Headphones, label: 'Talk to a human', isHumanTrigger: true }
]

const INITIAL_AI_MSG = "Hi! I'm your AI helper. Ask me anything about your orders, account, or login. If I can't solve it, I'll pass it to our team."

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ChatPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const urlTicketId = searchParams.get('ticketId')

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTicketId, setActiveTicketId] = useState(null)
  const [ticketDetails, setTicketDetails] = useState(null)

  // Customer Human Support Selection States
  const [showAgentModal, setShowAgentModal] = useState(false)
  const [availableAgents, setAvailableAgents] = useState([])
  const [selectedAgentId, setSelectedAgentId] = useState(null)
  const [loadingAgents, setLoadingAgents] = useState(false)
  const [assigningAgent, setAssigningAgent] = useState(false)
  const [agentsError, setAgentsError] = useState(null)

  const endRef = useRef(null)
  const inputRef = useRef(null)

  const isClosed = ticketDetails?.status === 'CLOSED'
  const isCustomer = user?.role === 'CUSTOMER'
  const isAdminOrAgent = user?.role === 'ADMIN' || user?.role === 'AGENT'
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN' || user?.role?.toUpperCase() === 'ADMIN'

  const [closingTicket, setClosingTicket] = useState(false)

  const handleCloseTicket = async () => {
    if (!activeTicketId || closingTicket) return
    setClosingTicket(true)
    try {
      await adminApi.closeTicket(activeTicketId)
      toast(`Request #${activeTicketId} marked as solved`, 'success')
      const [updatedTicketRes, updatedMessagesRes] = await Promise.all([
        ticketApi.getOne(activeTicketId),
        ticketApi.getMessages(activeTicketId)
      ])
      setTicketDetails(updatedTicketRes.data)
      const formatted = (updatedMessagesRes.data || []).map(m => {
        let senderName = 'Customer'
        if (m.senderType === 'AI') senderName = 'AI Helper'
        else if (m.senderType === 'AGENT') senderName = 'Support Agent'
        else if (updatedTicketRes.data?.user?.name) senderName = updatedTicketRes.data.user.name

        return {
          id: m.id,
          senderType: m.senderType,
          role: m.senderType === 'AI' ? 'ai' : m.senderType === 'AGENT' ? 'agent' : 'user',
          senderName,
          text: m.content,
          time: m.sentAt ? new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : now()
        }
      })
      setMessages(formatted)
    } catch (err) {
      toast('Failed to close request: ' + (err.response?.data?.message || err.message), 'error')
    } finally {
      setClosingTicket(false)
    }
  }

  const loadSupportAgents = () => {
    setLoadingAgents(true)
    setAgentsError(null)
    ticketApi.getSupportAgents()
      .then(res => {
        setAvailableAgents(res.data || [])
      })
      .catch(() => {
        setAgentsError("Unable to load support team. Please try again.")
      })
      .finally(() => {
        setLoadingAgents(false)
      })
  }

  const handleOpenSupportModal = async () => {
    let tId = activeTicketId
    if (!tId) {
      tId = await ensureTicket("Requesting human support connection")
    }
    if (tId) {
      ticketApi.escalate(tId).catch(() => {})
    }
    setShowAgentModal(true)
    loadSupportAgents()
  }

  const handleConfirmAgentSelection = async () => {
    if (!selectedAgentId || !activeTicketId || assigningAgent) return
    setAssigningAgent(true)
    setAgentsError(null)
    try {
      const { data: updatedTicket } = await ticketApi.assignAgent(activeTicketId, selectedAgentId)
      setTicketDetails(updatedTicket)
      setShowAgentModal(false)
      toast(`Connected to support agent (${updatedTicket.assignedTo})!`, 'success')

      const res = await ticketApi.getMessages(activeTicketId)
      const formatted = (res.data || []).map(m => {
        let senderName = 'Customer'
        if (m.senderType === 'AI') senderName = 'AI Helper'
        else if (m.senderType === 'AGENT') senderName = updatedTicket.assignedTo || 'Support Agent'
        else if (updatedTicket.user?.name) senderName = updatedTicket.user.name

        return {
          id: m.id,
          senderType: m.senderType,
          role: m.senderType === 'AI' ? 'ai' : m.senderType === 'AGENT' ? 'agent' : 'user',
          senderName,
          text: m.content,
          time: m.sentAt ? new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : now()
        }
      })
      setMessages(formatted)
    } catch (err) {
      const msg = err.response?.data?.message || "Could not connect to support agent. Please try again."
      toast(msg, 'error')
      setAgentsError(msg)
    } finally {
      setAssigningAgent(false)
    }
  }

  const [activeChats, setActiveChats] = useState([])

  useEffect(() => {
    if (isCustomer && !urlTicketId) {
      ticketApi.myList()
        .then(res => {
          const active = res.data.find(t => t.status !== 'CLOSED')
          if (active) {
            navigate(`/chat?ticketId=${active.id}`, { replace: true })
          }
        })
        .catch(() => {})
    }
  }, [urlTicketId, isCustomer, navigate])

  const loadActiveChats = () => {
    if (isAdminOrAgent) {
      ticketApi.allTickets()
        .then(res => {
          const active = res.data.filter(t => t.status !== 'CLOSED')
          setActiveChats(active)
        })
        .catch(() => {})
    }
  }

  useEffect(() => {
    loadActiveChats()
    if (urlTicketId) {
      const ticketId = parseInt(urlTicketId, 10)
      if (!isNaN(ticketId)) {
        setActiveTicketId(ticketId)
        setLoading(true)

        Promise.all([
          ticketApi.getOne(ticketId),
          ticketApi.getMessages(ticketId)
        ])
          .then(([ticketRes, messagesRes]) => {
            const tDetails = ticketRes.data
            setTicketDetails(tDetails)

            const formatted = (messagesRes.data || []).map(m => {
              let senderName = 'Customer'
              if (m.senderType === 'AI') senderName = 'AI Helper'
              else if (m.senderType === 'AGENT') senderName = 'Support Agent'
              else if (tDetails?.user?.name) senderName = tDetails.user.name

              return {
                id: m.id,
                senderType: m.senderType,
                role: m.senderType === 'AI' ? 'ai' : m.senderType === 'AGENT' ? 'agent' : 'user',
                senderName,
                text: m.content,
                time: m.sentAt ? new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : now()
              }
            })

            setMessages(formatted.length > 0 ? formatted : (tDetails.description ? [{
              role: 'user',
              senderName: tDetails.user?.name || 'Customer',
              text: tDetails.description,
              time: tDetails.createdAt ? new Date(tDetails.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : now()
            }] : [
              { role: 'ai', senderName: 'AI Helper', text: INITIAL_AI_MSG, time: now() }
            ]))
          })
          .catch(() => {
            toast('Failed to load chat history', 'error')
          })
          .finally(() => {
            setLoading(false)
          })
      }
    } else {
      setActiveTicketId(null)
      setTicketDetails(null)
      setMessages([
        { role: 'ai', senderName: 'AI Helper', text: INITIAL_AI_MSG, time: now() }
      ])
    }
  }, [urlTicketId, user])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!activeTicketId) return

    const poll = () => {
      ticketApi.getMessages(activeTicketId)
        .then(res => {
          const formatted = res.data.map(m => {
            let senderName = 'Customer'
            if (m.senderType === 'AI') senderName = 'AI Helper'
            else if (m.senderType === 'AGENT') senderName = 'Support Agent'
            else if (ticketDetails?.user?.name) senderName = ticketDetails.user.name

            return {
              id: m.id,
              senderType: m.senderType,
              role: m.senderType === 'AI' ? 'ai' : m.senderType === 'AGENT' ? 'agent' : 'user',
              senderName,
              text: m.content,
              time: m.sentAt ? new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : now()
            }
          })

          setMessages(prev => {
            if (prev.length === formatted.length && prev[prev.length - 1]?.text === formatted[formatted.length - 1]?.text) {
              return prev
            }
            return formatted
          })
        })
        .catch(() => {})

      ticketApi.getOne(activeTicketId)
        .then(res => {
          setTicketDetails(prev => {
            if (prev?.status !== res.data.status || prev?.assignedTo !== res.data.assignedTo) {
              return res.data
            }
            return prev
          })
        })
        .catch(() => {})
    }

    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [activeTicketId, ticketDetails?.user?.name])

  const ensureTicket = async (firstMessageText) => {
    if (activeTicketId) return activeTicketId

    try {
      const titleSnippet = firstMessageText.length > 30 ? firstMessageText.substring(0, 30) + '...' : firstMessageText
      const { data: newTicket } = await ticketApi.create({
        title: titleSnippet,
        description: firstMessageText,
        category: 'TECHNICAL'
      })

      setActiveTicketId(newTicket.id)
      setTicketDetails(newTicket)
      navigate(`/chat?ticketId=${newTicket.id}`, { replace: true })
      return newTicket.id
    } catch (err) {
      toast('Failed to initialize request', 'error')
      return null
    }
  }

  const handleSend = async (textToSend = input) => {
    const text = textToSend.trim()
    if (!text || loading || isClosed) return

    setInput('')
    setLoading(true)

    const userMsg = {
      senderType: isAdminOrAgent ? 'AGENT' : 'CUSTOMER',
      role: isAdminOrAgent ? 'agent' : 'user',
      senderName: user?.name || (isAdminOrAgent ? 'Support Agent' : 'Customer'),
      text,
      time: now()
    }
    setMessages(prev => [...prev, userMsg])

    try {
      if (!activeTicketId) {
        // Ticketless AI Chat flow (no ticket required)
        const res = await chatApi.direct(text)
        const replyText = res.data?.reply || "Sorry, I couldn't answer that right now. Please try again or report a problem to our team."
        const aiMsg = {
          role: 'ai',
          senderType: 'AI',
          senderName: 'AI Helper',
          text: replyText,
          time: now()
        }
        setMessages(prev => [...prev, aiMsg])
      } else {
        // Chat flow for existing ticket
        if (isAdminOrAgent) {
          await adminApi.replyTicket(activeTicketId, { message: text })
        } else {
          await chatApi.send(activeTicketId, text)
        }

        const [updatedTicketRes, updatedMessagesRes] = await Promise.all([
          ticketApi.getOne(activeTicketId),
          ticketApi.getMessages(activeTicketId)
        ])

        setTicketDetails(updatedTicketRes.data)

        const formatted = (updatedMessagesRes.data || []).map(m => {
          let senderName = 'Customer'
          if (m.senderType === 'AI') senderName = 'AI Helper'
          else if (m.senderType === 'AGENT') senderName = 'Support Agent'
          else if (updatedTicketRes.data?.user?.name) senderName = updatedTicketRes.data.user.name

          return {
            id: m.id,
            senderType: m.senderType,
            role: m.senderType === 'AI' ? 'ai' : m.senderType === 'AGENT' ? 'agent' : 'user',
            senderName,
            text: m.content,
            time: m.sentAt ? new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : now()
          }
        })

        setMessages(formatted)
      }
    } catch (err) {
      toast('Failed to deliver message', 'error')
      setMessages(prev => [
        ...prev,
        {
          role: 'ai',
          senderType: 'AI',
          senderName: 'AI Helper',
          text: "Sorry, I couldn't answer that right now. Please try again or report a problem to our team.",
          time: now()
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const [viewportHeight, setViewportHeight] = useState(null)

  useEffect(() => {
    if (!window.visualViewport) return
    const handleResize = () => {
      setViewportHeight(window.visualViewport.height)
    }
    window.visualViewport.addEventListener('resize', handleResize)
    return () => window.visualViewport.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="main">
      <TopBar
        title={activeTicketId ? `Request #${activeTicketId} — Live Chat` : 'Chat with AI'}
        subtitle={ticketDetails?.title ? `Subject: ${ticketDetails.title}` : 'Instant answers & 24/7 support'}
        actions={
          isCustomer && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setActiveTicketId(null)
                setTicketDetails(null)
                navigate('/chat', { replace: true })
              }}
            >
              <Plus size={15} /> Start New Chat
            </button>
          )
        }
      />

      <div
        className="page"
        style={{
          padding: 0,
          height: viewportHeight ? `${viewportHeight - 120}px` : 'calc(100dvh - 124px)'
        }}
      >
        <div className="chat-wrap" style={{ height: '100%' }}>
          {/* Main Conversation Box */}
          <div className="chat-main">
            {/* Header bar */}
            <div className="chat-header-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {ticketDetails?.assignedTo !== 'AI' && ticketDetails?.assignedTo !== 'UNASSIGNED' && ticketDetails?.assignedTo ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#60a5fa' }}>
                    <Headphones size={16} /> Connected with Support Agent ({ticketDetails.assignedTo})
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--accent-light)' }}>
                    <div className="ai-dot" /> AI Helper Online
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {isCustomer && !isClosed && (
                  <button
                    className="btn btn-sm"
                    style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', color: '#fbbf24', fontWeight: 600 }}
                    onClick={handleOpenSupportModal}
                    title="Talk to a human"
                  >
                    <Headphones size={13} /> Talk to a human
                  </button>
                )}
                {isAdmin && ticketDetails && !isClosed && (
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={handleCloseTicket}
                    disabled={closingTicket}
                    title="Close Request"
                  >
                    <CheckCircle2 size={13} /> {closingTicket ? 'Closing...' : 'Mark Solved'}
                  </button>
                )}
                {ticketDetails && (
                  <>
                    <PriorityBadge priority={ticketDetails.priority} />
                    <StatusBadge status={ticketDetails.status} />
                  </>
                )}
              </div>
            </div>

            {/* Escalation alert banner */}
            {ticketDetails?.status === 'PENDING' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', background: 'var(--amber-bg)', borderBottom: '1px solid var(--amber-border)', fontSize: '12.5px', color: '#fbbf24' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} />
                  <span>Waiting for human support agent connection</span>
                </div>
                <button
                  className="btn btn-sm"
                  style={{ background: '#fbbf24', color: '#0f172a', fontWeight: 700 }}
                  onClick={handleOpenSupportModal}
                >
                  <Headphones size={13} /> Choose Support Agent
                </button>
              </div>
            )}

            {/* Message Area */}
            <div className="messages-area">
              {messages.map((m, i) => {
                const isCurrentAdminOrAgent = user?.role === 'ADMIN' || user?.role === 'AGENT'
                const isSelf = isCurrentAdminOrAgent
                  ? (m.senderType === 'AGENT' || m.role === 'agent')
                  : (m.senderType === 'CUSTOMER' || m.senderType === 'USER' || m.role === 'user')

                const alignClass = isSelf ? 'self' : 'other'
                const typeClass = (m.senderType === 'AI' || m.role === 'ai')
                  ? 'ai'
                  : ((m.senderType === 'AGENT' || m.role === 'agent') ? 'agent' : 'user')

                const isFallbackOrEscalated = typeClass === 'ai' && (
                  m.text?.includes("couldn't answer") ||
                  m.text?.includes("report a problem") ||
                  m.text?.includes("routing the ticket") ||
                  m.text?.includes("escalated") ||
                  m.text?.includes("human support")
                )

                return (
                  <div key={m.id || i} className={`msg ${alignClass} ${typeClass}`}>
                    <div className="msg-sender">
                      {typeClass === 'ai' ? <Bot size={14} style={{ color: 'var(--accent-light)' }} /> : typeClass === 'agent' ? <Headphones size={14} style={{ color: '#60a5fa' }} /> : <User size={14} />}
                      <span>{m.senderName}</span>
                    </div>
                    <div className="msg-bubble">
                      <div>{m.text}</div>
                      {isFallbackOrEscalated && isCustomer && !isClosed && (
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                          <button
                            className="btn btn-sm"
                            style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', color: '#fbbf24', fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            onClick={handleOpenSupportModal}
                          >
                            <Headphones size={13} /> Report a Problem / Talk to Human
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="msg-time">{m.time}</div>
                  </div>
                )
              })}

              {loading && (
                <div className="msg ai">
                  <div className="msg-sender"><Bot size={14} /> AI Helper</div>
                  <div className="typing-dots">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* 3 Clickable Suggestion Chips */}
            {!isClosed && (
              <div style={{ padding: '10px 20px', display: 'flex', gap: '10px', overflowX: 'auto', background: 'rgba(15, 23, 42, 0.4)', borderTop: '1px solid var(--border)' }}>
                {CHAT_SUGGESTIONS.map((s, idx) => {
                  const Icon = s.icon
                  return (
                    <button
                      key={idx}
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        if (s.isHumanTrigger) {
                          handleOpenSupportModal()
                        } else {
                          handleSend(s.msg)
                        }
                      }}
                      style={{
                        border: '1px solid var(--border)',
                        background: s.isHumanTrigger ? 'var(--amber-bg)' : 'var(--bg-card)',
                        color: s.isHumanTrigger ? '#fbbf24' : 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        fontWeight: 500
                      }}
                    >
                      <Icon size={14} style={{ color: s.isHumanTrigger ? '#fbbf24' : 'var(--accent-light)' }} /> {s.label}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Chat Input Bar */}
            {!isClosed ? (
              <form
                className="chat-input-row"
                onSubmit={e => {
                  e.preventDefault()
                  handleSend()
                }}
              >
                <textarea
                  ref={inputRef}
                  className="input chat-input"
                  placeholder="Ask a question or describe your problem..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  rows={1}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !input.trim()}
                  title="Send message"
                  aria-label="Send message"
                >
                  {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                </button>
              </form>
            ) : (
              <div style={{ padding: '16px', textAlign: 'center', background: 'var(--bg-input)', borderTop: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <CheckCircle2 size={15} style={{ color: 'var(--green)' }} /> This request has been marked as solved and closed.
              </div>
            )}
          </div>

          {/* Right Sidebar Details */}
          <div className="chat-sidebar-panel">
            {ticketDetails ? (
              <div className="card">
                <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '14px' }}>Request Details</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12.5px' }}>
                  <div>
                    <div className="form-label">Request ID</div>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-light)', fontWeight: 600 }}>#{ticketDetails.id}</span>
                  </div>
                  <div>
                    <div className="form-label">Category</div>
                    <CategoryBadge category={ticketDetails.category} />
                  </div>
                  <div>
                    <div className="form-label">Customer</div>
                    <span style={{ color: 'var(--text-main)' }}>{ticketDetails.user?.name || ticketDetails.user?.email || 'Customer'}</span>
                  </div>
                  <div>
                    <div className="form-label">Handled By</div>
                    <span style={{ fontWeight: 600 }}>{ticketDetails.assignedTo || 'AI Helper'}</span>
                  </div>
                  <div>
                    <div className="form-label">Solved by AI</div>
                    <span style={{ color: ticketDetails.aiResolved ? 'var(--green)' : 'var(--text-dim)' }}>
                      {ticketDetails.aiResolved ? 'Yes (Solved by AI)' : 'Assigned to Support Agent'}
                    </span>
                  </div>
                  {isCustomer && !isClosed && (
                    <button
                      className="btn btn-sm"
                      style={{ marginTop: '10px', width: '100%', background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', color: '#fbbf24', fontWeight: 600, justifyContent: 'center' }}
                      onClick={handleOpenSupportModal}
                    >
                      <Headphones size={14} /> Talk to a human
                    </button>
                  )}
                  {isAdmin && !isClosed && (
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ marginTop: '10px', width: '100%', justifyContent: 'center' }}
                      onClick={handleCloseTicket}
                      disabled={closingTicket}
                    >
                      <CheckCircle2 size={14} /> {closingTicket ? 'Closing...' : 'Mark Solved'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Sparkles size={16} style={{ color: 'var(--accent-light)' }} />
                  <h3 style={{ fontSize: '14px', fontWeight: 700 }}>Chat Help</h3>
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>• AI answers common questions instantly 24/7.</div>
                  <div>• Need more help? Click "Talk to a human" anytime.</div>
                  <div>• All your chat history is saved in My Requests.</div>
                </div>
              </div>
            )}

            {/* Active Tickets List for Admins/Agents */}
            {isAdminOrAgent && activeChats.length > 0 && (
              <div className="card">
                <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Active Support Queue</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                  {activeChats.map(ac => (
                    <div
                      key={ac.id}
                      onClick={() => navigate(`/chat?ticketId=${ac.id}`)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: ac.id === activeTicketId ? 'var(--accent-dim)' : 'var(--bg-input)',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        #{ac.id} — {ac.title}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                        <span>{ac.user?.name?.split(' ')[0] || 'User'}</span>
                        <StatusBadge status={ac.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Human Support Selection Modal */}
      {showAgentModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-input)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Headphones size={20} style={{ color: 'var(--accent-light)' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  Connect with Support Agent
                </h3>
              </div>
              <button
                onClick={() => setShowAgentModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px'
                }}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', maxHeight: '350px', overflowY: 'auto' }}>
              {loadingAgents ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Loading support agents...</span>
                </div>
              ) : agentsError ? (
                <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--red-border)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} /> {agentsError}
                </div>
              ) : availableAgents.length === 0 ? (
                <div style={{ padding: '20px', background: 'var(--bg-input)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                    No support agents available right now. Please try again in a few moments.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {availableAgents.map(ag => (
                    <label
                      key={ag.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: selectedAgentId === ag.id ? 'var(--accent-dim)' : 'var(--bg-input)',
                        border: `1px solid ${selectedAgentId === ag.id ? 'var(--accent)' : 'var(--border)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="radio"
                          name="modalAgentChoice"
                          checked={selectedAgentId === ag.id}
                          onChange={() => setSelectedAgentId(ag.id)}
                          style={{ accentColor: 'var(--accent)', cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>{ag.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                            {ag.role === 'ADMIN' ? 'Administrator' : 'Support Specialist'} ({ag.email})
                          </div>
                        </div>
                      </div>
                      <span className="badge badge-low" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <UserCheck size={12} /> Active
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-input)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px'
            }}>
              <button
                className="btn btn-ghost"
                onClick={() => setShowAgentModal(false)}
                disabled={assigningAgent}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmAgentSelection}
                disabled={!selectedAgentId || assigningAgent}
              >
                {assigningAgent ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <UserCheck size={16} />
                    <span>Connect with Support Agent</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
