'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Rocket, Clock, Activity, AlertTriangle, RefreshCw, GitCommit, FolderGit2, ExternalLink } from "lucide-react"
import { SiGithub } from "react-icons/si"
import { FaCodeCommit } from "react-icons/fa6";
function timeAgo(input) {
  const ms = typeof input === 'number' ? input : new Date(input).getTime()
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

const stateStyles = {
  READY: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  BUILDING: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  QUEUED: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  ERROR: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  CANCELED: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
}

const stateVariant = {
  READY: 'default',
  BUILDING: 'secondary',
  QUEUED: 'secondary',
  ERROR: 'destructive',
  CANCELED: 'outline',
}

export function useDeployments(pollInterval = 10000) {
  const [deployments, setDeployments] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchDeployments = async () => {
    try {
      const res = await fetch('/api/deployments', { cache: 'no-store' })
      const data = await res.json()
      if (data.deployments) {
        setDeployments(data.deployments)
        setLastUpdate(Date.now())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeployments()
    const id = setInterval(fetchDeployments, pollInterval)
    const onVis = () => { if (document.visibilityState === 'visible') fetchDeployments() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [pollInterval])

  return { deployments, loading, lastUpdate, refresh: fetchDeployments }
}

function getLinks(d) {
  const vercelUrl = d.url ? `https://${d.url}` : `https://vercel.com/dashboard`
  
  // GitHub commit URL
  const org = d.meta?.githubCommitOrg || d.meta?.githubOrg
  const repo = d.meta?.githubCommitRepo || d.meta?.githubRepo
  const sha = d.meta?.githubCommitSha
  const githubUrl = org && repo && sha 
    ? `https://github.com/${org}/${repo}/commit/${sha}`
    : org && repo
    ? `https://github.com/${org}/${repo}`
    : null

  return { vercelUrl, githubUrl, org, repo, sha }
}

export function DeploymentStats() {
  const { deployments, lastUpdate, refresh, loading } = useDeployments()
  const last = deployments[0]
  const readyCount = deployments.filter(d => d.state === 'READY').length
  const failedCount = deployments.filter(d => d.state === 'ERROR' || d.state === 'CANCELED').length
  const buildTimes = deployments.filter(d => d.readyAt && d.createdAt).slice(0, 10).map(d => (new Date(d.readyAt) - new Date(d.createdAt)) / 1000)
  const avgBuild = buildTimes.length ? Math.round(buildTimes.reduce((a,b) => a+b, 0) / buildTimes.length) : 0
  const uptime = deployments.length ? ((readyCount / deployments.length) * 100).toFixed(1) : '100'

  return (
    <>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dev Overview</h1>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {lastUpdate && <span>Updated {timeAgo(lastUpdate)}</span>}
          <Button variant="ghost" size="icon" onClick={refresh} disabled={loading}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Last Deploy</CardTitle><Rocket className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{last ? timeAgo(last.createdAt) : '—'}</div><p className="text-xs text-muted-foreground truncate">{last?.name} • {last?.meta?.githubCommitSha?.slice(0,7) || last?.uid.slice(0,7)}</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Uptime</CardTitle><Activity className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{uptime}%</div><p className="text-xs text-muted-foreground">{readyCount} / {deployments.length} successful</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Avg Build</CardTitle><Clock className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{avgBuild}s</div><p className="text-xs text-muted-foreground">Last 10 deploys average</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Incidents</CardTitle><AlertTriangle className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{failedCount}</div><p className="text-xs text-muted-foreground">{failedCount === 0 ? 'No active issues' : 'Failed deploys'}</p></CardContent></Card>
      </div>
    </>
  )
}

export default function DeploymentsTable() {
  const { deployments, loading, lastUpdate, refresh } = useDeployments()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>All Deployments ({deployments.length}) {loading && <span className="text-xs font-normal text-muted-foreground ml-2">syncing...</span>}</CardTitle>
        <div className="flex items-center gap-2">
          {lastUpdate && <span className="text-xs text-muted-foreground">{timeAgo(lastUpdate)}</span>}
          <Button variant="ghost" size="icon" onClick={refresh}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {deployments.length === 0 && !loading && <p className="text-sm text-muted-foreground">No deployments</p>}
          {deployments.map((d) => {
            const { vercelUrl, githubUrl, org, repo, sha } = getLinks(d)
            return (
              <div key={d.uid} className="group flex justify-between items-center py-3 gap-4 hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Vercel Deployment Link */}
                    <a 
                      href={vercelUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium flex items-center gap-1.5 hover:underline"
                    >
                      <FaCodeCommit  size={14} className="shrink-0" />
                      <span className="truncate">{d.name}</span>
                      <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    <span className="text-muted-foreground">-</span>
                    {/* GitHub Commit Link */}
                    {githubUrl ? (
                      <a 
                        href={githubUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm hover:underline"
                        title={sha ? `View commit ${sha} on GitHub` : `View repo ${org}/${repo}`}
                      >
                        <SiGithub size={14} className="shrink-0" />
                        <span className="truncate font-normal">{d.meta?.githubCommitMessage?.slice(0,50) || sha?.slice(0,7) || d.uid.slice(0,7)}</span>
                      </a>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm">
                        <SiGithub size={14} className="shrink-0" />
                        <span className="truncate font-normal text-sm">{d.meta?.githubCommitMessage?.slice(0,50) || d.uid.slice(0,7)}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <a href={vercelUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground hover:underline truncate">
                      {d.url}
                    </a>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground truncate">{new Date(d.createdAt).toLocaleString()} • {timeAgo(d.createdAt)}</span>
                    {sha && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded hover:bg-muted/80">
                          {sha.slice(0,7)}
                        </a>
                      </>
                    )}
                  </div>
                </div>
                {/* Click badge to go to Vercel */}
                <a href={vercelUrl} target="_blank" rel="noopener noreferrer">
                  <Badge 
                    variant={stateVariant[d.state] || 'destructive'}
                    className={`shrink-0 border cursor-pointer hover:opacity-80 transition-opacity ${stateStyles[d.state] || stateStyles.ERROR}`}
                  >
                    {d.state}
                  </Badge>
                </a>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}