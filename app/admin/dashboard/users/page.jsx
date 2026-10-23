'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Users, Clock, ShieldCheck, Trash2, Plus, X, Mail, Search } from "lucide-react"
import { toast } from "sonner"

function timeAgo(ms) {
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ email: '', password: '' })

  const fetchUsers = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    if (data.users) setUsers(data.users)
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const handleCreate = async () => {
    if (!form.email || !form.password) return toast.error("Email and password required")
    if (form.password.length < 6) return toast.error("Password min 6 chars")
    
    setSaving(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    if (!res.ok) toast.error(data.error)
    else {
      toast.success(`User ${form.email} created & auto-verified`)
      setForm({ email: '', password: '' })
      setOpen(false)
      fetchUsers()
    }
    setSaving(false)
  }

  const handleDelete = async (u) => {
    if (!confirm(`Delete ${u.email}? This cannot be undone.`)) return
    const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success("Deleted")
      setUsers(prev => prev.filter(x => x.id !== u.id))
    } else toast.error("Delete failed")
  }

  const filtered = users.filter(u => u.email?.toLowerCase().includes(search.toLowerCase()))

  return (
    <TooltipProvider>
    <div className="space-y-6 p-6 relative">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Users</h1>
        </div>
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add User
        </Button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border rounded-lg w-full max-w-md p-6 space-y-4 shadow-lg">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Create User</h2>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" placeholder="user@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                <p className="text-xs text-muted-foreground">User will be auto-verified and can login immediately.</p>
              </div>
              <Button onClick={handleCreate} disabled={saving} className="w-full">
                {saving ? 'Creating...' : 'Create & Verify'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Users</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{users.length}</div><p className="text-xs text-muted-foreground">Supabase Auth</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Last Joined</CardTitle><Clock className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold truncate text-sm">{users[0]?.email || '-'}</div><p className="text-xs text-muted-foreground">{users[0] ? timeAgo(new Date(users[0].created_at).getTime()) : 'No users'}</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Verified</CardTitle><ShieldCheck className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{users.filter(u => u.email_confirmed_at).length}</div><p className="text-xs text-muted-foreground">Auto-verified</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Users ({filtered.length})</CardTitle>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search email..." className="pl-8 max-w-" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loading && <p className="text-sm text-muted-foreground">Loading users...</p>}
            {!loading && filtered.length === 0 && <p className="text-sm text-muted-foreground">No users. Add one.</p>}
            {filtered.map((u) => (
              <div key={u.id} className="flex justify-between items-center border-b pb-3 last:border-0 gap-4">
                <div className="flex gap-3 items-center min-w-0">
                  <div className="w-10 h-10 rounded-md border bg-muted flex items-center justify-center"><Mail className="w-5 h-5" /></div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{u.email}</p>
                    <p className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleString()} · {timeAgo(new Date(u.created_at).getTime())}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {u.email_confirmed_at ? <Badge variant="default" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" >Verified</Badge> : <Badge variant="destructive">Unverified</Badge>}
                  <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleDelete(u)} type="button"></Button>
                  </TooltipTrigger><TooltipContent><p>Delete</p></TooltipContent></Tooltip>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  )
}