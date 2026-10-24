import { redirect } from 'next/navigation'

export default function GithubPage() {
  redirect('/admin/dashboard/github/repositories')
}
