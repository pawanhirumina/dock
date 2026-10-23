"use client"
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Users, Clock, ShieldCheck, Trash2, Plus, X, Mail, Search } from "lucide-react"
import { toast } from "sonner"
import ConfirmDialog from "@/components/ui/confirm-dialog"

function timeAgo(timestamp) {
  const ms = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp
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
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (data.users) setUsers(data.users)
    } catch {
      toast.error("Failed to fetch users")
    }
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const handleCreate = async () => {
    if (!form.email || !form.password) return toast.error("Email and password required")
    if (form.password.length < 6) return toast.error("Password min 6 chars")
    setSaving(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) toast.error(data.error || "Create failed")
      else {
        toast.success(`User ${form.email} created & auto-verified`)
        setForm({ email: '', password: '' })
        setOpen(false)
        fetchUsers()
      }
    } catch {
      toast.error("Network error")
    }
    setSaving(false)
  }

  const handleDelete = (u) => {
    setUserToDelete(u)
    setConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!userToDelete) return
    const res = await fetch(`/api/admin/users/${userToDelete.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success("Deleted")
      setUsers(prev => prev.filter(x => x.id !== userToDelete.id))
    } else toast.error("Delete failed")
    setConfirmOpen(false)
    setUserToDelete(null)
  }

  const filtered = users.filter(u => 
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const verifiedCount = users.filter(u => u.email_confirmed_at || u.confirmed_at).length

  return (
    <TooltipProvider>
      <div className="space-y-6 p-6 relative">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Users</h1>
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">Supabase Auth</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Verified</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{verifiedCount}</div>
              <p className="text-xs text-muted-foreground">{users.length - verifiedCount} pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Filtered</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filtered.length}</div>
              <p className="text-xs text-muted-foreground">matching search</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 max-w-[300px]" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Loading users...</div>
            ) : filtered.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">No users found</div>
            ) : (
              <div className="space-y-2">
                {filtered.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3  rounded-lg hover:bg-muted/50 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.email}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {u.created_at ? timeAgo(u.created_at) : '—'}
                          {u.email_confirmed_at ? (
                            <Badge variant="secondary" className="text- h-4">verified</Badge>
                          ) : (
                            <Badge variant="outline" className="text- h-4">unverified</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(u)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete user</TooltipContent>
                    </Tooltip>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Delete user?"
          description={`Are you sure you want to delete ${userToDelete?.email}? This cannot be undone.`}
          onConfirm={confirmDelete}
          confirmText="Delete"
          variant="destructive"
        />
      </div>
    </TooltipProvider>
  )
}