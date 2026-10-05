import React from 'react'
import { ShieldCheck, User, Headset } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getProfilePhotoUrl } from '../services/api'

export default function TopBar({ title, subtitle, actions }) {
  const { user } = useAuth()

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>

      <div className="topbar-actions">
        {actions}
        
        <div className="topbar-role-badge">
          {user?.role === 'ADMIN' ? (
            <>
              <ShieldCheck size={14} style={{ color: '#818cf8' }} />
              <span style={{ fontWeight: 600, color: '#818cf8' }}>Admin</span>
            </>
          ) : user?.role === 'AGENT' ? (
            <>
              <Headset size={14} style={{ color: '#34d399' }} />
              <span style={{ fontWeight: 600, color: '#34d399' }}>Agent</span>
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
          className="topbar-profile-link"
        >
          {user?.profilePhotoUrl ? (
            <img
              src={getProfilePhotoUrl(user.profilePhotoUrl)}
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
                fontSize: '12px',
                flexShrink: 0
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <span className="topbar-user-name">
            {user?.name || 'Profile'}
          </span>
        </Link>
      </div>
    </header>
  )
}
