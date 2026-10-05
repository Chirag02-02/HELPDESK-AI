import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, User, Mail, Lock, ShieldAlert, UserPlus, Eye, EyeOff } from 'lucide-react'
import { authApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import AppLogo from '../components/AppLogo'

export default function RegisterPage() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'CUSTOMER', adminCode: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [bannerError, setBannerError] = useState('')

  const setField = key => e => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    if (fieldErrors[key]) setFieldErrors(errs => ({ ...errs, [key]: '' }))
    if (bannerError) setBannerError('')
  }

  const isPrivileged = form.role === 'ADMIN' || form.role === 'AGENT'

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) {
      errs.name = "Please enter your name"
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      errs.email = "Please enter a valid email"
    }
    if (!form.password || form.password.length < 8) {
      errs.password = "Password must be at least 8 characters"
    }
    if (isPrivileged && !form.adminCode) {
      errs.adminCode = "Please enter the admin security code"
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
      const { data } = await authApi.register(form)
      login({ name: data.name, email: data.email, role: data.role, profilePhotoUrl: data.profilePhotoUrl }, data.token)
      toast(`Account created successfully! Welcome, ${data.name}`, 'success')
      navigate('/dashboard')
    } catch (err) {
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout') || err.code === 'ERR_NETWORK' || !err.response) {
        setBannerError('Unable to connect to the server. Please try again.')
      } else {
        setBannerError(err.response?.data?.message || 'Registration failed. Please check your information.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo-center">
            <AppLogo size="large" showText={true} />
          </div>
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">It takes less than a minute</p>
        </div>

        {bannerError && (
          <div className="auth-error-banner" role="alert">
            {bannerError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate autoComplete="off">
          {/* Full Name */}
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="reg-name">Full name</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                id="reg-name"
                className="auth-input"
                placeholder="e.g. Arjun Kumar"
                value={form.name}
                onChange={setField('name')}
                autoFocus
                autoComplete="off"
                required
              />
            </div>
            {fieldErrors.name && <div className="auth-field-error">{fieldErrors.name}</div>}
          </div>

          {/* Email */}
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="reg-email">Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                id="reg-email"
                className="auth-input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={setField('email')}
                autoComplete="off"
                required
              />
            </div>
            {fieldErrors.email && <div className="auth-field-error">{fieldErrors.email}</div>}
          </div>

          {/* Password */}
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="reg-password">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                id="reg-password"
                className="auth-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password (min. 8 characters)"
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

          {/* Account Role */}
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="reg-role">Account type</label>
            <select
              id="reg-role"
              className="select"
              value={form.role}
              onChange={setField('role')}
              style={{ height: '48px', fontSize: '16px', borderRadius: '12px' }}
            >
              <option value="CUSTOMER">Customer Account</option>
              <option value="AGENT">Support Agent Account</option>
              <option value="ADMIN">Administrator Account</option>
            </select>
          </div>

          {/* Admin Security Code (If Privileged) */}
          {isPrivileged && (
            <div className="auth-form-group">
              <label className="auth-label" htmlFor="reg-admin-code">Admin Security Registration Code</label>
              <div style={{ position: 'relative' }}>
                <ShieldAlert size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#fbbf24' }} />
                <input
                  id="reg-admin-code"
                  className="auth-input"
                  type="password"
                  placeholder="Required for Agent / Admin setup (default: 123)"
                  value={form.adminCode}
                  onChange={setField('adminCode')}
                  required
                />
              </div>
              {fieldErrors.adminCode && <div className="auth-field-error">{fieldErrors.adminCode}</div>}
            </div>
          )}

          <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
            {loading ? <Loader2 size={18} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={18} />}
            <span>{loading ? 'Creating account...' : 'Create account'}</span>
          </button>
        </form>

        <div className="auth-footer-text">
          Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
