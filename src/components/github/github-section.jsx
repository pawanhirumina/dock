'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Bell,
  CircleDot,
  ExternalLink,
  Eye,
  EyeOff,
  GitBranch,
  GitFork,
  GitPullRequest,
  HardDrive,
  KeyRound,
  MessageSquare,
  RefreshCw,
  Search,
  Settings2,
  Star,
  Users,
  UserPlus,
  Workflow,
  X,
} from 'lucide-react'
import { SiGithub } from 'react-icons/si'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

const sectionMeta = {
  repositories: {
    title: 'Repositories',
    description:
      'Every repository you own or collaborate on, with its language and activity.',
    icon: GitBranch,
  },
  workflows: {
    title: 'Workflows',
    description:
      'GitHub Actions runs for each repository, including status and duration.',
    icon: Workflow,
  },
  issues: {
    title: 'Issues',
    description:
      'Open issues assigned to, created by, or mentioning your GitHub account.',
    icon: CircleDot,
  },
  pulls: {
    title: 'Pull requests',
    description:
      'Open pull requests you authored or were asked to review.',
    icon: GitPullRequest,
  },
  notifications: {
    title: 'Notifications',
    description:
      'Your GitHub notification inbox, including read and unread threads.',
    icon: Bell,
  },
}

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

function formatDuration(start, end) {
  if (!start || !end) return '—'
  const seconds = Math.max(
    0,
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000),
  )
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

function initials(login) {
  return (login || 'GH').slice(0, 2).toUpperCase()
}

