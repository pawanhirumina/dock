import { NextResponse } from 'next/server'

import {
  githubFetch,
  mapContributor,
  mapIssue,
  mapNotification,
  mapPull,
  mapRepo,
  mapWorkflowRun,
  resolveGithubToken,
} from '@/lib/github'

export const dynamic = 'force-dynamic'

function failure(error) {
  const status = error?.status || 500
  return NextResponse.json(
    { error: error?.message || 'GitHub request failed' },
    { status },
  )
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const resource = searchParams.get('resource') || 'status'

  let tokenInfo
  try {
    tokenInfo = await resolveGithubToken()
  } catch {
    return NextResponse.json(
      { error: 'Could not read the GitHub token from the Env Vault.' },
      { status: 500 },
    )
  }

  if (!tokenInfo.token) {
    if (resource === 'status') {
      return NextResponse.json({ connected: false })
    }
    return NextResponse.json(
      { error: 'No GitHub token configured.' },
      { status: 401 },
    )
  }

  const token = tokenInfo.token

  try {
    if (resource === 'status') {
      const [viewer, rate] = await Promise.all([
        githubFetch('/user', { token }),
        githubFetch('/rate_limit', { token }),
      ])

      return NextResponse.json({
        connected: true,
        source: tokenInfo.source,
        viewer: {
          login: viewer.login,
          name: viewer.name,
          avatarUrl: viewer.avatar_url,
          url: viewer.html_url,
          bio: viewer.bio,
          company: viewer.company,
          location: viewer.location,
          publicRepos: viewer.public_repos,
          totalPrivateRepos: viewer.total_private_repos ?? 0,
          followers: viewer.followers,
          following: viewer.following,
          createdAt: viewer.created_at,
        },
        rateLimit: {
          limit: rate.resources?.core?.limit ?? 0,
          remaining: rate.resources?.core?.remaining ?? 0,
          resetAt: rate.resources?.core?.reset
            ? new Date(rate.resources.core.reset * 1000).toISOString()
            : null,
        },
      })
    }

    if (resource === 'repos') {
      const repos = await githubFetch(
        '/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator,organization_member',
        { token },
      )
      return NextResponse.json({ repos: repos.map(mapRepo) })
    }

    if (resource === 'issues' || resource === 'pulls') {
      const items = await githubFetch(
        '/issues?filter=all&state=open&per_page=100',
        { token },
      )
      const filtered =
        resource === 'issues'
          ? items.filter((item) => !item.pull_request)
          : items.filter((item) => item.pull_request)

      return NextResponse.json({
        items:
          resource === 'issues' ? filtered.map(mapIssue) : filtered.map(mapPull),
      })
    }

    if (resource === 'notifications') {
      const notifications = await githubFetch(
        '/notifications?all=true&per_page=50',
        { token },
      )
      return NextResponse.json({
        notifications: notifications.map(mapNotification),
      })
    }

    if (resource === 'contributors') {
      const repo = searchParams.get('repo')
      if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
        return NextResponse.json(
          { error: 'A valid repository is required.' },
          { status: 400 },
        )
      }

      const contributors = await githubFetch(
        `/repos/${repo}/contributors?per_page=30&anon=1`,
        { token },
      )

      return NextResponse.json({
        contributors: Array.isArray(contributors)
          ? contributors.map(mapContributor)
          : [],
      })
    }

    if (resource === 'workflow-runs') {
      const repo = searchParams.get('repo')
      if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
        return NextResponse.json(
          { error: 'A valid repository is required.' },
          { status: 400 },
        )
      }

      const runs = await githubFetch(
        `/repos/${repo}/actions/runs?per_page=50`,
        { token },
      )
      return NextResponse.json({
        runs: (runs.workflow_runs || []).map(mapWorkflowRun),
      })
    }

    return NextResponse.json(
      { error: `Unknown GitHub resource: ${resource}` },
      { status: 400 },
    )
  } catch (error) {
    console.error(`GET /api/github?resource=${resource} failed:`, error.message)
    return failure(error)
  }
}
