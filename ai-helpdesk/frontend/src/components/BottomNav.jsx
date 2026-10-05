import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, Ticket, User, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function BottomNav() {
  const { user } = useAuth()
  const isAdminOrAgent = user?.role === 'ADMIN' || user?.role === 'AGENT'

  return (
    <nav className="bottom-nav">
      <NavLink to="/dashboard" className={({ isActive }) => 'bottom-nav-item' + (isActive ? ' active' : '')}>
        <LayoutDashboard size={20} />
        <span>Home</span>
      </NavLink>
      
      <NavLink to="/chat" className={({ isActive }) => 'bottom-nav-item' + (isActive ? ' active' : '')}>
        <MessageSquare size={20} />
        <span>Chat</span>
      </NavLink>
      
      <NavLink to="/tickets" className={({ isActive }) => 'bottom-nav-item' + (isActive ? ' active' : '')}>
        <Ticket size={20} />
        <span>Requests</span>
      </NavLink>

      {isAdminOrAgent ? (
        <NavLink to="/admin" className={({ isActive }) => 'bottom-nav-item' + (isActive ? ' active' : '')}>
          <ShieldCheck size={20} />
          <span>Admin</span>
        </NavLink>
      ) : (
        <NavLink to="/profile" className={({ isActive }) => 'bottom-nav-item' + (isActive ? ' active' : '')}>
          <User size={20} />
          <span>Profile</span>
        </NavLink>
      )}
    </nav>
  )
}
