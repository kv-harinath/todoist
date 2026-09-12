import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext.jsx'
import PasswordInput from '../components/PasswordInput.jsx'

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await register(email, password, displayName)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message.includes('409') ? 'That email is already registered.' : 'Could not create your account.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="centered-form" onSubmit={handleSubmit}>
      <h1>Create your account</h1>
      {error && <div className="form-error">{error}</div>}
      <input
        type="text"
        placeholder="Name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        autoComplete="name"
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="username"
        required
      />
      <PasswordInput
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        minLength={8}
        required
      />
      <button type="submit" disabled={submitting}>
        {submitting ? 'Creating account...' : 'Sign up'}
      </button>
      <p style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </form>
  )
}
