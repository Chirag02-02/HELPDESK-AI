import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, User, Mail, Lock, ShieldAlert, UserPlus, ArrowRight } from 'lucide-react'
import { authApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import AppLogo from '../components/AppLogo'

export default function RegisterPage() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'CUSTOMER', adminCode: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))
  const isPrivileged = form.role === 'ADMIN' || form.role === 'AGENT'

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const { data } = await authApi.register(form)
      login({ name: data.name, email: data.email, role: data.role }, data.token)
      toast(`Account created successfully! Welcome, ${data.name}`, 'success')
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please verify details.')
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

        <h1 className="auth-title">Create New Account</h1>
        <p className="auth-subtitle">Get started with AI-driven customer support</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                className="input"
                placeholder="Arjun Kumar"
                value={form.name}
                onChange={set('name')}
                style={{ paddingLeft: '36px' }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Work Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                className="input"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={set('email')}
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
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={set('password')}
                style={{ paddingLeft: '36px' }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Account Role</label>
            <select className="select" value={form.role} onChange={set('role')}>
              <option value="CUSTOMER">Customer</option>
              <option value="AGENT">Support Agent</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>

          {isPrivileged && (
            <div className="form-group">
              <label className="form-label">Admin Security Registration Code</label>
              <div style={{ position: 'relative' }}>
                <ShieldAlert size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#fbbf24' }} />
                <input
                  className="input"
                  type="password"
                  placeholder="Required for Agent / Admin setup (default: 123)"
                  value={form.adminCode}
                  onChange={set('adminCode')}
                  style={{ paddingLeft: '36px' }}
                  required
                />
              </div>
            </div>
          )}

          {error && <div className="form-error" style={{ marginBottom: '14px' }}>{error}</div>}

          <button className="btn btn-primary" style={{ width: '100%', padding: '11px', fontSize: '14px' }} disabled={loading}>
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={16} />}
            {loading ? 'Creating Account...' : 'Register Account'}
          </button>
        </form>

        <div className="auth-divider">Already registered?</div>
        <div style={{ textAlign: 'center' }}>
          <Link to="/login" className="auth-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            Sign in to existing account <ArrowRight size={14} />
          </Link>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

