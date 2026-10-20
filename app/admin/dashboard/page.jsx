"use client"
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
export default function Dashboard() {
   const router = useRouter()
      async function logout() {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/admin/login')
      router.refresh() 
    }
  return (
  <div>
  </div>
  )
}
