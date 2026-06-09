'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/ThemeToggle'

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [mode, setMode]         = useState<Mode>('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/dashboard')
        router.refresh()
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('Account created! Check your email to confirm, then sign in.')
        setMode('signin')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{
      minHeight: '100dvh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-6) var(--space-4)',
      background: 'var(--color-bg)',
    }}>
      {/* Theme toggle — top right */}
      <div style={{ position: 'fixed', top: 16, right: 16 }}>
        <ThemeToggle />
      </div>

      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Card */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-md)',
          padding: 'var(--space-10) var(--space-8)',
        }}>

          {/* Logo + heading */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
            <svg width="44" height="44" viewBox="0 0 40 40" fill="none"
              aria-label="MockPrep logo"
              style={{ margin: '0 auto 12px' }}>
              <circle cx="20" cy="20" r="18" stroke="var(--color-primary)" strokeWidth="2"/>
              <rect x="12" y="10" width="16" height="20" rx="2"
                fill="var(--color-primary)" opacity="0.12"/>
              <rect x="12" y="10" width="16" height="20" rx="2"
                stroke="var(--color-primary)" strokeWidth="1.5"/>
              <path d="M15 19l3 3 7-7" stroke="var(--color-primary)"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h1 style={{
              fontFamily: "'Cabinet Grotesk', Satoshi, sans-serif",
              fontSize: 'var(--text-xl)', fontWeight: 800,
              color: 'var(--color-text)', letterSpacing: '-0.02em',
            }}>
              MockPrep
            </h1>
            <p style={{ marginTop: 4, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              {mode === 'signin' ? 'Sign in to your account' : 'Create a new account'}
            </p>
          </div>

          {/* Success */}
          {success && (
            <div style={{
              marginBottom: 'var(--space-5)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-success-highlight)',
              color: 'var(--color-success)',
              fontSize: 'var(--text-sm)',
              border: '1px solid color-mix(in oklch, var(--color-success) 20%, transparent)',
            }}>
              {success}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              marginBottom: 'var(--space-5)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-error-highlight)',
              color: 'var(--color-error)',
              fontSize: 'var(--text-sm)',
              border: '1px solid color-mix(in oklch, var(--color-error) 20%, transparent)',
            }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <label htmlFor="email" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text)' }}>
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-text)',
                  fontSize: 'var(--text-base)',
                  outline: 'none',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'var(--color-primary)'
                  e.target.style.boxShadow = '0 0 0 3px color-mix(in oklch, var(--color-primary) 15%, transparent)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--color-border)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <label htmlFor="password" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text)' }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-text)',
                  fontSize: 'var(--text-base)',
                  outline: 'none',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'var(--color-primary)'
                  e.target.style.boxShadow = '0 0 0 3px color-mix(in oklch, var(--color-primary) 15%, transparent)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--color-border)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                width: '100%',
                padding: '11px var(--space-6)',
                borderRadius: 'var(--radius-lg)',
                background: loading ? 'color-mix(in oklch, var(--color-primary) 60%, transparent)' : 'var(--color-primary)',
                color: 'var(--color-text-inverse)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: 'var(--shadow-sm)',
                transition: 'background var(--transition-interactive)',
              }}
            >
              {loading
                ? (mode === 'signin' ? 'Signing in…' : 'Creating account…')
                : (mode === 'signin' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {/* Toggle mode */}
          <p style={{
            marginTop: 'var(--space-6)',
            textAlign: 'center',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
          }}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setSuccess(null) }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontWeight: 600,
                color: 'var(--color-primary)',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
                fontSize: 'var(--text-sm)',
              }}
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
          AI-powered mock exams for serious students.
        </p>
      </div>
    </main>
  )
}