import DeploymentsTable, { DeploymentStats } from '@/components/deployments-table'

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Deployment health and recent activity across your Vercel projects.
        </p>
      </div>
      <DeploymentStats />
      <DeploymentsTable />
    </div>
  )
}
