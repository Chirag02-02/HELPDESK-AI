import React, { useState, useEffect } from 'react'
import { adminApi } from '../services/api'
import { useToast } from '../context/ToastContext'
import TopBar from '../components/TopBar'
import { BarChart3, Bot, Headphones, AlertTriangle, Activity, PieChart, TrendingUp, Layers } from 'lucide-react'

export default function AdminDashboardPage() {
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.dashboard()
      .then(r => setStats(r.data))
      .catch(() => toast('Failed to load dashboard metrics', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const CATS = [
    { label: 'Billing', pct: 40, color: '#3b82f6' },
    { label: 'Account', pct: 25, color: '#a855f7' },
    { label: 'Technical', pct: 20, color: '#10b981' },
    { label: 'Order', pct: 10, color: '#f59e0b' },
    { label: 'Other', pct: 5, color: '#64748b' },
  ]
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const VOLS = [28, 35, 42, 30, 51, 22, 39]
  const MAX_VOL = 51

  if (loading) return (
    <div className="main">
      <TopBar title="Analytics & Management Dashboard" subtitle="Real-time KPI metrics & support volume tracking" />
      <div className="page">
        <div className="empty">
          <div className="empty-msg">Fetching administrative metrics...</div>
        </div>
      </div>
    </div>
  )

  const s = stats || {}
  const aiRate = s.aiSuccessRate ?? 82
  const humanRate = s.humanRequired ?? 18
  const humanEscalatedCount = (s.totalTickets || 0) - (s.aiResolved || 0)

  return (
    <div className="main">
      <TopBar title="Analytics & System Dashboard" subtitle="Enterprise HelpDesk automated metrics & agent queue overview" />
      
      <div className="page">
        {/* KPI Metrics */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Total Inquiries</span>
              <div className="stat-icon" style={{ background: 'var(--blue-bg)', color: '#60a5fa' }}>
                <Layers size={18} />
              </div>
            </div>
            <div className="stat-value">{s.totalTickets ?? 0}</div>
            <div className="stat-sub">Lifetime support tickets</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">AI RAG Resolved</span>
              <div className="stat-icon" style={{ background: 'var(--green-bg)', color: '#34d399' }}>
                <Bot size={18} />
              </div>
            </div>
            <div className="stat-value" style={{ color: '#34d399' }}>{s.aiResolved ?? 0}</div>
            <div className="stat-sub">{aiRate}% zero-touch resolution</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Human Agent Queue</span>
              <div className="stat-icon" style={{ background: 'var(--amber-bg)', color: '#fbbf24' }}>
                <Headphones size={18} />
              </div>
            </div>
            <div className="stat-value" style={{ color: '#fbbf24' }}>{humanEscalatedCount < 0 ? 0 : humanEscalatedCount}</div>
            <div className="stat-sub">{humanRate}% escalated to staff</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">High Priority Open</span>
              <div className="stat-icon" style={{ background: 'var(--red-bg)', color: '#f87171' }}>
                <AlertTriangle size={18} />
              </div>
            </div>
            <div className="stat-value" style={{ color: '#f87171' }}>{s.openTickets ?? 0}</div>
            <div className="stat-sub">{s.highPriority || 0} urgent attention cases</div>
          </div>
        </div>

        {/* Charts & Distribution */}
        <div className="two-col" style={{ marginBottom: '20px' }}>
          {/* Category Breakdown */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <PieChart size={18} style={{ color: 'var(--accent-light)' }} />
              <h2 style={{ fontSize: '15px', fontWeight: 700 }}>Ticket Volume by Category</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {CATS.map(c => (
                <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '85px', fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 600 }}>{c.label}</div>
                  <div style={{ flex: 1, height: '22px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${c.pct}%`,
                        height: '100%',
                        background: c.color,
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: '10px',
                        fontSize: '11px',
                        color: '#ffffff',
                        fontWeight: 700,
                        transition: 'width 0.6s ease'
                      }}
                    >
                      {c.pct}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resolution Split */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <TrendingUp size={18} style={{ color: 'var(--green)' }} />
              <h2 style={{ fontSize: '15px', fontWeight: 700 }}>Resolution Mechanism Distribution</h2>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-light)' }}>{aiRate}%</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Automated RAG</div>
              </div>
              <div style={{ width: '1px', height: '40px', background: 'var(--border)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#fbbf24' }}>{humanRate}%</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Support Agent</div>
              </div>
            </div>
            <div style={{ height: '14px', borderRadius: '7px', background: 'var(--bg-input)', display: 'flex', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ width: `${aiRate}%`, background: 'var(--accent)' }} />
              <div style={{ width: `${humanRate}%`, background: '#f59e0b' }} />
            </div>

            <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-muted)' }}>Department Escalation Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                ['Billing & Financials Queue', 23],
                ['Technical Operations Queue', 15],
                ['Logistics & Delivery Queue', 6]
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-main)' }}>{k}</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-light)', fontFamily: 'var(--font-mono)' }}>{v} tickets</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 7-Day Ticket Volume Bar Chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Activity size={18} style={{ color: 'var(--accent-light)' }} />
            <h2 style={{ fontSize: '15px', fontWeight: 700 }}>Daily Inbound Ticket Volume (Last 7 Days)</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '110px' }}>
            {VOLS.map((v, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{v}</span>
                <div
                  style={{
                    width: '100%',
                    height: `${Math.round((v / MAX_VOL) * 85)}px`,
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
            {DAYS.map(d => (
              <div key={d} style={{ flex: 1, textAlign: 'center', fontSize: '11.5px', color: 'var(--text-dim)', fontWeight: 600 }}>{d}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
