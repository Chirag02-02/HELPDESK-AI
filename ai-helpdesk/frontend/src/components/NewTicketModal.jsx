import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, LifeBuoy, Tag, FileText, Sparkles } from 'lucide-react'
import Modal from './Modal'
import { ticketApi } from '../services/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

const CATEGORIES = ['BILLING', 'ACCOUNT', 'TECHNICAL', 'ORDER', 'REFUND', 'OTHER']

export default function NewTicketModal({ onClose, onCreated }) {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ title: '', description: '', category: 'TECHNICAL' })
  const [loading, setLoading] = useState(false)

  // STRICT RULE: Only CUSTOMER role can create tickets
  if (user?.role !== 'CUSTOMER') return null

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.title.trim()) return
    setLoading(true)
    try {
      const { data } = await ticketApi.create(form)
      toast(`Ticket #${data.id} created successfully! RAG AI is matching solutions.`, 'success')
      if (onCreated) onCreated(data)
      onClose()
      navigate(`/chat?ticketId=${data.id}`)
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to create ticket', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Create New Support Ticket" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--accent-dim)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: 'var(--radius-sm)', marginBottom: '18px', fontSize: '12.5px', color: 'var(--accent-light)' }}>
          <Sparkles size={16} />
          <span>Our AI Assistant will inspect verified knowledge articles to immediately answer your issue.</span>
        </div>

        <div className="form-group">
          <label className="form-label">Issue Subject</label>
          <input
            className="input"
            placeholder="e.g. Cannot log in or reset password"
            value={form.title}
            onChange={set('title')}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="select" value={form.category} onChange={set('category')}>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>
                {c.charAt(0) + c.slice(1).toLowerCase()} Support
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Detailed Description</label>
          <textarea
            className="textarea"
            placeholder="Please provide steps to reproduce, order IDs, or error codes..."
            value={form.description}
            onChange={set('description')}
            style={{ minHeight: 110 }}
          />
          <span className="form-hint">The more detail you provide, the better our AI can resolve your issue.</span>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Loader2 size={15} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} /> : <LifeBuoy size={15} />}
            {loading ? 'Creating Ticket...' : 'Submit Support Ticket'}
          </button>
        </div>
      </form>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </Modal>
  )
}
