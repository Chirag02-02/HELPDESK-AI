import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('hd_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('hd_user')
    if (saved && token) {
      try { setUser(JSON.parse(saved)) } catch {}
    }
    setLoading(false)
  }, [])

  const login = (userData, jwt) => {
    setUser(userData)
    setToken(jwt)
    localStorage.setItem('hd_token', jwt)
    localStorage.setItem('hd_user', JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('hd_token')
    localStorage.removeItem('hd_user')
  }

  const updateUser = (updatedData) => {
    setUser(prev => {
      const merged = { ...prev, ...updatedData }
      localStorage.setItem('hd_user', JSON.stringify(merged))
      return merged
    })
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
