"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  Eye,
  EyeOff,
  Image as ImageIcon,
  KeyRound,
  Rocket,
  ShieldAlert,
  Terminal,
} from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { createClient } from '@/lib/supabase/client'

const features = [
  { icon: Rocket, label: 'Live Vercel deployment health' },
  { icon: Activity, label: 'Endpoint uptime monitoring' },
  { icon: ImageIcon, label: 'Cloudinary media library' },
  { icon: KeyRound, label: 'Encrypted-at-rest secret vault' },
]

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  async function handleSubmit(event) {
    event.preventDefault()

    if (!email || !password) {
      setError('Email and password required')
      return
    }

    setLoading(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    router.push('/admin/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border bg-card shadow-sm lg:grid-cols-[1.1fr_1fr]">
        <div className="hidden flex-col justify-between gap-10 bg-muted/30 p-10 lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Terminal className="size-5" />
            </div>
            <span className="text-sm font-semibold">Dock</span>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                Your developer control plane
              </h1>
              <p className="max-w-sm text-sm text-muted-foreground">
                Deployments, uptime, media, secrets, and users — in one focused
                workspace.
              </p>
            </div>

            <ul className="flex flex-col gap-3">
              {features.map((feature) => (
                <li
                  key={feature.label}
                  className="flex items-center gap-3 text-sm text-muted-foreground"
                >
                  <span className="flex size-8 items-center justify-center rounded-lg border bg-background text-foreground">
                    <feature.icon className="size-4" />
                  </span>
                  {feature.label}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            Secured by Supabase Auth
          </p>
        </div>

        <div className="flex flex-col justify-center gap-6 p-6 sm:p-10">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Terminal className="size-5" />
            </div>
            <span className="text-sm font-semibold">Dock</span>
          </div>

          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign in to your Dock workspace.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <ShieldAlert />
              <AlertTitle>Sign-in failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="dev@dock.sh"
                  autoComplete="email"
                  disabled={loading}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={loading}
                    required
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      size="icon-xs"
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                      onClick={() => setShowPassword((visible) => !visible)}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            </FieldGroup>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Signing in...
                </>
              ) : (
                'Sign in to Dock'
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Need access? Ask an administrator to create your account.
          </p>
        </div>
      </div>
    </div>
  )
}
