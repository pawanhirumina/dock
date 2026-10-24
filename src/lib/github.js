import { createAdminClient } from '@/lib/supabase/client'

const GITHUB_API = 'https://api.github.com'

const TOKEN_VAULT_NAME = 'GITHUB_PAT'

/**
 * Resolve the GitHub token server-side.
 * A token saved from the UI (Env Vault) takes precedence over the env var so
 * the user can rotate it without restarting the app.
 */
export async function resolveGithubToken() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('env_vaults')
      .select('id, value')
      .eq('name', TOKEN_VAULT_NAME)
      .order('created_at', { ascending: false })
      .limit(1)

    if (!error && data?.[0]?.value) {
      return { token: data[0].value, source: 'vault', vaultId: data[0].id }
    }
  } catch {
    // Fall back to the environment variable below.
  }

  const envToken = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN
  if (envToken) {
    return { token: envToken, source: 'env' }
  }

  return { token: null, source: null }
}

export async function githubFetch(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${GITHUB_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'dock-control-plane',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  const data = await response.json().catch(() => null)

  if (response.status === 401) {
    const error = new Error(
      'GitHub rejected the token. It may be expired or missing the required scopes.',
    )
    error.status = 401
    throw error
  }

  if (!response.ok) {
    const error = new Error(
      data?.message || `GitHub API request failed (${response.status})`,
    )
    error.status = response.status
    throw error
  }

  return data
}

export function mapRepo(repo) {
  return {
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    url: repo.html_url,
    private: repo.private,
    fork: repo.fork,
    archived: repo.archived,
    language: repo.language,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    openIssues: repo.open_issues_count,
    sizeKb: repo.size ?? 0,
    defaultBranch: repo.default_branch,
    topics: repo.topics || [],
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    owner: {
      login: repo.owner?.login,
      avatarUrl: repo.owner?.avatar_url,
    },
  }
}

export function mapIssue(issue) {
  return {
    id: issue.id,
    number: issue.number,
    title: issue.title,
    url: issue.html_url,
    state: issue.state,
    comments: issue.comments,
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    user: {
      login: issue.user?.login,
      avatarUrl: issue.user?.avatar_url,
    },
    repo: repoFromUrl(issue.repository_url),
    labels: (issue.labels || []).map((label) =>
      typeof label === 'string' ? label : label.name,
    ),
  }
}

export function mapPull(pull) {
  return {
    ...mapIssue(pull),
    draft: Boolean(pull.draft),
  }
}

export function mapNotification(notification) {
  return {
    id: notification.id,
    reason: notification.reason,
    unread: notification.unread,
    title: notification.subject?.title,
    type: notification.subject?.type,
    url: notification.subject?.url
      ? apiUrlToHtml(notification.subject.url)
      : notification.repository?.html_url,
    updatedAt: notification.updated_at,
    repo: notification.repository?.full_name,
  }
}

export function mapContributor(contributor) {
  const login = contributor.login || contributor.name || contributor.email || 'Anonymous'

  return {
    id: String(contributor.id ?? login),
    login,
    avatarUrl: contributor.avatar_url || null,
    url: contributor.html_url || null,
    contributions: contributor.contributions ?? 0,
  }
}

export function mapWorkflowRun(run) {
  return {
    id: run.id,
    name: run.name,
    title: run.display_title,
    number: run.run_number,
    event: run.event,
    status: run.status,
    conclusion: run.conclusion,
    branch: run.head_branch,
    url: run.html_url,
    createdAt: run.created_at,
    startedAt: run.run_started_at || run.created_at,
    updatedAt: run.updated_at,
    actor: {
      login: run.actor?.login,
      avatarUrl: run.actor?.avatar_url,
    },
  }
}

function repoFromUrl(url) {
  if (!url) return null
  const parts = url.split('/repos/')
  return parts[1] || null
}

function apiUrlToHtml(url) {
  return url
    .replace('https://api.github.com/repos/', 'https://github.com/')
    .replace('/pulls/', '/pull/')
    .replace('/issues/', '/issues/')
}
