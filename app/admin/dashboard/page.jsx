import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Rocket, Clock, Activity, AlertTriangle } from "lucide-react"
import { getAllDeployments } from '@/lib/vercel'

function timeAgo(ms) {
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

export default async function DashboardPage() {
  const deployments = await getAllDeployments()
  
  const last = deployments[0]
  const readyCount = deployments.filter(d => d.state === 'READY').length
  const failedCount = deployments.filter(d => d.state === 'ERROR' || d.state === 'CANCELED').length

  // Avg build time: Vercel gives createdAt and readyAt
  const buildTimes = deployments
    .filter(d => d.readyAt && d.createdAt)
    .slice(0, 10)
    .map(d => (d.readyAt - d.createdAt) / 1000)
  
  const avgBuild = buildTimes.length 
    ? Math.round(buildTimes.reduce((a,b) => a+b, 0) / buildTimes.length) 
    : 0

  // Fake uptime = % of READY deploys
  const uptime = deployments.length 
    ? ((readyCount / deployments.length) * 100).toFixed(2) 
    : 100

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Dev Overview</h1>
      
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Last Deploy</CardTitle>
            <Rocket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{last ? timeAgo(last.createdAt) : '—'}</div>
            <p className="text-xs text-muted-foreground truncate">
              {last?.name} • {last?.meta?.githubCommitSha?.slice(0,7) || last?.uid.slice(0,7)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uptime}%</div>
            <p className="text-xs text-muted-foreground">{readyCount} / {deployments.length} successful</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Build</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgBuild}s</div>
            <p className="text-xs text-muted-foreground">Last 10 deploys average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedCount}</div>
            <p className="text-xs text-muted-foreground">{failedCount === 0 ? 'No active issues' : 'Failed deploys'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Deployments ({deployments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {deployments.map((d) => (
             <div key={d.uid} className="flex justify-between border-b pb-3 last:border-0">
              <div>
                <p className="font-medium">{d.name} - {d.meta?.githubCommitMessage?.slice(0,50) || d.uid}</p>
                <p className="text-xs text-muted-foreground">{d.url} • {new Date(d.createdAt).toLocaleString()}</p>
              </div>
              <Badge variant={d.state === 'READY' ? 'default' : 'destructive'}>{d.state}</Badge>
            </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
