import React, { useState, useEffect } from 'react'
import { adminApi, ticketApi } from '../services/api'
import { useToast } from '../context/ToastContext'
import TopBar from '../components/TopBar'
import Tooltip from '../components/Tooltip'
import HumanSupportPanel from '../components/HumanSupportPanel'
import { Ticket, Headphones, CheckCircle2, Bot, Activity, RefreshCw, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function AdminDashboardPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError(false)
    try {
      const [dashRes, ticketRes] = await Promise.all([
        adminApi.dashboard(),
        adminApi.allTickets()
      ])
      setStats(dashRes.data)
      setTickets(ticketRes.data || [])
    } catch (err) {
      setError(true)
      toast('Failed to load admin metrics', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="main">
        <TopBar title="Admin Dashboard" subtitle="Overview & support performance KPIs" />
        <div className="page">
          <div className="stats-grid">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="stat-card" style={{ opacity: 0.6 }}>
                <div style={{ height: '14px', width: '80px', background: 'var(--border)', borderRadius: '4px', marginBottom: '12px' }} />
                <div style={{ height: '32px', width: '60px', background: 'var(--border)', borderRadius: '6px' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="main">
        <TopBar title="Admin Dashboard" subtitle="Overview & support performance KPIs" />
        <div className="page">
          <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
            <AlertCircle size={32} style={{ color: 'var(--red)', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Failed to Load Dashboard Data</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              We could not fetch the administrative performance metrics. Please try again.
            </p>
            <button className="btn btn-primary" onClick={loadData}>
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  const s = stats || {}
  const totalTickets = tickets.length || s.totalTickets || 0
  const openCount = tickets.filter(t => t.status === 'OPEN' || t.status === 'PENDING' || t.status === 'IN_PROGRESS').length
  const unassignedCount = tickets.filter(t => !t.assignedTo || t.assignedTo === 'UNASSIGNED' || t.assignedTo === 'AI').length
  const resolvedCount = tickets.filter(t => t.status === 'CLOSED' || t.status === 'RESOLVED').length
  const aiResolvedCount = tickets.filter(t => t.aiResolved).length
  const aiResolutionRate = totalTickets > 0 ? Math.round((aiResolvedCount / totalTickets) * 100) : (s.aiSuccessRate ?? 85)

  // 7-Day Inbound Volume computation
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const dayCounts = [0, 0, 0, 0, 0, 0, 0]
  tickets.forEach(t => {
    if (t.createdAt) {
      const d = new Date(t.createdAt).getDay()
      const idx = d === 0 ? 6 : d - 1
      dayCounts[idx]++
    }
  })
  const maxDayVol = Math.max(...dayCounts, 1)

  return (
    <div className="main">
      <TopBar
        title="Admin Dashboard"
        subtitle="Real-time KPI metrics & support performance console"
        actions={
          <button className="btn btn-ghost" onClick={loadData} title="Refresh metrics">
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      <div className="page">
        {/* Top Row: 4 Stat Cards */}
        <div className="stats-grid">
          {/* 1. Open Tickets */}
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">
                Open Tickets
                <Tooltip text="Total tickets currently open or in queue waiting for resolution." />
              </span>
              <div className="stat-icon" style={{ background: 'var(--blue-bg)', color: '#60a5fa' }}>
                <Ticket size={18} />
              </div>
            </div>
            <div className="stat-value">{openCount}</div>
            <div className="stat-sub">Active support cases</div>
          </div>

          {/* 2. Unassigned */}
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">
                Unassigned
                <Tooltip text="Tickets waiting to be assigned to a human support agent." />
              </span>
              <div className="stat-icon" style={{ background: 'var(--amber-bg)', color: '#fbbf24' }}>
                <Headphones size={18} />
              </div>
            </div>
            <div className="stat-value" style={{ color: '#fbbf24' }}>{unassignedCount}</div>
            <div className="stat-sub">Awaiting agent assignment</div>
          </div>

          {/* 3. Resolved Today / Total Resolved */}
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">
                Resolved Tickets
                <Tooltip text="Total closed or completed support tickets." />
              </span>
              <div className="stat-icon" style={{ background: 'var(--green-bg)', color: '#34d399' }}>
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="stat-value" style={{ color: '#34d399' }}>{resolvedCount}</div>
            <div className="stat-sub">Completed inquiries</div>
          </div>

          {/* 4. AI Resolution Rate */}
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">
                AI Resolution Rate
                <Tooltip text="Percentage of tickets resolved directly by AI without human escalation." />
              </span>
              <div className="stat-icon" style={{ background: 'var(--accent-dim)', color: 'var(--accent-light)' }}>
                <Bot size={18} />
              </div>
            </div>
            <div className="stat-value" style={{ color: 'var(--accent-light)' }}>{aiResolutionRate}%</div>
            <div className="stat-sub">{aiResolvedCount} tickets resolved by AI</div>
          </div>
        </div>

        {/* Middle Section: Needs Attention Panel */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Headphones size={18} style={{ color: '#fbbf24' }} /> Needs Attention (Human Escalation Queue)
          </h2>
          <HumanSupportPanel
            onSelectTicket={id => navigate(`/admin/tickets?ticketId=${id}`)}
          />
        </div>

        {/* Bottom Row: Inbound Ticket Volume Chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Activity size={18} style={{ color: 'var(--accent-light)' }} />
            <h2 style={{ fontSize: '15px', fontWeight: 700 }}>Inbound Ticket Volume (Last 7 Days)</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '110px' }}>
            {dayCounts.map((v, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{v}</span>
                <div
                  style={{
                    width: '100%',
                    height: `${Math.max(Math.round((v / maxDayVol) * 85), 6)}px`,
                    background: 'linear-gradient(to top, var(--accent), var(--accent-light))',
                    borderRadius: '4px 4px 0 0',
                    opacity: 0.9,
                    transition: 'height 0.5s ease'
                  }}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
            {days.map(d => (
              <div key={d} style={{ flex: 1, textAlign: 'center', fontSize: '11.5px', color: 'var(--text-dim)', fontWeight: 600 }}>{d}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
