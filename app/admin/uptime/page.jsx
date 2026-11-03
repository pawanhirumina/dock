"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Clock,
  ExternalLink,
  Plus,
  RefreshCw,
  Server,
  Trash2,
  WifiOff,
} from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
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
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import ConfirmDialog from "@/components/ui/confirm-dialog"
import { toast } from "@/components/ui/toast"

function timeAgo(value) {
  if (!value) return '—'
  const ms = new Date(value).getTime()
  if (Number.isNaN(ms)) return '—'
  const seconds = Math.floor((Date.now() - ms) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function statusMeta(status) {
  if (status === 'up') {
    return {
      label: 'Operational',
      variant: 'secondary',
      dot: 'bg-primary',
    }
  }
  if (status === 'down') {
    return {
      label: 'Down',
      variant: 'destructive',
      dot: 'bg-destructive',
    }
  }
  return {
    label: 'Unknown',
    variant: 'outline',
    dot: 'bg-muted-foreground',
  }
}

function StatCard({ title, value, description, icon: Icon, loading, destructive }) {
  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={destructive ? 'size-4 text-destructive' : 'size-4 text-muted-foreground'} />
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

const emptyForm = { name: '', url: '' }

export default function UptimePage() {
  const [monitors, setMonitors] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [monitorToDelete, setMonitorToDelete] = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/monitors')
      const json = await res.json()

      if (!res.ok || !Array.isArray(json)) {
        throw new Error(json?.error || 'Failed to load monitors')
      }

      setMonitors(json)
      setError('')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load monitors'
      setError(message)
      toast.add({
        type: 'error',
        title: 'Could not load monitors',
        description: message,
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async initial fetch
    load()
  }, [load])

  const refresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const upCount = useMemo(
    () => monitors.filter((monitor) => monitor.status === 'up').length,
    [monitors],
  )
  const downCount = useMemo(
    () => monitors.filter((monitor) => monitor.status === 'down').length,
    [monitors],
  )

  const closeDialog = () => {
    setOpen(false)
    setForm(emptyForm)
  }

  const add = async () => {
    if (!form.name.trim() || !form.url.trim()) {
      toast.add({
        type: 'error',
        title: 'Missing fields',
        description: 'Name and URL are required.',
      })
      return
    }

    let parsedUrl
    try {
      parsedUrl = new URL(form.url.trim())
    } catch {
      toast.add({
        type: 'error',
        title: 'Invalid URL',
        description: 'Use a full URL, for example https://api.example.com/health.',
      })
      return
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      toast.add({
        type: 'error',
        title: 'Invalid URL',
        description: 'Only HTTP and HTTPS URLs can be monitored.',
      })
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          url: parsedUrl.toString(),
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to add monitor')
      }

      if (data?.id) {
        setMonitors((prev) =>
          prev.some((monitor) => monitor.id === data.id)
            ? prev
            : [data, ...prev],
        )
      } else {
        await load()
      }
      toast.add({
        type: 'success',
        title: 'Monitor added',
        description: `${form.name.trim()} will be checked on the next run.`,
      })
      closeDialog()
    } catch (err) {
      toast.add({
        type: 'error',
        title: 'Could not add monitor',
        description:
          err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  const askRemove = (monitor) => {
    setMonitorToDelete(monitor)
    setConfirmOpen(true)
  }

  const confirmRemove = async () => {
    if (!monitorToDelete) return

    const res = await fetch(`/api/monitors?id=${monitorToDelete.id}`, {
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
      setMonitors((prev) =>
        prev.filter((monitor) => monitor.id !== monitorToDelete.id),
      )
      toast.add({
        type: 'success',
        title: 'Monitor removed',
        description: `${monitorToDelete.name} is no longer being checked.`,
      })
    }
    setConfirmOpen(false)
    setMonitorToDelete(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Uptime</h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Monitor your endpoints and spot outages before your users do.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={refresh}
            disabled={refreshing}
            aria-label="Refresh monitors"
          >
            {refreshing ? <Spinner /> : <RefreshCw />}
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus data-icon="inline-start" />
            Add monitor
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Could not load monitors</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Monitors"
          value={monitors.length}
          description="Endpoints being watched"
          icon={Server}
          loading={loading}
        />
        <StatCard
          title="Operational"
          value={upCount}
          description="Responding successfully"
          icon={Activity}
          loading={loading}
        />
        <StatCard
          title="Down"
          value={downCount}
          description="Needs attention"
          icon={WifiOff}
          loading={loading}
          destructive={downCount > 0}
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} size="sm">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-1 w-full" />
                <div className="flex justify-between gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : monitors.length === 0 ? (
        <Card>
          <CardContent>
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Activity />
                </EmptyMedia>
                <EmptyTitle>No monitors yet</EmptyTitle>
                <EmptyDescription>
                  Add the health endpoint of an API or website to start tracking
                  uptime and response time.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" onClick={() => setOpen(true)}>
                  <Plus data-icon="inline-start" />
                  Add your first monitor
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {monitors.map((monitor) => {
            const status = statusMeta(monitor.status)
            const uptime =
              monitor.uptime_pct != null ? Number(monitor.uptime_pct) : 0

            return (
              <Card key={monitor.id} size="sm">
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`size-2 shrink-0 rounded-full ${status.dot}`} />
                    <CardTitle className="truncate text-sm font-medium">
                      {monitor.name}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={status.variant}>{status.label}</Badge>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${monitor.name}`}
                      onClick={() => askRemove(monitor)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <a
                    href={monitor.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
                    title={monitor.url}
                  >
                    <ExternalLink className="size-3 shrink-0" />
                    <span className="truncate">{monitor.url}</span>
                  </a>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Uptime</span>
                      <span className="font-medium tabular-nums">
                        {uptime.toFixed(2)}%
                      </span>
                    </div>
                    <Progress value={uptime} />
                  </div>

                  <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      {monitor.response_time != null
                        ? `${monitor.response_time} ms`
                        : 'No response time'}
                    </span>
                    <span>{timeAgo(monitor.last_checked)}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) setOpen(true)
          else closeDialog()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add monitor</DialogTitle>
            <DialogDescription>
              Dock checks the URL and records its status and response time.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="monitor-name">Name</FieldLabel>
              <Input
                id="monitor-name"
                placeholder="Production API"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="monitor-url">URL</FieldLabel>
              <Input
                id="monitor-url"
                type="url"
                placeholder="https://api.example.com/health"
                value={form.url}
                onChange={(event) =>
                  setForm({ ...form, url: event.target.value })
                }
              />
              <FieldDescription>
                Use an HTTP or HTTPS endpoint that returns a success status.
              </FieldDescription>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={add} disabled={saving}>
              {saving ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Adding...
                </>
              ) : (
                'Add monitor'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove monitor?"
        description={`Stop checking ${monitorToDelete?.name}? Its check history will be deleted. This cannot be undone.`}
        onConfirm={confirmRemove}
        confirmText="Remove"
        loadingText="Removing..."
        variant="destructive"
      />
    </div>
  )
}
