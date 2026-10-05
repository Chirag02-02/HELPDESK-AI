import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, LifeBuoy, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react'
import Modal from './Modal'
import { ticketApi } from '../services/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

const CATEGORY_OPTIONS = [
  { value: 'TECHNICAL', label: 'Technical issue' },
  { value: 'ORDER', label: 'Order question' },
  { value: 'BILLING', label: 'Billing question' },
  { value: 'ACCOUNT', label: 'Account issue' },
  { value: 'REFUND', label: 'Refund request' },
  { value: 'OTHER', label: 'Other' }
]

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Not urgent' },
  { value: 'MEDIUM', label: 'Normal' },
  { value: 'HIGH', label: 'Urgent' }
]

export default function NewTicketModal({ onClose, onCreated }) {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({ title: '', description: '', category: '', priority: 'MEDIUM' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState(false)
  const [createdRequestId, setCreatedRequestId] = useState(null)

  // Only CUSTOMER role can create requests
  if (user?.role !== 'CUSTOMER') return null

  const set = key => e => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    if (errors[key]) {
      setErrors(errs => ({ ...errs, [key]: '' }))
    }
  }

  const validate = () => {
    const errs = {}
    if (!form.title.trim()) {
      errs.title = "Please tell us what this is about"
    }
    if (!form.category) {
      errs.category = "Please select a category"
    }
    if (!form.description.trim()) {
      errs.description = "Please describe the problem"
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category || 'TECHNICAL',
        priority: form.priority || 'MEDIUM'
      }

      const { data } = await ticketApi.create(payload)
      toast(`Request #${data.id} created successfully!`, 'success')
      if (onCreated) onCreated(data)
      setCreatedRequestId(data.id)
      setSuccess(true)
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to submit request', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleViewRequests = () => {
    onClose()
    if (createdRequestId) {
      navigate(`/chat?ticketId=${createdRequestId}`)
    } else {
      navigate('/tickets')
    }
  }

  return (
    <Modal title={success ? "Request Submitted" : "Tell us what's wrong"} onClose={onClose}>
      {success ? (
        <div style={{ textAlign: 'center', padding: '16px 8px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--green-bg)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle2 size={32} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
            Done! We've received your request.
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
            You'll see updates in My Requests. Our team and AI are on it!
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button className="btn btn-primary" onClick={handleViewRequests} style={{ padding: '10px 20px', fontSize: '14px' }}>
              View My Requests <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--accent-dim)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: 'var(--radius-sm)', marginBottom: '18px', fontSize: '13px', color: 'var(--accent-light)' }}>
            <Sparkles size={16} style={{ flexShrink: 0 }} />
            <span>Our AI helper will look for an instant solution or assign a support agent right away.</span>
          </div>

          {/* Subject Field */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: 600 }}>
              What's this about? <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <input
              className={`input ${errors.title ? 'input-error' : ''}`}
              placeholder="e.g. My order hasn't arrived"
              value={form.title}
              onChange={set('title')}
              style={{ borderColor: errors.title ? 'var(--red)' : undefined }}
            />
            {errors.title ? (
              <span style={{ fontSize: '12px', color: 'var(--red)', marginTop: '2px' }}>{errors.title}</span>
            ) : (
              <span className="form-hint" style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Brief title describing the problem</span>
            )}
          </div>

          {/* Category Field */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: 600 }}>
              Type of problem <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <select
              className="select"
              value={form.category}
              onChange={set('category')}
              style={{ borderColor: errors.category ? 'var(--red)' : undefined }}
            >
              <option value="">Choose one</option>
              {CATEGORY_OPTIONS.map(c => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            {errors.category ? (
              <span style={{ fontSize: '12px', color: 'var(--red)', marginTop: '2px' }}>{errors.category}</span>
            ) : (
              <span className="form-hint" style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Choose the category that best matches your issue</span>
            )}
          </div>

          {/* Priority Field */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: 600 }}>How urgent is it?</label>
            <select className="select" value={form.priority} onChange={set('priority')}>
              {PRIORITY_OPTIONS.map(p => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <span className="form-hint" style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Let us know how quickly you need help</span>
          </div>

          {/* Description Field */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ fontWeight: 600 }}>
              Describe the problem <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <textarea
              className="textarea"
              placeholder="Tell us what happened. The more detail, the faster we can help."
              value={form.description}
              onChange={set('description')}
              style={{ minHeight: 110, borderColor: errors.description ? 'var(--red)' : undefined }}
            />
            {errors.description ? (
              <span style={{ fontSize: '12px', color: 'var(--red)', marginTop: '2px' }}>{errors.description}</span>
            ) : (
              <span className="form-hint" style={{ fontSize: '12px', color: 'var(--text-dim)' }}>The more detail you provide, the faster we can help.</span>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 size={15} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} /> : <LifeBuoy size={15} />}
              {loading ? 'Sending...' : 'Report a problem to our team'}
            </button>
          </div>
        </form>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </Modal>
  )
}
