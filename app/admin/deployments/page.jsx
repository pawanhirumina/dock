import DeploymentsTable, { DeploymentStats } from '@/components/deployments-table'

export default function DeploymentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Deployments</h1>
        <p className="text-sm text-muted-foreground">
          Every build from your connected Vercel projects, refreshed every 10 seconds.
        </p>
      </div>
      <DeploymentStats />
      <DeploymentsTable />
    </div>
  )
}
