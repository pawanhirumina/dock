"use client"

import { useEffect, useMemo, useState } from 'react'
import {
  Clock,
  Eye,
  EyeOff,
  Mail,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import ConfirmDialog from "@/components/ui/confirm-dialog"
import { toast } from "@/components/ui/toast"

function timeAgo(value) {
  if (!value) return '—'
  const ms = typeof value === 'string' ? new Date(value).getTime() : value
  if (Number.isNaN(ms)) return '—'
  const seconds = Math.floor((Date.now() - ms) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function initials(email) {
  const name = email?.split('@')[0] || 'U'
  return name.slice(0, 2).toUpperCase()
}

function StatCard({ title, value, description, icon: Icon, loading }) {
  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {loading ? (
          <Skeleton className="h-7 w-12" />
        ) : (
          <span className="text-2xl font-semibold tabular-nums">{value}</span>
        )}
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

const emptyForm = { email: '', password: '' }

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load users')
      }
      setUsers(data.users || [])
      setLoadError('')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load users'
      setLoadError(message)
      toast.add({
        type: 'error',
        title: 'Could not load users',
        description: message,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async initial fetch
    fetchUsers()
  }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return users
    return users.filter((user) =>
      user.email?.toLowerCase().includes(query),
    )
  }, [users, search])

  const verifiedCount = users.filter(
    (user) => user.email_confirmed_at || user.confirmed_at,
  ).length
  const pendingCount = users.length - verifiedCount

  const closeDialog = () => {
    setOpen(false)
    setForm(emptyForm)
    setShowPassword(false)
  }

  const handleCreate = async () => {
    if (!form.email || !form.password) {
      toast.add({
        type: 'error',
        title: 'Missing fields',
        description: 'Email and password are required.',
      })
      return
    }
    if (form.password.length < 6) {
      toast.add({
        type: 'error',
        title: 'Password too short',
        description: 'Use at least 6 characters.',
      })
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || 'Create failed')
      }

      if (data.user) {
        setUsers((prev) =>
          prev.some((user) => user.id === data.user.id)
            ? prev
            : [data.user, ...prev],
        )
      } else {
        fetchUsers()
      }
      toast.add({
        type: 'success',
        title: 'User created',
        description: `${form.email} is verified and can sign in.`,
      })
      closeDialog()
    } catch (error) {
      toast.add({
        type: 'error',
        title: 'Could not create user',
        description:
          error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (user) => {
    setUserToDelete(user)
    setConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!userToDelete) return

    const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
      method: 'DELETE',
    })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      toast.add({
        type: 'error',
        title: 'Delete failed',
        description: data?.error || 'Please try again.',
      })
    } else {
      setUsers((prev) => prev.filter((user) => user.id !== userToDelete.id))
      toast.add({
        type: 'success',
        title: 'User deleted',
        description: `${userToDelete.email} no longer has access.`,
      })
    }
    setConfirmOpen(false)
    setUserToDelete(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Manage who can sign in to Dock. New users are verified
            automatically.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <UserPlus data-icon="inline-start" />
          Add user
        </Button>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <Mail />
          <AlertTitle>Could not load users</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total users"
          value={users.length}
          description="Supabase Auth accounts"
          icon={Users}
          loading={loading}
        />
        <StatCard
          title="Verified"
          value={verifiedCount}
          description="Can sign in right away"
          icon={ShieldCheck}
          loading={loading}
        />
        <StatCard
          title="Pending"
          value={pendingCount}
          description="Awaiting verification"
          icon={Clock}
          loading={loading}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle>Accounts</CardTitle>
            <CardDescription>
              {search
                ? `${filtered.length} of ${users.length} users`
                : `${users.length} ${users.length === 1 ? 'user' : 'users'} with access`}
            </CardDescription>
          </div>
          <InputGroup className="w-full sm:w-64">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search by email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search users"
            />
            {search && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  aria-label="Clear search"
                  onClick={() => setSearch('')}
                >
                  <X />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="pr-4">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-8 rounded-full" />
                        <Skeleton className="h-4 w-44" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="pr-4"><Skeleton className="ml-auto size-8" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : filtered.length === 0 ? (
            <div className="p-6">
              <Empty className="border border-dashed">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Users />
                  </EmptyMedia>
                  <EmptyTitle>
                    {search ? 'No matching users' : 'No users yet'}
                  </EmptyTitle>
                  <EmptyDescription>
                    {search
                      ? `Nothing matches “${search}”. Try a different search.`
                      : 'Create an account to get started with Dock.'}
                  </EmptyDescription>
                </EmptyHeader>
                {!search && (
                  <EmptyContent>
                    <Button variant="outline" onClick={() => setOpen(true)}>
                      <UserPlus data-icon="inline-start" />
                      Add your first user
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
            </div>
          ) : (
            <Table>
              <TableCaption className="sr-only">
                Users with access to Dock
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="pr-4">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => {
                  const verified = Boolean(
                    user.email_confirmed_at || user.confirmed_at,
                  )

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{initials(user.email)}</AvatarFallback>
                          </Avatar>
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate text-sm font-medium">
                              {user.email}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                              {user.id}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={verified ? 'secondary' : 'outline'}>
                          {verified ? 'Verified' : 'Unverified'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className="text-xs text-muted-foreground"
                          title={
                            user.created_at
                              ? new Date(user.created_at).toLocaleString()
                              : undefined
                          }
                        >
                          {timeAgo(user.created_at)}
                        </span>
                      </TableCell>
                      <TableCell className="pr-4">
                        <div className="flex items-center justify-end">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Delete ${user.email}`}
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(user)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) setOpen(true)
          else closeDialog()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>
              Create a verified Supabase account that can sign in immediately.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="user-email">Email</FieldLabel>
              <Input
                id="user-email"
                type="email"
                placeholder="user@example.com"
                autoComplete="off"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="user-password">Password</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="user-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) =>
                    setForm({ ...form, password: event.target.value })
                  }
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>
                At least 6 characters. The account is auto-verified.
              </FieldDescription>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Creating...
                </>
              ) : (
                'Create user'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete user?"
        description={`Delete ${userToDelete?.email}? They will lose access immediately and this cannot be undone.`}
        onConfirm={confirmDelete}
        confirmText="Delete"
        loadingText="Deleting..."
        variant="destructive"
      />
    </div>
  )
}
