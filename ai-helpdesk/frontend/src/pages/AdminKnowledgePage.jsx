import React, { useState, useEffect } from 'react'
import { BookOpen, Plus, Pencil, Trash2, Search, CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react'
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
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)

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
      setArticles(res.data || [])
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
    if (!form.title.trim() || !form.answer.trim()) {
      toast('Title and Answer are required fields.', 'error')
      return
    }

    try {
      if (editingArticle) {
        await knowledgeApi.update(editingArticle.id, form)
        toast('Knowledge article updated', 'success')
      } else {
        await knowledgeApi.create(form)
        toast('New Knowledge article added', 'success')
      }
      setShowModal(false)
      fetchArticles()
    } catch (err) {
      toast('Operation failed: ' + (err.response?.data?.message || err.message), 'error')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      await knowledgeApi.delete(deleteConfirm.id)
      toast('Knowledge article deleted', 'success')
      setDeleteConfirm(null)
      fetchArticles()
    } catch (err) {
      toast('Failed to delete article', 'error')
    } finally {
      setDeleting(false)
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
        title="Knowledge Base"
        subtitle="Manage verified answers & ground truth articles for AI resolution"
        actions={
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-ghost" onClick={fetchArticles} title="Refresh articles">
              <RefreshCw size={14} className={loading ? 'spin-icon' : ''} /> Refresh
            </button>
            <button className="btn btn-primary" onClick={openCreateModal}>
              <Plus size={15} /> Add Article
            </button>
          </div>
        }
      />

      <div className="page">
        {/* Search & Category Filter Toolbar */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              className="input"
              placeholder="Search knowledge articles by title, question, or keywords..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '36px' }}
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
          <div className="empty"><div className="empty-msg">Loading Knowledge Base records...</div></div>
        ) : filteredArticles.length === 0 ? (
          <div className="empty" style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div className="empty-icon" style={{ margin: '0 auto 12px' }}><BookOpen size={36} style={{ color: 'var(--text-dim)' }} /></div>
            <div className="empty-msg" style={{ fontSize: '15px', color: 'var(--text-main)', marginBottom: '8px' }}>
              No knowledge articles found.
            </div>
            <button className="btn btn-primary btn-sm" onClick={openCreateModal} style={{ margin: '8px auto 0' }}>
              <Plus size={14} /> Add First Article
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="table-wrap desktop-only">
              <table className="table">
                <thead>
                  <tr>
                    <th>Title & Question</th>
                    <th>Category</th>
                    <th>Solution / Answer</th>
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
                            onClick={() => setDeleteConfirm(art)}
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

            {/* Mobile Stacked Cards */}
            <div className="mobile-only-cards" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredArticles.map(art => (
                <div
                  key={art.id}
                  style={{
                    padding: '14px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>{art.title}</div>
                      {art.question && <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>{art.question}</div>}
                    </div>
                    <CategoryBadge category={art.category} />
                  </div>

                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {art.answer}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                    <span style={{ color: art.active !== false ? '#34d399' : '#f87171', fontSize: '12px', fontWeight: 600 }}>
                      {art.active !== false ? 'Active' : 'Inactive'}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(art)}>
                        <Pencil size={14} /> Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(art)}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Article Modal */}
      {showModal && (
        <Modal title={editingArticle ? 'Edit Article' : 'Add Knowledge Article'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Article Title *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Password Reset Instructions"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Category</label>
                <select
                  className="select"
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Sample Customer Question</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. How do I reset my password?"
                  value={form.question}
                  onChange={e => setForm({ ...form, question: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Verified Solution / Answer *</label>
              <textarea
                className="textarea"
                rows={5}
                placeholder="Provide step-by-step instructions to answer customer queries..."
                value={form.answer}
                onChange={e => setForm({ ...form, answer: e.target.value })}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Keywords (Comma-separated)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. password, reset, forgot, login"
                value={form.keywords}
                onChange={e => setForm({ ...form, keywords: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingArticle ? 'Save Changes' : 'Add Article'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <Modal title="Delete Knowledge Article" onClose={() => setDeleteConfirm(null)}>
          <div style={{ padding: '8px 0', textAlign: 'center' }}>
            <AlertTriangle size={36} style={{ color: 'var(--red)', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
              Are you sure?
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
              This will permanently remove <strong>"{deleteConfirm.title}"</strong> from the Knowledge Base.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)} disabled={deleting}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDeleteConfirm} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete Article'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
