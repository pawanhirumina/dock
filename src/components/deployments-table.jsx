'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Clock,
  ExternalLink,
  GitCommit,
  RefreshCw,
  Rocket,
  Search,
  X,
} from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
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

function timeAgo(input) {
  if (!input) return '—'
  const ms = typeof input === 'number' ? input : new Date(input).getTime()
  if (Number.isNaN(ms)) return '—'
  const seconds = Math.floor((Date.now() - ms) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

const stateVariant = {
  READY: 'default',
  BUILDING: 'secondary',
  QUEUED: 'secondary',
  ERROR: 'destructive',
  CANCELED: 'outline',
}

function getLinks(deployment) {
  const vercelUrl = deployment.url
    ? `https://${deployment.url}`
    : 'https://vercel.com/dashboard'

  const org = deployment.meta?.githubCommitOrg || deployment.meta?.githubOrg
  const repo = deployment.meta?.githubCommitRepo || deployment.meta?.githubRepo
  const sha = deployment.meta?.githubCommitSha
  const githubUrl = org && repo
    ? `https://github.com/${org}/${repo}${sha ? `/commit/${sha}` : ''}`
    : null

  return { vercelUrl, githubUrl, org, repo, sha }
}

function shortSha(deployment) {
  return deployment.meta?.githubCommitSha?.slice(0, 7) || deployment.uid?.slice(0, 7) || '—'
}

export function useDeployments(pollInterval = 10000) {
  const [deployments, setDeployments] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchDeployments = useCallback(async () => {
    try {
      const res = await fetch('/api/deployments', { cache: 'no-store' })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load deployments')
      }
      if (data.deployments) {
        setDeployments(data.deployments)
        setLastUpdate(Date.now())
      }
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deployments')
    } finally {
      setLoading(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await fetchDeployments()
    setRefreshing(false)
  }, [fetchDeployments])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async initial fetch
    fetchDeployments()
    const id = setInterval(fetchDeployments, pollInterval)
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchDeployments()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [fetchDeployments, pollInterval])

  return { deployments, loading, refreshing, error, lastUpdate, refresh }
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
          <Skeleton className="h-7 w-16" />
        ) : (
          <span className="text-2xl font-semibold tabular-nums">{value}</span>
        )}
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

export function DeploymentStats() {
  const { deployments, loading } = useDeployments()
  const last = deployments[0]
  const readyCount = deployments.filter((d) => d.state === 'READY').length
  const failedCount = deployments.filter(
    (d) => d.state === 'ERROR' || d.state === 'CANCELED',
  ).length
  const buildTimes = deployments
    .filter((d) => d.readyAt && d.createdAt)
    .slice(0, 10)
    .map((d) => (new Date(d.readyAt) - new Date(d.createdAt)) / 1000)
  const avgBuild = buildTimes.length
    ? Math.round(buildTimes.reduce((total, value) => total + value, 0) / buildTimes.length)
    : 0
  const successRate = deployments.length
    ? ((readyCount / deployments.length) * 100).toFixed(1)
    : '100.0'

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Last deploy"
        value={last ? timeAgo(last.createdAt) : '—'}
        description={last ? `${last.name} • ${shortSha(last)}` : 'No deployments yet'}
        icon={Rocket}
        loading={loading}
      />
      <StatCard
        title="Success rate"
        value={`${successRate}%`}
        description={`${readyCount} of ${deployments.length} deployments ready`}
        icon={Activity}
        loading={loading}
      />
      <StatCard
        title="Avg. build"
        value={`${avgBuild}s`}
        description="Last 10 deployments"
        icon={Clock}
        loading={loading}
      />
      <StatCard
        title="Failed"
        value={failedCount}
        description={failedCount === 0 ? 'No failed deploys' : 'Error or canceled'}
        icon={AlertTriangle}
        loading={loading}
        destructive={failedCount > 0}
      />
    </div>
  )
}

