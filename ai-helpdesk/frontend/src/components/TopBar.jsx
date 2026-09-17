import React from 'react'
import { ShieldCheck, User, Headset } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function TopBar({ title, subtitle, actions }) {
  const { user } = useAuth()

  return (
    <header className="topbar">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {actions}
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', fontSize: '12px' }}>
          {user?.role === 'ADMIN' ? (
            <>
              <ShieldCheck size={14} style={{ color: '#818cf8' }} />
              <span style={{ fontWeight: 600, color: '#818cf8' }}>Admin Portal</span>
            </>
          ) : user?.role === 'AGENT' ? (
            <>
              <Headset size={14} style={{ color: '#34d399' }} />
              <span style={{ fontWeight: 600, color: '#34d399' }}>Support Agent</span>
            </>
          ) : (
            <>
              <User size={14} style={{ color: '#60a5fa' }} />
              <span style={{ fontWeight: 600, color: '#60a5fa' }}>Customer</span>
            </>
          )}
        </div>

        <Link
          to="/profile"
          title="View & Edit Profile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: 'inherit',
            padding: '2px 8px 2px 2px',
            borderRadius: '20px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            transition: 'border-color 0.2s',
            cursor: 'pointer'
          }}
        >
          {user?.profilePhotoUrl ? (
            <img
              src={user.profilePhotoUrl}
              alt={user.name || 'User'}
              style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'var(--accent)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '12px'
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)' }}>
            {user?.name || 'My Profile'}
          </span>
        </Link>
      </div>
    </header>
  )
}
