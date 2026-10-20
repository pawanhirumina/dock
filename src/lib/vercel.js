export async function getAllDeployments() {
  let all = []
  let until = null

  while (true) {
    const url = new URL('https://api.vercel.com/v6/deployments?limit=100')
    if (until) url.searchParams.set('until', until)

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.VC_API_TOKEN}` },
      cache: 'no-store'
    })
    const data = await res.json()
    if (!res.ok) throw new Error(JSON.stringify(data))
    
    all.push(...data.deployments)
    if (!data.pagination?.next) break
    until = data.pagination.next
  }
  return all
}
