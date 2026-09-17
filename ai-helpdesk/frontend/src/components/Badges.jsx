import React from 'react'
import {
  Clock, RefreshCw, Hourglass, CheckCircle2,
  AlertCircle, AlertTriangle, ArrowDownCircle,
  CreditCard, Cpu, User, Package, RotateCcw, Tag,
  Smile, Meh, Frown
} from 'lucide-react'

export function StatusBadge({ status }) {
  const s = status?.toUpperCase() || 'OPEN'
  const displayLabel = status?.replace('_', ' ') || 'Open'

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
      {displayLabel}
    </span>
  )
}

export function PriorityBadge({ priority }) {
  const p = priority?.toUpperCase() || 'MEDIUM'

  const getIcon = () => {
    switch (p) {
      case 'CRITICAL':
      case 'HIGH': return <AlertCircle size={11} />
      case 'MEDIUM': return <AlertTriangle size={11} />
      case 'LOW': return <ArrowDownCircle size={11} />
      default: return <AlertTriangle size={11} />
    }
  }

  return (
    <span className={`badge badge-${p.toLowerCase()}`}>
      {getIcon()}
      {p}
    </span>
  )
}

export function CategoryBadge({ category }) {
  const c = category?.toUpperCase() || 'GENERAL'

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
      {c}
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

