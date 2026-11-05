'use client'

import { useState, type FormEvent, type ReactNode } from 'react'
import { useBeam } from '@/context/BeamContext'
import { Button, Field, TextInput } from '@/components/ui'

export function AuthGate({ children }: { children: ReactNode }) {
  const { mode, authUser, signIn, signUp, backendError, clearBackendError } = useBeam()
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const [localError, setLocalError] = useState('')

  if (mode !== 'live' || authUser) return <>{children}</>

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setLocalError('')
    clearBackendError()
    try {
      if (tab === 'signin') await signIn(email.trim(), password)
      else await signUp(email.trim(), password, name.trim() || email.split('@')[0])
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10 text-beam-cream">
      <p className="font-display text-4xl font-semibold text-beam-amber">Beam</p>
      <h1 className="mt-3 font-display text-2xl">Sign in to help nearby</h1>
      <p className="mt-2 text-sm text-beam-muted">
        Live mode uses Supabase email/password auth. Your requests, offers, and messages stay under
        your account with row-level security.
      </p>

      <div className="mt-6 flex rounded-2xl border border-beam-line bg-beam-raised p-1">
        {(['signin', 'signup'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
              tab === t ? 'bg-beam-amber text-beam-base' : 'text-beam-muted'
            }`}
          >
            {t === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        {tab === 'signup' ? (
          <Field label="Name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
        ) : null}
        <Field label="Email">
          <TextInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </Field>
        <Field label="Password">
          <TextInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
          />
        </Field>
        {(localError || backendError) && (
          <p className="text-sm text-red-300">{localError || backendError}</p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'Working…' : tab === 'signin' ? 'Sign in' : 'Create account'}
        </Button>
      </form>
    </div>
  )
}
