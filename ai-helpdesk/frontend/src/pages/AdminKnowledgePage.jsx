import React, { useState, useEffect } from 'react'
import { BookOpen, Plus, Pencil, Trash2, Search, CheckCircle, XCircle, Tag, Sparkles } from 'lucide-react'
import { knowledgeApi } from '../services/api'
import { useToast } from '../context/ToastContext'
import TopBar from '../components/TopBar'
import Modal from '../components/Modal'
import { CategoryBadge } from '../components/Badges'

const CATEGORIES = ['ACCOUNT', 'BILLING', 'REFUND', 'ORDER', 'TECHNICAL', 'OTHER']

export default function AdminKnowledgePage() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingArticle, setEditingArticle] = useState(null)

  const [form, setForm] = useState({
    title: '',
    question: '',
    answer: '',
    keywords: '',
    category: 'TECHNICAL',
    active: true
  })

  const toast = useToast()

  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticles = async () => {
    try {
      setLoading(true)
      const res = await knowledgeApi.getAll()
      setArticles(res.data)
    } catch (err) {
      toast('Failed to load Knowledge Base articles', 'error')
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingArticle(null)
    setForm({
      title: '',
      question: '',
      answer: '',
      keywords: '',
      category: 'TECHNICAL',
      active: true
    })
    setShowModal(true)
  }

  const openEditModal = (article) => {
    setEditingArticle(article)
    setForm({
      title: article.title || '',
      question: article.question || '',
      answer: article.answer || '',
      keywords: article.keywords || '',
      category: article.category || 'TECHNICAL',
      active: article.active !== false
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.answer) {
      toast('Title and Answer are required fields.', 'error')
      return
    }

    try {
      if (editingArticle) {
        await knowledgeApi.update(editingArticle.id, form)
        toast('Knowledge article updated successfully!', 'success')
      } else {
        await knowledgeApi.create(form)
        toast('New Knowledge article indexed into MySQL!', 'success')
      }
      setShowModal(false)
      fetchArticles()
    } catch (err) {
      toast('Operation failed: ' + (err.response?.data?.message || err.message), 'error')
    }
  }

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return
    try {
      await knowledgeApi.delete(id)
      toast('Knowledge article removed', 'success')
      fetchArticles()
    } catch (err) {
      toast('Failed to delete article', 'error')
    }
  }

  const filteredArticles = articles.filter(a => {
    const matchesSearch = !search ||
      a.title?.toLowerCase().includes(search.toLowerCase()) ||
      a.question?.toLowerCase().includes(search.toLowerCase()) ||
      a.keywords?.toLowerCase().includes(search.toLowerCase()) ||
      a.answer?.toLowerCase().includes(search.toLowerCase())

    const matchesCategory = !selectedCategory || a.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="main">
      <TopBar
        title="Knowledge Base Repository"
        subtitle="Verified support answers & RAG dataset ground truth"
        actions={
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={15} /> Add Knowledge Article
          </button>
        }
      />

      <div className="page">
        {/* Search & Category Filter Toolbar */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              className="input"
              placeholder="Search knowledge articles by title, question, or keywords..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '32px' }}
            />
          </div>

          <select
            className="select"
            style={{ width: '180px' }}
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        {/* Articles Table */}
        {loading ? (
          <div className="empty"><div className="empty-msg">Fetching Knowledge Base records...</div></div>
        ) : filteredArticles.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><BookOpen size={32} style={{ color: 'var(--text-dim)' }} /></div>
            <div className="empty-msg">No knowledge articles found. Click "Add Knowledge Article" to seed your KB.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Title & Sample Question</th>
                  <th>Category</th>
                  <th>Verified Solution / Answer</th>
                  <th>Keywords</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredArticles.map(art => (
                  <tr key={art.id}>
                    <td style={{ verticalAlign: 'top', maxWidth: '240px' }}>
                      <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-main)', marginBottom: '3px' }}>{art.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{art.question}</div>
                    </td>

                    <td style={{ verticalAlign: 'top' }}>
                      <CategoryBadge category={art.category} />
                    </td>

                    <td style={{ verticalAlign: 'top', maxWidth: '320px' }}>
                      <div style={{ color: 'var(--text-muted)', lineHeight: 1.5, fontSize: '12.5px', maxHeight: '75px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {art.answer}
                      </div>
                    </td>

                    <td style={{ verticalAlign: 'top', maxWidth: '180px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {art.keywords?.split(',').map((kw, idx) => (
                          <span key={idx} style={{ fontSize: '10.5px', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-card-hover)', color: 'var(--text-muted)' }}>
                            {kw.trim()}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td style={{ verticalAlign: 'top' }}>
                      {art.active !== false ? (
                        <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}>
                          <CheckCircle size={14} /> Active
                        </span>
                      ) : (
                        <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}>
                          <XCircle size={14} /> Inactive
                        </span>
                      )}
                    </td>

                    <td style={{ verticalAlign: 'top', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEditModal(art)}
                          title="Edit Article"
                          aria-label="Edit Article"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDelete(art.id, art.title)}
                          title="Delete Article"
                          aria-label="Delete Article"
                          style={{ color: 'var(--red)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Article Modal */}
      {showModal && (
        <Modal title={editingArticle ? 'Edit Knowledge Article' : 'Add Knowledge Article'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Article Title *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Password Reset Guide"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="select"
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Sample Customer Question</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. How do I reset my password?"
                  value={form.question}
                  onChange={e => setForm({ ...form, question: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Verified Solution / Answer *</label>
              <textarea
                className="textarea"
                rows={5}
                placeholder="Provide step-by-step verified instructions to ground the AI model..."
                value={form.answer}
                onChange={e => setForm({ ...form, answer: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Keywords (Comma-separated)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. password, reset, forgot, login, security"
                value={form.keywords}
                onChange={e => setForm({ ...form, keywords: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingArticle ? 'Save Changes' : 'Index Article'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
