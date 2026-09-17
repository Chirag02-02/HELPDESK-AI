import React from 'react'
import { Sparkles, Headphones } from 'lucide-react'

export default function AppLogo({ size = 'medium', showText = true }) {
  const iconSizes = {
    small: 16,
    medium: 18,
    large: 22
  }

  const containerSizes = {
    small: { width: 28, height: 28 },
    medium: { width: 34, height: 34 },
    large: { width: 40, height: 40 }
  }

  const fontSizes = {
    small: '14px',
    medium: '16px',
    large: '20px'
  }

  const s = iconSizes[size] || 18
  const c = containerSizes[size] || containerSizes.medium
  const f = fontSizes[size] || fontSizes.medium

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', userSelect: 'none' }}>
      <div
        style={{
          width: c.width,
          height: c.height,
          borderRadius: '8px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-focus)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent-light)',
          boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)',
          position: 'relative',
          flexShrink: 0
        }}
      >
        <Headphones size={s} />
        <Sparkles
          size={Math.max(10, Math.floor(s * 0.65))}
          style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            color: 'var(--accent-light)',
            filter: 'drop-shadow(0 0 2px var(--accent))'
          }}
        />
      </div>
      {showText && (
        <span
          style={{
            fontSize: f,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text-main)',
            whiteSpace: 'nowrap'
          }}
        >
          AI Helpdesk
        </span>
      )}
    </div>
  )
}
