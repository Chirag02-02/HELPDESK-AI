import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Lock, Mail, LogIn, Eye, EyeOff, User, ShieldCheck } from 'lucide-react'
import { authApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import AppLogo from '../components/AppLogo'

export default function LoginPage() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [bannerError, setBannerError] = useState('')

  const showDemo = import.meta.env.VITE_SHOW_DEMO !== 'false'

  const setField = key => e => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    if (fieldErrors[key]) setFieldErrors(errs => ({ ...errs, [key]: '' }))
    if (bannerError) setBannerError('')
  }

  const validate = () => {
    const errs = {}
    if (!form.email.trim() || !form.email.includes('@')) {
      errs.email = "Please enter a valid email"
    }
    if (!form.password) {
      errs.password = "Please enter your password"
    }
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setBannerError('')
    if (!validate()) return

    setLoading(true)
    try {
      const { data } = await authApi.login(form)
      login({ name: data.name, email: data.email, role: data.role, profilePhotoUrl: data.profilePhotoUrl }, data.token)
      toast(`Welcome back, ${data.name}!`, 'success')
      navigate('/dashboard')
    } catch (err) {
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout') || err.code === 'ERR_NETWORK' || !err.response) {
        setBannerError('Unable to connect to the server. Please try again.')
      } else {
        setBannerError('Incorrect email or password. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFillDemo = (email, password) => {
    setForm({ email, password })
    setFieldErrors({})
    setBannerError('')
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo-center">
            <AppLogo size="large" showText={true} />
          </div>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to get help with your orders and account</p>
        </div>

        {bannerError && (
          <div className="auth-error-banner" role="alert">
            {bannerError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate autoComplete="off">
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="login-email">Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                id="login-email"
                className="auth-input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={setField('email')}
                autoFocus
                autoComplete="off"
                required
              />
            </div>
            {fieldErrors.email && <div className="auth-field-error">{fieldErrors.email}</div>}
          </div>

          <div className="auth-form-group">
            <label className="auth-label" htmlFor="login-password">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                id="login-password"
                className="auth-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={form.password}
                onChange={setField('password')}
                autoComplete="new-password"
                style={{ paddingRight: '46px' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: 'absolute',
                  right: '4px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px'
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && <div className="auth-field-error">{fieldErrors.password}</div>}
          </div>

          <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
            {loading ? <Loader2 size={18} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} /> : <LogIn size={18} />}
            <span>{loading ? 'Signing in...' : 'Sign in'}</span>
          </button>
        </form>

        <div className="auth-footer-text">
          New here? <Link to="/register" className="auth-link">Create an account</Link>
        </div>

        {showDemo && (
          <div className="auth-demo-section">
            <div className="auth-demo-title">Try a demo account</div>
            <div className="auth-demo-grid">
              <button
                type="button"
                className="auth-demo-btn"
                onClick={() => handleFillDemo('customer@demo.com', 'password123')}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <User size={14} style={{ color: '#60a5fa' }} />
                <span>Demo customer</span>
              </button>
              <button
                type="button"
                className="auth-demo-btn"
                onClick={() => handleFillDemo('admin@demo.com', 'password123')}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <ShieldCheck size={14} style={{ color: '#818cf8' }} />
                <span>Demo admin</span>
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
