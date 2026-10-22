"use client"
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from './components/ui/label'

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
      <div className="w-80 flex flex-col gap-6">
        <h1 className="text-2xl text-center font-bold">Login</h1>
        <div className='flex flex-col gap-1'>
        <Label>Email</Label>
        <Input value={email}  onChange={e=>setEmail(e.target.value)} placeholder="admin email"  />
        </div>
        <div className='flex flex-col gap-1'>
        <Label>Password</Label>
        <Input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="password"  />
        </div>
        <Button className="cursor-pointer" onClick={login}>Login</Button>
      </div>
    </div>
  )
}
