'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Rocket, Clock, Activity, AlertTriangle, RefreshCw } from "lucide-react"

function timeAgo(ms) {
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
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

export function DeploymentStats() {
  const { deployments, lastUpdate, refresh, loading } = useDeployments()
  const last = deployments[0]
  const readyCount = deployments.filter(d => d.state === 'READY').length
  const failedCount = deployments.filter(d => d.state === 'ERROR' || d.state === 'CANCELED').length
  const buildTimes = deployments.filter(d => d.readyAt && d.createdAt).slice(0, 10).map(d => (d.readyAt - d.createdAt) / 1000)
  const avgBuild = buildTimes.length ? Math.round(buildTimes.reduce((a,b) => a+b, 0) / buildTimes.length) : 0
  const uptime = deployments.length ? ((readyCount / deployments.length) * 100).toFixed(2) : 100

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
        <div className="space-y-3">
          {deployments.length === 0 && !loading && <p className="text-sm text-muted-foreground">No deployments</p>}
          {deployments.map((d) => (
           <div key={d.uid} className="flex justify-between border-b pb-3 last:border-0 gap-4">
            <div className="min-w-0">
              <p className="font-medium truncate">{d.name} - {d.meta?.githubCommitMessage?.slice(0,50) || d.uid}</p>
              <p className="text-xs text-muted-foreground truncate">{d.url} • {new Date(d.createdAt).toLocaleString()} • {timeAgo(d.createdAt)}</p>
            </div>
            <Badge variant={d.state === 'READY' ? 'default' : d.state === 'BUILDING' ? 'secondary' : 'destructive'} className="h-fit shrink-0">{d.state}</Badge>
          </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}