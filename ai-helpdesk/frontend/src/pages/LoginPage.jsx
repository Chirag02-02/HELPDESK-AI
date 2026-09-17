import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Lock, Mail, LogIn, ArrowRight } from 'lucide-react'
import { authApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import AppLogo from '../components/AppLogo'

export default function LoginPage() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await authApi.login(form)
      login({ name: data.name, email: data.email, role: data.role }, data.token)
      toast(`Welcome back, ${data.name}!`, 'success')
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <AppLogo size="large" showText={true} />
        </div>
        
        <h1 className="auth-title">Sign In to Workspace</h1>
        <p className="auth-subtitle">Enterprise AI Customer Support & RAG Management Portal</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Work Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                className="input"
                type="email"
                placeholder="name@company.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                style={{ paddingLeft: '36px' }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                style={{ paddingLeft: '36px' }}
                required
              />
            </div>
          </div>

          {error && <div className="form-error" style={{ marginBottom: '14px', textAlign: 'center' }}>{error}</div>}

          <button className="btn btn-primary" style={{ width: '100%', padding: '11px', fontSize: '14px' }} disabled={loading}>
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <LogIn size={16} />}
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>

        <div className="auth-divider">Don't have an account yet?</div>
        <div style={{ textAlign: 'center' }}>
          <Link to="/register" className="auth-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            Create a new account <ArrowRight size={14} />
          </Link>
        </div>

        <div style={{ marginTop: '24px', padding: '14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>Demo Accounts</div>
          <div>Customer: <code style={{ color: 'var(--accent-light)' }}>customer@demo.com</code> / password123</div>
          <div>Admin: <code style={{ color: '#818cf8' }}>admin@demo.com</code> / password123</div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

