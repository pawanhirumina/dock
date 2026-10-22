import { DeploymentStats } from '@/components/deployments-table'
import DeploymentsTable from '@/components/deployments-table'

export default function DashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <DeploymentStats />
      <DeploymentsTable />
    </div>
  )
}