function runMeta(run) {
  if (run.status === 'in_progress') {
    return { label: 'In progress', variant: 'secondary' }
  }
  if (run.status === 'queued' || run.status === 'waiting') {
    return { label: run.status, variant: 'outline' }
  }
  if (run.status === 'completed') {
    if (run.conclusion === 'success') return { label: 'Success', variant: 'secondary' }
    if (run.conclusion === 'failure') return { label: 'Failure', variant: 'destructive' }
    if (run.conclusion === 'cancelled') return { label: 'Cancelled', variant: 'outline' }
    if (run.conclusion === 'skipped') return { label: 'Skipped', variant: 'outline' }
    return { label: run.conclusion || 'Completed', variant: 'outline' }
  }
  return { label: run.status, variant: 'outline' }
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
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function SearchBox({ value, onChange, placeholder, label }) {
  return (
    <InputGroup className="w-full sm:w-64">
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
      />
      {value && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label="Clear search"
            onClick={() => onChange('')}
          >
            <X />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}

function ProfileCard({ status }) {
  const viewer = status.viewer

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar size="lg">
          <AvatarImage src={viewer?.avatarUrl} alt={viewer?.login || 'GitHub avatar'} />
          <AvatarFallback>{initials(viewer?.login)}</AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold">
              {viewer?.name || viewer?.login}
            </span>
            <span className="text-sm text-muted-foreground">@{viewer?.login}</span>
            <Badge variant={status.source === 'env' ? 'outline' : 'secondary'}>
              {status.source === 'env' ? 'Env token' : 'Vault token'}
            </Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {viewer?.bio ||
              `${viewer?.followers ?? 0} followers · ${viewer?.following ?? 0} following`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Badge variant="outline">
            <Activity />
            {status.rateLimit?.remaining ?? 0}/{status.rateLimit?.limit ?? 0}
          </Badge>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Open GitHub profile"
            render={
              <a href={viewer?.url} target="_blank" rel="noopener noreferrer" />
            }
          >
            <ExternalLink />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function formatRepoSize(sizeKb) {
  if (!sizeKb) return '0 MB'
  const mb = sizeKb / 1024
  return `${mb < 10 ? mb.toFixed(2) : mb.toFixed(1)} MB`
}

const contributorCache = new Map()

function RepoContributors({ repo }) {
  const cached = contributorCache.get(repo.fullName)
  const [state, setState] = useState(() => ({
    loading: !cached,
    contributors: cached || [],
  }))
  const containerRef = useRef(null)

  useEffect(() => {
    if (contributorCache.has(repo.fullName)) return

    const node = containerRef.current
    if (!node) return

    let active = true
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        observer.disconnect()

        fetchResource('contributors', { repo: repo.fullName })
          .then((result) => {
            const contributors = result.contributors || []
            contributorCache.set(repo.fullName, contributors)
            if (active) setState({ loading: false, contributors })
          })
          .catch(() => {
            contributorCache.set(repo.fullName, [])
            if (active) setState({ loading: false, contributors: [] })
          })
      },
      { rootMargin: '200px' },
    )

    observer.observe(node)

    return () => {
      active = false
      observer.disconnect()
    }
  }, [repo.fullName])

  return (
    <div ref={containerRef} className="flex items-center gap-2 border-t pt-3">
      {state.loading ? (
        <>
          <Skeleton className="size-8 rounded-full" />
          <span className="text-xs text-muted-foreground">Loading authors...</span>
        </>
      ) : state.contributors.length === 0 ? (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="size-3.5" />
          No contributors yet
        </span>
      ) : (
        <>
          <AvatarGroup
            title={state.contributors.map((contributor) => contributor.login).join(', ')}
          >
            {state.contributors.slice(0, 4).map((contributor) => (
              <Avatar key={contributor.id} size="sm">
                {contributor.avatarUrl && (
                  <AvatarImage
                    src={contributor.avatarUrl}
                    alt={contributor.login}
                  />
                )}
                <AvatarFallback>{initials(contributor.login)}</AvatarFallback>
              </Avatar>
            ))}
            {state.contributors.length > 4 && (
              <AvatarGroupCount className="size-6 text-xs">
                +{state.contributors.length - 4}
              </AvatarGroupCount>
            )}
          </AvatarGroup>
          <span className="text-xs text-muted-foreground">
            {state.contributors.length >= 30
              ? '30+ authors'
              : `${state.contributors.length} ${
                  state.contributors.length === 1 ? 'author' : 'authors'
                }`}
          </span>
        </>
      )}
    </div>
  )
}

function RepoCard({ repo }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <GitBranch className="size-4 shrink-0 text-muted-foreground" />
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-sm font-medium hover:underline"
          >
            {repo.name}
          </a>
          <Badge variant={repo.private ? 'outline' : 'secondary'}>
            {repo.private ? 'Private' : 'Public'}
          </Badge>
          {repo.archived && <Badge variant="outline">Archived</Badge>}
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Open ${repo.fullName}`}
          render={<a href={repo.url} target="_blank" rel="noopener noreferrer" />}
        >
          <ExternalLink />
        </Button>
      </div>

      <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
        {repo.description || 'No description provided.'}
      </p>

      {repo.topics.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {repo.topics.slice(0, 3).map((topic) => (
            <Badge key={topic} variant="outline">
              {topic}
            </Badge>
          ))}
          {repo.topics.length > 3 && (
            <Badge variant="outline">+{repo.topics.length - 3}</Badge>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" />
            {repo.language || 'Unknown'}
          </span>
          <span className="flex items-center gap-1.5">
            <HardDrive className="size-3" />
            {formatRepoSize(repo.sizeKb)}
          </span>
          <span className="flex items-center gap-1.5">
            <Star className="size-3" />
            {repo.stars}
          </span>
          <span className="flex items-center gap-1.5">
            <GitFork className="size-3" />
            {repo.forks}
          </span>
          <span className="ml-auto">{timeAgo(repo.pushedAt)}</span>
        </div>
        <RepoContributors repo={repo} />
      </div>
    </div>
  )
}

function RepositoriesSection({ repos, loading, query, onQueryChange }) {
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return repos
    return repos.filter((repo) =>
      [repo.fullName, repo.description, repo.language, ...repo.topics]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    )
  }, [repos, query])

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle>All repositories</CardTitle>
          <CardDescription>
            {query
              ? `${filtered.length} of ${repos.length} repositories`
              : `${repos.length} repositories you can access`}
          </CardDescription>
        </div>
        <SearchBox
          value={query}
          onChange={onQueryChange}
          placeholder="Search repositories..."
          label="Search repositories"
        />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <GitBranch />
              </EmptyMedia>
              <EmptyTitle>
                {query ? 'No matching repositories' : 'No repositories yet'}
              </EmptyTitle>
              <EmptyDescription>
                {query
                  ? `Nothing matches “${query}”. Try a different search.`
                  : 'Repositories you own or collaborate on will appear here.'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function WorkflowsSection({
  repos,
  selectedRepo,
  onRepoChange,
  runs,
  loading,
  error,
}) {
  const repoItems = useMemo(
    () => repos.map((repo) => ({ label: repo.fullName, value: repo.fullName })),
    [repos],
  )

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle>Workflow runs</CardTitle>
          <CardDescription>
            Latest GitHub Actions runs for the selected repository.
          </CardDescription>
        </div>
        <Select
          items={repoItems}
          value={selectedRepo || null}
          onValueChange={onRepoChange}
          disabled={repoItems.length === 0}
        >
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder="Select a repository" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {repoItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-0">
        {error && (
          <div className="px-4">
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>Could not load workflow runs</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {loading ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Workflow</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="pr-4">Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell className="pl-4">
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                  <TableCell className="pr-4"><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : repoItems.length === 0 ? (
          <div className="p-6">
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Workflow />
                </EmptyMedia>
                <EmptyTitle>No repositories to inspect</EmptyTitle>
                <EmptyDescription>
                  Connect a token with access to at least one repository to see
                  workflow runs.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : runs.length === 0 ? (
          <div className="p-6">
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Workflow />
                </EmptyMedia>
                <EmptyTitle>No workflow runs</EmptyTitle>
                <EmptyDescription>
                  This repository has no GitHub Actions runs yet.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <Table>
            <TableCaption className="sr-only">
              GitHub Actions workflow runs for {selectedRepo}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Workflow</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="pr-4">Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => {
                const meta = runMeta(run)
                return (
                  <TableRow key={run.id}>
                    <TableCell className="pl-4">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <a
                          href={run.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-sm font-medium hover:underline"
                        >
                          {run.title || run.name}
                        </a>
                        <span className="truncate text-xs text-muted-foreground">
                          {run.name} · #{run.number} · {run.event}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <GitBranch className="size-3.5" />
                        <span className="max-w-40 truncate">{run.branch || '—'}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatDuration(run.startedAt, run.updatedAt)}
                      </span>
                    </TableCell>
                    <TableCell className="pr-4">
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(run.startedAt)}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function IssuesSection({ issues, loading, query, onQueryChange }) {
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return issues
    return issues.filter((issue) =>
      [issue.title, issue.repo, ...issue.labels]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    )
  }, [issues, query])

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle>Open issues</CardTitle>
          <CardDescription>
            {query
              ? `${filtered.length} of ${issues.length} issues`
              : `${issues.length} open issues involving you`}
          </CardDescription>
        </div>
        <SearchBox
          value={query}
          onChange={onQueryChange}
          placeholder="Search issues..."
          label="Search issues"
        />
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <Table>
            <TableBody>
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell className="pl-4"><Skeleton className="h-4 w-64" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                  <TableCell className="pr-4"><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CircleDot />
                </EmptyMedia>
                <EmptyTitle>
                  {query ? 'No matching issues' : 'No open issues'}
                </EmptyTitle>
                <EmptyDescription>
                  {query
                    ? `Nothing matches “${query}”. Try a different search.`
                    : 'Issues assigned to, created by, or mentioning you will appear here.'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <Table>
            <TableCaption className="sr-only">
              Open GitHub issues involving you
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Issue</TableHead>
                <TableHead>Labels</TableHead>
                <TableHead>Comments</TableHead>
                <TableHead className="pr-4">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((issue) => (
                <TableRow key={issue.id}>
                  <TableCell className="pl-4">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <a
                        href={issue.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-sm font-medium hover:underline"
                      >
                        {issue.title}
                      </a>
                      <span className="truncate text-xs text-muted-foreground">
                        {issue.repo} #{issue.number} · {issue.user?.login}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {issue.labels.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        issue.labels.slice(0, 3).map((label) => (
                          <Badge key={label} variant="outline">
                            {label}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                      <MessageSquare className="size-3.5" />
                      {issue.comments}
                    </span>
                  </TableCell>
                  <TableCell className="pr-4">
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(issue.updatedAt)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function PullsSection({ pulls, loading, query, onQueryChange }) {
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return pulls
    return pulls.filter((pull) =>
      [pull.title, pull.repo, pull.user?.login]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    )
  }, [pulls, query])

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle>Open pull requests</CardTitle>
          <CardDescription>
            {query
              ? `${filtered.length} of ${pulls.length} pull requests`
              : `${pulls.length} open pull requests involving you`}
          </CardDescription>
        </div>
        <SearchBox
          value={query}
          onChange={onQueryChange}
          placeholder="Search pull requests..."
          label="Search pull requests"
        />
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <Table>
            <TableBody>
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell className="pl-4"><Skeleton className="h-4 w-64" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="pr-4"><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <GitPullRequest />
                </EmptyMedia>
                <EmptyTitle>
                  {query ? 'No matching pull requests' : 'No open pull requests'}
                </EmptyTitle>
                <EmptyDescription>
                  {query
                    ? `Nothing matches “${query}”. Try a different search.`
                    : 'Pull requests you opened or were asked to review will appear here.'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <Table>
            <TableCaption className="sr-only">
              Open GitHub pull requests involving you
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Pull request</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Comments</TableHead>
                <TableHead className="pr-4">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((pull) => (
                <TableRow key={pull.id}>
                  <TableCell className="pl-4">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <a
                        href={pull.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-sm font-medium hover:underline"
                      >
                        {pull.title}
                      </a>
                      <span className="truncate text-xs text-muted-foreground">
                        {pull.repo} #{pull.number} · {pull.user?.login}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={pull.draft ? 'outline' : 'secondary'}>
                      {pull.draft ? 'Draft' : 'Open'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                      <MessageSquare className="size-3.5" />
                      {pull.comments}
                    </span>
                  </TableCell>
                  <TableCell className="pr-4">
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(pull.updatedAt)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function NotificationsSection({
  notifications,
  loading,
  query,
  onQueryChange,
}) {
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return notifications
    return notifications.filter((notification) =>
      [notification.title, notification.repo, notification.reason]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    )
  }, [notifications, query])

  const unreadCount = notifications.filter(
    (notification) => notification.unread,
  ).length

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle>Inbox</CardTitle>
          <CardDescription>
            {query
              ? `${filtered.length} of ${notifications.length} notifications`
              : `${notifications.length} notifications · ${unreadCount} unread`}
          </CardDescription>
        </div>
        <SearchBox
          value={query}
          onChange={onQueryChange}
          placeholder="Search notifications..."
          label="Search notifications"
        />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Bell />
              </EmptyMedia>
              <EmptyTitle>
                {query ? 'No matching notifications' : 'No notifications'}
              </EmptyTitle>
              <EmptyDescription>
                {query
                  ? `Nothing matches “${query}”. Try a different search.`
                  : 'You are all caught up. New GitHub notifications will show up here.'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start gap-3 rounded-xl border bg-card p-4"
              >
                <span
                  className={cn(
                    'mt-1.5 size-2 shrink-0 rounded-full',
                    notification.unread ? 'bg-primary' : 'bg-muted-foreground/40',
                  )}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={notification.unread ? 'secondary' : 'outline'}>
                      {notification.reason.replaceAll('_', ' ')}
                    </Badge>
                    <span className="truncate text-xs text-muted-foreground">
                      {notification.repo}
                    </span>
                  </div>
                  <a
                    href={notification.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="line-clamp-2 text-sm font-medium hover:underline"
                  >
                    {notification.title}
                  </a>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {timeAgo(notification.updatedAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function GithubSection({ section }) {
  const meta = sectionMeta[section] || sectionMeta.repositories
  const SectionIcon = meta.icon

  const [status, setStatus] = useState({ loading: true, connected: false })
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')

  const [repos, setRepos] = useState([])
  const [issues, setIssues] = useState([])
  const [pulls, setPulls] = useState([])
  const [notifications, setNotifications] = useState([])

  const [selectedRepo, setSelectedRepo] = useState('')
  const selectedRepoRef = useRef('')
  const [runs, setRuns] = useState([])
  const [runsLoading, setRunsLoading] = useState(false)
  const [runsError, setRunsError] = useState('')

  const [tokenOpen, setTokenOpen] = useState(false)
  const [tokenValue, setTokenValue] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [savingToken, setSavingToken] = useState(false)
  const [disconnectOpen, setDisconnectOpen] = useState(false)

  const loadRuns = useCallback(async (repo) => {
    if (!repo) return

    setRunsLoading(true)
    setRunsError('')

    try {
      const result = await fetchResource('workflow-runs', { repo })
      setRuns(result.runs || [])
    } catch (error) {
      setRuns([])
      setRunsError(error.message)
    } finally {
      setRunsLoading(false)
    }
  }, [])

  const load = useCallback(async () => {
    setLoadError('')

    try {
      const nextStatus = await fetchResource('status')
      setStatus({ loading: false, ...nextStatus })

      if (!nextStatus.connected) {
        setLoading(false)
        return
      }

      setLoading(true)

      if (section === 'repositories') {
        const result = await fetchResource('repos')
        setRepos(result.repos || [])
      } else if (section === 'workflows') {
        const result = await fetchResource('repos')
        const nextRepos = result.repos || []
        setRepos(nextRepos)
        const repo =
          selectedRepoRef.current || nextRepos[0]?.fullName || ''
        selectedRepoRef.current = repo
        setSelectedRepo(repo)
        if (repo) await loadRuns(repo)
      } else if (section === 'issues') {
        const result = await fetchResource('issues')
        setIssues(result.items || [])
      } else if (section === 'pulls') {
        const result = await fetchResource('pulls')
        setPulls(result.items || [])
      } else if (section === 'notifications') {
        const result = await fetchResource('notifications')
        setNotifications(result.notifications || [])
      }
    } catch (error) {
      if (error.status === 401) {
        setStatus({ loading: false, connected: false })
      }
      setLoadError(error.message)
    } finally {
      setLoading(false)
    }
  }, [section, loadRuns])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async initial load
    load()
  }, [load])

  const refresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const changeRepo = (value) => {
    selectedRepoRef.current = value
    setSelectedRepo(value)
    loadRuns(value)
  }

  const closeTokenDialog = (open) => {
    setTokenOpen(open)
    if (!open) {
      setTokenValue('')
      setShowToken(false)
    }
  }

  const saveToken = async (event) => {
    event.preventDefault()
    const token = tokenValue.trim()

    if (!token) {
      toast.add({
        type: 'error',
        title: 'Token required',
        description: 'Paste a GitHub personal access token to continue.',
      })
      return
    }

    setSavingToken(true)
    try {
      const response = await fetch('/api/github/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result?.error || 'Could not save the token.')
      }

      toast.add({
        type: 'success',
        title: 'GitHub connected',
        description: `Signed in as @${result.viewer?.login || 'GitHub'}.`,
      })
      closeTokenDialog(false)
      await load()
    } catch (error) {
      toast.add({
        type: 'error',
        title: 'Could not connect GitHub',
        description: error.message,
      })
    } finally {
      setSavingToken(false)
    }
  }

  const disconnect = async () => {
    const response = await fetch('/api/github/token', { method: 'DELETE' })
    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      toast.add({
        type: 'error',
        title: 'Could not disconnect',
        description: result?.error || 'Please try again.',
      })
      return
    }

    toast.add({
      type: 'success',
      title: 'GitHub disconnected',
      description: result.fallback
        ? 'The saved token was removed. Falling back to GITHUB_PAT.'
        : 'The token was removed from your Env Vault.',
    })
    closeTokenDialog(false)
    await load()
  }

  const tokenDialog = (
    <Dialog open={tokenOpen} onOpenChange={closeTokenDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect GitHub</DialogTitle>
          <DialogDescription>
            Paste a personal access token to browse your repositories, workflow
            runs, issues, pull requests, and notifications.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={saveToken} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="github-token">Personal access token</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="github-token"
                  type={showToken ? 'text' : 'password'}
                  value={tokenValue}
                  onChange={(event) => setTokenValue(event.target.value)}
                  placeholder="github_pat_..."
                  autoComplete="off"
                  spellCheck={false}
                  disabled={savingToken}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label={showToken ? 'Hide token' : 'Show token'}
                    onClick={() => setShowToken((visible) => !visible)}
                  >
                    {showToken ? <EyeOff /> : <Eye />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>
                Needs repository, workflow, organization read, and notifications
                access. The token is stored in your Env Vault and used only by
                the server-side GitHub routes.
              </FieldDescription>
              {status.source === 'env' && (
                <FieldDescription>
                  Currently using the GITHUB_PAT environment variable. Saving a
                  token here overrides it.
                </FieldDescription>
              )}
            </Field>
          </FieldGroup>

          <Button
            variant="link"
            className="h-auto justify-start px-0"
            render={
              <a
                href="https://github.com/settings/tokens/new?scopes=repo,workflow,read:org,notifications&description=Dock%20control%20plane"
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            Create a token on GitHub
            <ExternalLink data-icon="inline-end" />
          </Button>

          <DialogFooter className="sm:justify-between">
            <div>
              {status.connected && status.source === 'vault' && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDisconnectOpen(true)}
                  disabled={savingToken}
                >
                  Disconnect
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => closeTokenDialog(false)}
                disabled={savingToken}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingToken}>
                {savingToken ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Verifying...
                  </>
                ) : (
                  'Save token'
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )

  const disconnectDialog = (
    <ConfirmDialog
      open={disconnectOpen}
      onOpenChange={setDisconnectOpen}
      title="Disconnect GitHub?"
      description="The saved token will be removed from your Env Vault. You can reconnect at any time."
      onConfirm={disconnect}
      confirmText="Disconnect"
      loadingText="Disconnecting..."
      variant="destructive"
    />
  )

  if (status.loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">GitHub</h1>
          <p className="text-sm text-muted-foreground">
            Repositories, workflows, issues, and notifications in one place.
          </p>
        </div>
        <Card>
          <CardContent className="flex items-center gap-4">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const viewer = status.viewer
  const totalRepos =
    (viewer?.publicRepos ?? 0) + (viewer?.totalPrivateRepos ?? 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <SectionIcon className="size-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">{meta.title}</h1>
          </div>
          <p className="max-w-prose text-sm text-muted-foreground">
            {meta.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={refresh}
            disabled={refreshing}
            aria-label="Refresh GitHub data"
          >
            {refreshing ? <Spinner /> : <RefreshCw />}
          </Button>
          {status.connected ? (
            <Button variant="outline" onClick={() => setTokenOpen(true)}>
              <Settings2 data-icon="inline-start" />
              Manage token
            </Button>
          ) : (
            <Button onClick={() => setTokenOpen(true)}>
              <KeyRound data-icon="inline-start" />
              Add token
            </Button>
          )}
        </div>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>
            {status.connected ? 'Could not load GitHub data' : 'GitHub is not connected'}
          </AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {!status.connected ? (
        <Card>
          <CardContent>
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SiGithub />
                </EmptyMedia>
                <EmptyTitle>Connect your GitHub account</EmptyTitle>
                <EmptyDescription>
                  Add a personal access token to list your repositories,
                  workflow runs, issues, pull requests, and notifications. The
                  token is stored in your Env Vault and used by server routes.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={() => setTokenOpen(true)}>
                  <KeyRound data-icon="inline-start" />
                  Add personal access token
                </Button>
                <p className="text-xs text-muted-foreground">
                  Needs repo, workflow, read:org, and notifications scopes.
                </p>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <>
          <ProfileCard status={status} />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Repositories"
              value={totalRepos}
              description={`${viewer?.totalPrivateRepos ?? 0} private · ${viewer?.publicRepos ?? 0} public`}
              icon={GitBranch}
              loading={false}
            />
            <StatCard
              title="Followers"
              value={viewer?.followers ?? 0}
              description="People following your work"
              icon={Users}
              loading={false}
            />
            <StatCard
              title="Following"
              value={viewer?.following ?? 0}
              description="Accounts you follow"
              icon={UserPlus}
              loading={false}
            />
            <StatCard
              title="API requests left"
              value={status.rateLimit?.remaining ?? 0}
              description={`of ${status.rateLimit?.limit ?? 0} this hour`}
              icon={Activity}
              loading={false}
            />
          </div>

          {section === 'repositories' && (
            <RepositoriesSection
              repos={repos}
              loading={loading}
              query={query}
              onQueryChange={setQuery}
            />
          )}

          {section === 'workflows' && (
            <WorkflowsSection
              repos={repos}
              selectedRepo={selectedRepo}
              onRepoChange={changeRepo}
              runs={runs}
              loading={loading || runsLoading}
              error={runsError}
            />
          )}

          {section === 'issues' && (
            <IssuesSection
              issues={issues}
              loading={loading}
              query={query}
              onQueryChange={setQuery}
            />
          )}

          {section === 'pulls' && (
            <PullsSection
              pulls={pulls}
              loading={loading}
              query={query}
              onQueryChange={setQuery}
            />
          )}

          {section === 'notifications' && (
            <NotificationsSection
              notifications={notifications}
              loading={loading}
              query={query}
              onQueryChange={setQuery}
            />
          )}
        </>
      )}

      {tokenDialog}
      {disconnectDialog}
    </div>
  )
}

async function fetchResource(resource, params = {}) {
  const search = new URLSearchParams({ resource, ...params })
  const response = await fetch(`/api/github?${search.toString()}`, {
    cache: 'no-store',
  })
  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(result?.error || 'GitHub request failed.')
    error.status = response.status
    throw error
  }

  return result
}
