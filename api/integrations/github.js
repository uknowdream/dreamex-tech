import { getSession, sendJson } from '../../server/platform.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return sendJson(res, 405, { error: 'method_not_allowed' })
  }
  const user = getSession(req)
  const owner = user?.login || (process.env.GITHUB_PUBLIC_OWNER || 'uknowdream').trim()
  if (!/^[A-Za-z0-9-]{1,39}$/.test(owner)) {
    return sendJson(res, 500, { error: 'github_public_owner_invalid', message: 'GITHUB_PUBLIC_OWNER must be a GitHub username.' })
  }

  try {
    const repositoriesResponse = await fetch('https://api.github.com/users/' + encodeURIComponent(owner) + '/repos?type=owner&sort=updated&per_page=8', {
      headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'DreamEx-Tech' },
      signal: AbortSignal.timeout(8000),
    })
    if (repositoriesResponse.status === 403) {
      return sendJson(res, 429, { error: 'github_rate_limited', message: 'GitHub public API rate limit reached. Try again later.' })
    }
    if (!repositoriesResponse.ok) throw new Error('GitHub repository lookup failed.')
    const source = await repositoriesResponse.json()
    if (!Array.isArray(source)) throw new Error('GitHub repository response was not a list.')
    const repositories = source
      .filter(repo => repo && typeof repo.name === 'string' && typeof repo.full_name === 'string' && !repo.fork && !repo.archived)
      .slice(0, 6)
    const workflowResults = await Promise.all(repositories.slice(0, 4).map(async repo => {
      try {
        const path = encodeURIComponent(repo.full_name).replace('%2F', '/')
        const response = await fetch('https://api.github.com/repos/' + path + '/actions/runs?per_page=1', {
          headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'DreamEx-Tech' },
          signal: AbortSignal.timeout(7000),
        })
        if (!response.ok) return { fullName: repo.full_name, state: 'unavailable', run: null }
        const body = await response.json()
        const run = Array.isArray(body.workflow_runs) ? body.workflow_runs[0] : null
        return {
          fullName: repo.full_name,
          state: run ? 'available' : 'no_runs',
          run: run ? {
            name: String(run.name || 'GitHub Actions').slice(0, 160),
            status: String(run.status || 'unknown').slice(0, 40),
            conclusion: typeof run.conclusion === 'string' ? run.conclusion : null,
            url: typeof run.html_url === 'string' ? run.html_url : null,
            updatedAt: typeof run.updated_at === 'string' ? run.updated_at : null,
          } : null,
        }
      } catch {
        return { fullName: repo.full_name, state: 'unavailable', run: null }
      }
    }))
    const workflows = new Map(workflowResults.map(result => [result.fullName, result]))
    return sendJson(res, 200, {
      username: owner,
      authenticated: Boolean(user),
      accountPersonalized: Boolean(user),
      fetchedAt: new Date().toISOString(),
      source: 'GitHub public repository and Actions APIs',
      limitations: user ? 'Only public repositories are queried. Private repository data and private Actions runs are not requested.' : 'Showing public repositories for the configured GITHUB_PUBLIC_OWNER (defaults to uknowdream). Sign in to switch to your GitHub username. Private repositories and private workflow runs are never queried.',
      repositories: repositories.map(repo => ({
        name: repo.name,
        fullName: repo.full_name,
        htmlUrl: repo.html_url,
        defaultBranch: repo.default_branch,
        stars: Number.isFinite(repo.stargazers_count) ? repo.stargazers_count : 0,
        updatedAt: repo.updated_at,
        workflow: workflows.get(repo.full_name) || { state: 'not_checked', run: null },
      })),
    })
  } catch {
    return sendJson(res, 502, { error: 'github_upstream_unavailable', message: 'Could not retrieve public GitHub data. Try again later.' })
  }
}
