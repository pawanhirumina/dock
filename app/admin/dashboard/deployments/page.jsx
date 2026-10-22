import DeploymentsTable from '@/components/deployments-table'

export default function DeploymentsPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Deployments</h1>
      <DeploymentsTable />
    </div>
  )
}