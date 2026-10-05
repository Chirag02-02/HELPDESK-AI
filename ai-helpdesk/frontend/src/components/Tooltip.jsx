import React, { useState, useRef, useEffect } from 'react'

export function Tooltip({ text }) {
  const [show, setShow] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!show) return
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setShow(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [show])

  if (!text) return null

  return (
    <span className="tooltip-wrap" ref={ref}>
      <span
        className="tooltip-trigger"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => {
          e.stopPropagation()
          setShow(prev => !prev)
        }}
        aria-label={text}
        role="button"
        tabIndex={0}
      >
        ?
      </span>
      {show && (
        <span className="tooltip-bubble">
          {text}
        </span>
      )}
    </span>
  )
}

export default Tooltip
