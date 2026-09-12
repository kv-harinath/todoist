import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../api/client.js'
import { getStoredToken, setStoredToken } from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // 'loading' while we check an existing token on first load, so
  // ProtectedRoute doesn't redirect to /login before we know.
  const [status, setStatus] = useState('loading')

  const logout = useCallback(() => {
    setStoredToken(null)
    setUser(null)
    setStatus('signed-out')
  }, [])

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      setStatus('signed-out')
      return
    }
    api
      .me()
      .then((me) => {
        setUser(me)
        setStatus('signed-in')
      })
      .catch(() => {
        // stored token is invalid/expired
        setStoredToken(null)
        setStatus('signed-out')
      })
  }, [])

  useEffect(() => {
    window.addEventListener('auth:unauthorized', logout)
    return () => window.removeEventListener('auth:unauthorized', logout)
  }, [logout])

  async function login(email, password) {
    const { access_token, user: loggedInUser } = await api.login({ email, password })
    setStoredToken(access_token)
    setUser(loggedInUser)
    setStatus('signed-in')
  }

  async function register(email, password, displayName) {
    const { access_token, user: newUser } = await api.register({
      email,
      password,
      display_name: displayName,
    })
    setStoredToken(access_token)
    setUser(newUser)
    setStatus('signed-in')
  }

  return (
    <AuthContext.Provider value={{ user, status, login, register, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
