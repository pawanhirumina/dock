"use client"
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return alert(error.message)
    router.push('/admin/dashboard')
  }

  return (
    <div className="h-screen  flex items-center justify-center">
      <div className="w-80 flex flex-col gap-3">
        <h1 className="text-1xl text-center font-bold">Login to Dev Board</h1>
        <Input value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin email"  />
        <Input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="password"  />
        <Button onClick={login}>Login</Button>
      </div>
    </div>
  )
}
