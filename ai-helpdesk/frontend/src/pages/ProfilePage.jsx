import React, { useState, useEffect, useRef } from 'react'
import { User, Mail, ShieldCheck, Headset, Camera, Save, X, Loader2, CheckCircle2, AlertTriangle, Upload, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { profileApi } from '../services/api'
import TopBar from '../components/TopBar'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const toast = useToast()
  const fileInputRef = useRef(null)

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await profileApi.get()
      const data = res.data
      setProfile(data)
      setName(data.name || '')
      setPhotoUrl(data.profilePhotoUrl || '')
      updateUser({
        name: data.name,
        profilePhotoUrl: data.profilePhotoUrl,
        role: data.role
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load user profile details.')
      toast('Failed to load user profile', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 1. Validate file size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      toast('Image file size exceeds 5MB limit', 'error')
      setError('Selected image is too large. Maximum file size is 5MB.')
      return
    }

    // 2. Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type.toLowerCase()) && !file.type.toLowerCase().startsWith('image/')) {
      toast('Invalid file type. Please select a JPG, PNG, WEBP, or GIF image.', 'error')
      setError('Invalid file format. Only JPG, PNG, WEBP, and GIF images are allowed.')
      return
    }

    setError('')
    setSelectedFile(file)

    // Create object URL for preview
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
  }

  const handleRemovePhoto = () => {
    setSelectedFile(null)
    setPreviewUrl('')
    setPhotoUrl('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast('Full name cannot be empty', 'error')
      setError('Full name is required.')
      return
    }

    if (trimmedName.length > 100) {
      toast('Full name cannot exceed 100 characters', 'error')
      setError('Full name cannot exceed 100 characters.')
      return
    }

    setSaving(true)
    setError('')

    try {
      let finalPhotoUrl = photoUrl

      // Upload file first if selected
      if (selectedFile) {
        const formData = new FormData()
        formData.append('file', selectedFile)
        const uploadRes = await profileApi.uploadPhoto(formData)
        finalPhotoUrl = uploadRes.data.profilePhotoUrl
      }

      // Update name and photo URL
      const updateRes = await profileApi.update({
        name: trimmedName,
        profilePhotoUrl: finalPhotoUrl
      })

      const updatedData = updateRes.data
      setProfile(updatedData)
      setName(updatedData.name)
      setPhotoUrl(updatedData.profilePhotoUrl || '')
      setSelectedFile(null)
      setPreviewUrl('')

      updateUser({
        name: updatedData.name,
        profilePhotoUrl: updatedData.profilePhotoUrl,
        role: updatedData.role
      })

      setEditing(false)
      toast('Profile updated successfully!', 'success')
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save profile changes.'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditing(false)
    setError('')
    setSelectedFile(null)
    setPreviewUrl('')
    if (profile) {
      setName(profile.name || '')
      setPhotoUrl(profile.profilePhotoUrl || '')
    }
  }

  const initials = (name || user?.name || user?.email || 'User')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const activePhoto = previewUrl || photoUrl || user?.profilePhotoUrl

  return (
    <div className="main">
      <TopBar
        title="My User Profile"
        subtitle="Manage personal details, security settings, and avatar image"
      />

      <div className="page" style={{ maxWidth: '840px', margin: '0 auto' }}>
        {loading ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <span>Loading profile details...</span>
          </div>
        ) : error && !profile ? (
          <div className="card" style={{ padding: '24px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--red-border)', color: 'var(--red)', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <AlertTriangle size={18} /> Error Loading Profile
            </div>
            <p style={{ marginTop: '8px', color: 'var(--text-main)' }}>{error}</p>
            <button className="btn btn-sm btn-ghost" style={{ marginTop: '12px' }} onClick={loadProfile}>
              Retry
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Main Profile Header Card */}
            <div className="card" style={{ padding: '28px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Profile Photo Avatar */}
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: 'var(--accent-dim)',
                    border: '2px solid var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    fontWeight: 700,
                    color: 'var(--accent-light)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
                  }}>
                    {activePhoto ? (
                      <img src={activePhoto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>

                  {editing && (
                    <label
                      htmlFor="avatar-file-input"
                      style={{
                        position: 'absolute',
                        bottom: '0',
                        right: '0',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                        transition: 'transform 0.15s ease'
                      }}
                      title="Upload new photo"
                    >
                      <Camera size={16} />
                    </label>
                  )}
                </div>

                {/* User Info Overview */}
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                      {profile?.name || user?.name || 'User Name'}
                    </h2>
                    <span className="badge" style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      borderRadius: '12px',
                      background: profile?.role === 'ADMIN' ? 'rgba(129, 140, 248, 0.2)' : profile?.role === 'AGENT' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(96, 165, 250, 0.2)',
                      color: profile?.role === 'ADMIN' ? '#818cf8' : profile?.role === 'AGENT' ? '#34d399' : '#60a5fa',
                      border: `1px solid ${profile?.role === 'ADMIN' ? '#818cf8' : profile?.role === 'AGENT' ? '#34d399' : '#60a5fa'}`
                    }}>
                      {profile?.role === 'ADMIN' ? 'ADMINISTRATOR' : profile?.role === 'AGENT' ? 'SUPPORT AGENT' : 'CUSTOMER'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', color: 'var(--text-dim)', fontSize: '13px' }}>
                    <Mail size={14} />
                    <span>{profile?.email}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '12px', color: 'var(--green)' }}>
                    <CheckCircle2 size={13} /> Active Account Verified
                  </div>
                </div>

                {/* Action button */}
                {!editing && (
                  <button
                    className="btn btn-primary"
                    onClick={() => setEditing(true)}
                    style={{ gap: '8px' }}
                  >
                    <User size={15} /> Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* Error Message Box */}
            {error && (
              <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--red-border)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} /> {error}
              </div>
            )}

            {/* Profile Form Card */}
            <div className="card" style={{ padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '18px', color: 'var(--text-main)', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                Account Information & Settings
              </h3>

              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Full Name */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Full Name</label>
                  <input
                    className="input"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    disabled={!editing || saving}
                    placeholder="Enter your full name"
                    maxLength={100}
                    required
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                    This name is displayed across ticket history and support conversations.
                  </div>
                </div>

                {/* Email (Readonly) */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Email Address</label>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px' }}>
                      Read-Only (Managed by System)
                    </span>
                  </div>
                  <input
                    className="input"
                    type="email"
                    value={profile?.email || ''}
                    disabled={true}
                    style={{ opacity: 0.7, cursor: 'not-allowed', background: 'var(--bg-input)' }}
                  />
                </div>

                {/* Role (Readonly) */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>System Role</label>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px' }}>
                      Controlled by Backend Authority
                    </span>
                  </div>
                  <input
                    className="input"
                    type="text"
                    value={profile?.role || ''}
                    disabled={true}
                    style={{ opacity: 0.7, cursor: 'not-allowed', background: 'var(--bg-input)' }}
                  />
                </div>

                {/* Profile Photo Selection (Visible when editing) */}
                {editing && (
                  <div className="form-group" style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }}>
                    <label className="form-label" style={{ fontWeight: 600, marginBottom: '8px' }}>
                      Profile Photo Upload
                    </label>

                    <input
                      id="avatar-file-input"
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}
                      >
                        <Upload size={14} /> Select Image File
                      </button>

                      {activePhoto && (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={handleRemovePhoto}
                          style={{ color: 'var(--red)', border: '1px solid var(--red-border)' }}
                        >
                          <Trash2 size={14} /> Remove Photo
                        </button>
                      )}

                      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                        {selectedFile ? selectedFile.name : 'Supported formats: JPG, PNG, WEBP, GIF (Max 5MB)'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Save / Cancel buttons */}
                {editing && (
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      <X size={15} /> Cancel
                    </button>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving || !name.trim()}
                    >
                      {saving ? (
                        <>
                          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                          <span>Saving Profile...</span>
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
