import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { App as CapApp } from '@capacitor/app'

export default function BackButtonHandler() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    let listener
    const setupListener = async () => {
      try {
        listener = await CapApp.addListener('backButton', ({ canGoBack }) => {
          const mainPages = ['/dashboard', '/login', '/admin']
          if (mainPages.includes(location.pathname)) {
            CapApp.exitApp()
          } else if (canGoBack || window.history.length > 1) {
            navigate(-1)
          } else {
            CapApp.exitApp()
          }
        })
      } catch (e) {
        // Ignored if not running in native app wrapper environment
      }
    }

    setupListener()

    return () => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove()
      }
    }
  }, [navigate, location])

  return null
}