export default function DeploymentsTable() {
  const { deployments, loading, refreshing, error, lastUpdate, refresh } =
    useDeployments()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return deployments
    return deployments.filter((deployment) =>
      [
        deployment.name,
        deployment.state,
        deployment.meta?.githubCommitMessage,
        deployment.meta?.githubCommitSha,
        deployment.url,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    )
  }, [deployments, search])

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle>Deployments</CardTitle>
          <CardDescription>
            {search
              ? `${filtered.length} of ${deployments.length} deployments`
              : `${deployments.length} deployments across your projects`}
          </CardDescription>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <InputGroup className="w-full sm:w-64">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search deployments..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search deployments"
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
          <Button
            variant="outline"
            size="icon"
            onClick={refresh}
            disabled={refreshing}
            aria-label="Refresh deployments"
          >
            {refreshing ? <Spinner /> : <RefreshCw />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 p-0">
        {error && (
          <div className="px-4">
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>Could not refresh deployments</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {loading ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Deployment</TableHead>
                <TableHead>Commit</TableHead>
                <TableHead>State</TableHead>
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
                      <Skeleton className="size-9 rounded-lg" />
                      <div className="flex flex-col gap-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-44" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
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
                  <Rocket />
                </EmptyMedia>
                <EmptyTitle>
                  {search ? 'No matching deployments' : 'No deployments yet'}
                </EmptyTitle>
                <EmptyDescription>
                  {search
                    ? `Nothing matches “${search}”. Try a different search.`
                    : 'Deployments will appear here once Vercel reports a build.'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <Table>
            <TableCaption className="sr-only">
              Vercel deployments and their build status
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Deployment</TableHead>
                <TableHead>Commit</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="pr-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((deployment) => {
                const { vercelUrl, githubUrl, org, repo, sha } = getLinks(deployment)

                return (
                  <TableRow key={deployment.uid}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                          <Rocket className="size-4" />
                        </div>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <a
                            href={vercelUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate text-sm font-medium hover:underline"
                          >
                            {deployment.name}
                          </a>
                          <a
                            href={vercelUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="max-w-[32ch] truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
                          >
                            {deployment.url}
                          </a>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        {githubUrl ? (
                          <a
                            href={githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex max-w-[38ch] items-center gap-1.5 truncate text-sm hover:underline"
                            title={sha ? `View commit ${sha} on GitHub` : `View ${org}/${repo} on GitHub`}
                          >
                            <GitCommit className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">
                              {deployment.meta?.githubCommitMessage?.slice(0, 60) ||
                                sha?.slice(0, 7) ||
                                shortSha(deployment)}
                            </span>
                          </a>
                        ) : (
                          <span className="flex max-w-[38ch] items-center gap-1.5 truncate text-sm text-muted-foreground">
                            <GitCommit className="size-3.5 shrink-0" />
                            <span className="truncate">
                              {deployment.meta?.githubCommitMessage?.slice(0, 60) ||
                                shortSha(deployment)}
                            </span>
                          </span>
                        )}
                        {sha && (
                          <span className="font-mono text-xs text-muted-foreground">
                            {sha.slice(0, 7)}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant={stateVariant[deployment.state] || 'outline'}>
                        <span className="size-1.5 rounded-full bg-current" />
                        {deployment.state}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <span
                        className="text-xs text-muted-foreground"
                        title={new Date(deployment.createdAt).toLocaleString()}
                      >
                        {timeAgo(deployment.createdAt)}
                      </span>
                    </TableCell>

                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1">
                        {githubUrl && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Open commit on GitHub"
                            render={<a href={githubUrl} target="_blank" rel="noopener noreferrer" />}
                          >
                            <GitCommit />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Open deployment on Vercel"
                          render={<a href={vercelUrl} target="_blank" rel="noopener noreferrer" />}
                        >
                          <ExternalLink />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}

        {lastUpdate && (
          <p className="px-4 pb-4 text-xs text-muted-foreground">
            Last synced {timeAgo(lastUpdate)}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
