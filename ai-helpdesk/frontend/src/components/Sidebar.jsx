import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, Ticket, BarChart3,
  ListFilter, LogOut, Database, BookOpen, User
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AppLogo from './AppLogo'

export default function Sidebar({ openTickets = 0, highPriority = 0 }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const isAdminOrAgent = user?.role === 'ADMIN' || user?.role === 'AGENT'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <aside className="sidebar">
      <div className="nav-logo">
        <AppLogo size="medium" showText={true} />
      </div>

      {/* Customer Support Menu */}
      <div className="nav-section">
        <div className="nav-section-label">Customer Hub</div>
        <NavLink to="/dashboard" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <LayoutDashboard size={16} /> Overview
        </NavLink>
        <NavLink to="/chat" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <MessageSquare size={16} /> AI Support Chat
          {openTickets > 0 && <span className="nav-badge">{openTickets}</span>}
        </NavLink>
        <NavLink to="/tickets" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <Ticket size={16} /> My Tickets
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <User size={16} /> My Profile
        </NavLink>
      </div>

      {/* Admin / Agent Support Queue */}
      {isAdminOrAgent && (
        <div className="nav-section">
          <div className="nav-section-label">Management</div>
          <NavLink to="/admin" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <BarChart3 size={16} /> Performance
          </NavLink>
          <NavLink to="/admin/tickets" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <ListFilter size={16} /> Ticket Queue
            {highPriority > 0 && <span className="nav-badge danger">{highPriority}</span>}
          </NavLink>
          <NavLink to="/admin/knowledge" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <BookOpen size={16} /> Knowledge Base
          </NavLink>
          <NavLink to="/admin/dataset" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <Database size={16} /> AI Datasets
          </NavLink>
        </div>
      )}

      {/* User Footer Profile */}
      <div className="nav-footer">
        <div
          className="avatar"
          title={user?.name || user?.email}
          onClick={() => navigate('/profile')}
          style={{ cursor: 'pointer', overflow: 'hidden' }}
        >
          {user?.profilePhotoUrl ? (
            <img src={user.profilePhotoUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div
          style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
          onClick={() => navigate('/profile')}
        >
          <div className="avatar-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name || user?.email}
          </div>
          <div className="avatar-role">
            {user?.role === 'ADMIN' ? 'Administrator' : user?.role === 'AGENT' ? 'Support Agent' : 'Customer'}
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleLogout}
          title="Sign Out"
          aria-label="Sign Out"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  )
}

