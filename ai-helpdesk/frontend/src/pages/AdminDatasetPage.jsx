import React, { useState, useEffect } from 'react'
import { Database, Download, FileCode, Sparkles, Cpu, Layers, Eye, Check, Copy, RefreshCw, FileText } from 'lucide-react'
import { adminApi } from '../services/api'
import { useToast } from '../context/ToastContext'
import TopBar from '../components/TopBar'

export default function AdminDatasetPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [previewFormat, setPreviewFormat] = useState('jsonl')
  const [previewText, setPreviewText] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [downloadingFormat, setDownloadingFormat] = useState(null)
  const [copied, setCopied] = useState(false)
  const toast = useToast()

  useEffect(() => {
    fetchStats()
    fetchPreview('jsonl')
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const res = await adminApi.datasetStats()
      setStats(res.data)
    } catch (err) {
      toast('Failed to load dataset statistics', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchPreview = async (format) => {
    try {
      setPreviewLoading(true)
      setPreviewFormat(format)
      const res = await adminApi.datasetPreview(format)
      const text = typeof res.data === 'object' ? JSON.stringify(res.data, null, 2) : res.data
      setPreviewText(text || 'No training samples compiled yet. Submit customer tickets to populate training entries.')
    } catch (err) {
      toast('Failed to load dataset preview', 'error')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleDownload = async (format) => {
    try {
      setDownloadingFormat(format)
      const res = await adminApi.downloadDataset(format)

      const extMap = { jsonl: 'jsonl', rag: 'json', csv: 'csv' }
      const filename = `ai_helpdesk_${format}_dataset.${extMap[format] || 'txt'}`

      const blob = new Blob([res.data], { type: res.headers['content-type'] })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast(`Successfully downloaded ${filename}!`, 'success')
    } catch (err) {
      toast('Download failed', 'error')
    } finally {
      setDownloadingFormat(null)
    }
  }

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(previewText)
    setCopied(true)
    toast('Dataset code copied to clipboard!', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="main">
      <TopBar
        title="AI Dataset Generator & Exporter"
        subtitle="Compile, preview, and export support data for LLM fine-tuning & RAG benchmarks"
        actions={
          <button
            className="btn btn-ghost"
            onClick={() => { fetchStats(); fetchPreview(previewFormat); }}
            disabled={loading || previewLoading}
          >
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} /> Refresh Dataset Metrics
          </button>
        }
      />

      <div className="page">
        {/* Metrics Bar */}
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Fine-Tuning Samples</span>
              <div className="stat-icon" style={{ background: 'var(--accent-dim)', color: 'var(--accent-light)' }}>
                <Cpu size={18} />
              </div>
            </div>
            <div className="stat-value">{loading ? '…' : (stats?.fineTuningSamples || 0)}</div>
            <div className="stat-sub">Groq / OpenAI JSONL pairs</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">RAG Knowledge Chunks</span>
              <div className="stat-icon" style={{ background: 'var(--purple-bg)', color: '#c084fc' }}>
                <Layers size={18} />
              </div>
            </div>
            <div className="stat-value" style={{ color: '#c084fc' }}>{loading ? '…' : (stats?.ragKnowledgeChunks || 0)}</div>
            <div className="stat-sub">Vector embeddings indexed</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">RAG Resolved Inquiries</span>
              <div className="stat-icon" style={{ background: 'var(--blue-bg)', color: '#60a5fa' }}>
                <Sparkles size={18} />
              </div>
            </div>
            <div className="stat-value" style={{ color: '#60a5fa' }}>{loading ? '…' : (stats?.aiResolvedCount || 0)}</div>
            <div className="stat-sub">Automated support interactions</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Est. Token Efficiency</span>
              <div className="stat-icon" style={{ background: 'var(--green-bg)', color: '#34d399' }}>
                <FileCode size={18} />
              </div>
            </div>
            <div className="stat-value" style={{ color: '#34d399' }}>
              {loading ? '…' : (stats?.estimatedTokenSavings ? stats.estimatedTokenSavings.toLocaleString() : '0')}
            </div>
            <div className="stat-sub">Tokens saved via RAG grounding</div>
          </div>
        </div>

        {/* Dataset Export Formats */}
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-main)' }}>
          Dataset Export Formats
        </h2>

        <div className="three-col" style={{ gap: '20px', marginBottom: '24px' }}>
          {/* Fine Tuning JSONL */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-dim)', color: 'var(--accent-light)' }}>
                  <FileCode size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>LLM Fine-Tuning</h3>
                  <span className="badge badge-category" style={{ fontSize: '10.5px', marginTop: '2px' }}>.JSONL Format</span>
                </div>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '16px' }}>
                Multi-turn conversation objects (system, user, assistant) structured for fine-tuning llama3, Mixtral, or GPT models.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => handleDownload('jsonl')}
                disabled={downloadingFormat === 'jsonl'}
              >
                <Download size={14} /> {downloadingFormat === 'jsonl' ? 'Exporting...' : 'Export .JSONL'}
              </button>
              <button
                className={`btn ${previewFormat === 'jsonl' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => fetchPreview('jsonl')}
                title="Preview Dataset Code"
                aria-label="Preview Dataset Code"
              >
                <Eye size={14} />
              </button>
            </div>
          </div>

          {/* RAG Knowledge Base JSON */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: 'var(--purple-bg)', color: '#c084fc' }}>
                  <Layers size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Vector Index RAG</h3>
                  <span className="badge badge-open" style={{ fontSize: '10.5px', marginTop: '2px' }}>.JSON Format</span>
                </div>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '16px' }}>
                Structured Question-Answer document chunks enriched with keywords and category metadata for vector store ingestion.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => handleDownload('rag')}
                disabled={downloadingFormat === 'rag'}
              >
                <Download size={14} /> {downloadingFormat === 'rag' ? 'Exporting...' : 'Export .JSON'}
              </button>
              <button
                className={`btn ${previewFormat === 'rag' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => fetchPreview('rag')}
                title="Preview Dataset Code"
                aria-label="Preview Dataset Code"
              >
                <Eye size={14} />
              </button>
            </div>
          </div>

          {/* Classification CSV */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: 'var(--blue-bg)', color: '#60a5fa' }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Routing Classifier</h3>
                  <span className="badge badge-low" style={{ fontSize: '10.5px', marginTop: '2px' }}>.CSV Format</span>
                </div>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '16px' }}>
                Tabular ticket dataset containing labels for sentiment, priority, escalation, and category to train fast classifier models.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => handleDownload('csv')}
                disabled={downloadingFormat === 'csv'}
              >
                <Download size={14} /> {downloadingFormat === 'csv' ? 'Exporting...' : 'Export .CSV'}
              </button>
              <button
                className={`btn ${previewFormat === 'csv' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => fetchPreview('csv')}
                title="Preview Dataset Code"
                aria-label="Preview Dataset Code"
              >
                <Eye size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Live Code Preview */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={16} style={{ color: 'var(--accent-light)' }} />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
                Live Dataset Snippet Preview ({previewFormat.toUpperCase()})
              </h3>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={handleCopyPreview}>
              {copied ? <Check size={14} style={{ color: '#34d399' }} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>

          <div style={{
            background: 'var(--bg-dark)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '16px',
            maxHeight: '380px',
            overflowY: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: '#e2e8f0',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}>
            {previewLoading ? 'Compiling dataset preview snippet...' : previewText}
          </div>
        </div>
      </div>
    </div>
  )
}
