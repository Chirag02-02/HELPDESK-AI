import React from 'react'
import {
  Clock, RefreshCw, Hourglass, CheckCircle2,
  AlertCircle, AlertTriangle, ArrowDownCircle,
  CreditCard, Cpu, User, Package, RotateCcw, Tag,
  Smile, Meh, Frown
} from 'lucide-react'
import Tooltip from './Tooltip'

export function StatusBadge({ status }) {
  const s = status?.toUpperCase() || 'OPEN'
  
  const getLabel = () => {
    switch (s) {
      case 'PENDING': return 'Waiting for reply'
      case 'CLOSED':
      case 'RESOLVED': return 'Solved'
      case 'IN_PROGRESS': return 'In progress'
      case 'OPEN': default: return 'Open'
    }
  }

  const getIcon = () => {
    switch (s) {
      case 'OPEN': return <Clock size={11} />
      case 'IN_PROGRESS': return <RefreshCw size={11} />
      case 'PENDING': return <Hourglass size={11} />
      case 'CLOSED':
      case 'RESOLVED': return <CheckCircle2 size={11} />
      default: return <Clock size={11} />
    }
  }

  return (
    <span className={`badge badge-${status?.toLowerCase()}`}>
      {getIcon()}
      {getLabel()}
    </span>
  )
}

export function PriorityBadge({ priority, showTooltip = true }) {
  const p = priority?.toUpperCase() || 'MEDIUM'

  const getLabel = () => {
    switch (p) {
      case 'CRITICAL':
      case 'HIGH': return 'Urgent'
      case 'MEDIUM': return 'Normal'
      case 'LOW': return 'Not urgent'
      default: return 'Normal'
    }
  }

  const getIcon = () => {
    switch (p) {
      case 'CRITICAL':
      case 'HIGH': return <AlertCircle size={11} />
      case 'MEDIUM': return <AlertTriangle size={11} />
      case 'LOW': return <ArrowDownCircle size={11} />
      default: return <AlertTriangle size={11} />
    }
  }

  const isUrgent = p === 'HIGH' || p === 'CRITICAL' || p === 'URGENT'

  return (
    <span className={`badge badge-${p.toLowerCase()}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
      {getIcon()}
      {getLabel()}
      {isUrgent && showTooltip && (
        <Tooltip text="High-priority requests that need immediate assistance from our support team." />
      )}
    </span>
  )
}

export function CategoryBadge({ category }) {
  const c = category?.toUpperCase() || 'GENERAL'

  const getLabel = () => {
    switch (c) {
      case 'TECHNICAL': return 'Technical issue'
      case 'ORDER': return 'Order question'
      case 'BILLING': return 'Billing question'
      case 'ACCOUNT': return 'Account issue'
      case 'REFUND': return 'Refund request'
      default: return c.charAt(0) + c.slice(1).toLowerCase()
    }
  }

  const getIcon = () => {
    switch (c) {
      case 'BILLING': return <CreditCard size={11} />
      case 'TECHNICAL': return <Cpu size={11} />
      case 'ACCOUNT': return <User size={11} />
      case 'ORDER': return <Package size={11} />
      case 'REFUND': return <RotateCcw size={11} />
      default: return <Tag size={11} />
    }
  }

  return (
    <span className="badge badge-category">
      {getIcon()}
      {getLabel()}
    </span>
  )
}

export function SentimentBadge({ sentiment }) {
  const s = sentiment?.toUpperCase() || 'NEUTRAL'

  const getIcon = () => {
    switch (s) {
      case 'HAPPY': return <Smile size={11} />
      case 'FRUSTRATED':
      case 'ANGRY': return <Frown size={11} />
      default: return <Meh size={11} />
    }
  }

  return (
    <span className={`badge badge-sentiment-${s.toLowerCase()}`}>
      {getIcon()}
      {s}
    </span>
  )
}

