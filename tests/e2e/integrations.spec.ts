import { expect, test } from '@playwright/test'

test('GitHub CI dashboard renders real workflow-run data from its public API response', async ({ page }) => {
  await page.route(/^https:\/\/api\.github\.com\/repos\/uknowdream\/dreamex-tech\/actions\/runs\?per_page=15$/, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ workflow_runs: [
      { id: 101, name: 'CI', run_number: 620, event: 'push', status: 'completed', conclusion: 'success', head_branch: 'main', head_sha: 'abcdef0123456789', updated_at: '2026-10-22T00:00:00Z' },
      { id: 102, name: 'Browser regression tests', run_number: 523, event: 'push', status: 'completed', conclusion: 'failure', head_branch: 'main', head_sha: '0123456789abcdef', updated_at: '2026-10-22T00:01:00Z' },
    ] }),
  }))
  await page.goto('/github-ci')
  await expect(page.getByRole('heading', { name: /Follow the evidence|Gunakan bukti nyata/i })).toBeVisible()
  await expect(page.getByText('Browser regression tests')).toBeVisible()
  await expect(page.getByText('abcdef0')).toBeVisible()
  await page.getByRole('combobox', { name: /Filter workflow status|Filter status workflow/i }).selectOption('failure')
  await expect(page.getByText('Browser regression tests')).toBeVisible()
  await expect(page.getByText('CI', { exact: true })).toHaveCount(0)
})

test('GitHub CI dashboard reports API rate limiting without inventing workflow state', async ({ page }) => {
  await page.route(/^https:\/\/api\.github\.com\/repos\/uknowdream\/dreamex-tech\/actions\/runs\?per_page=15$/, route => route.fulfill({
    status: 403,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'rate limit exceeded' }),
  }))
  await page.goto('/github-ci')
  await expect(page.getByRole('alert')).toContainText(/rate limit|batas permintaan/i)
})

test('team workspace clearly reports when shared persistence has not been configured', async ({ page }) => {
  await page.route('**/api/team-workspace', route => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'workspace_not_configured', requiredConfiguration: ['DREAMEX_WORKSPACE_TOKEN'] }),
  }))
  await page.goto('/team-workspace')
  await page.getByLabel(/Shared workspace access token|Token akses workspace bersama/i).fill('placeholder-token-for-e2e')
  await page.getByRole('button', { name: /Connect & load|Hubungkan & muat/i }).click()
  await expect(page.getByRole('status')).toContainText(/not configured|belum dikonfigurasi/i)
  await expect(page.getByLabel(/Editable JSON object|Objek JSON yang dapat diedit/i)).toHaveValue(/DreamEx Tech/)
})


test('workspace owner can issue, change, and revoke per-member access tokens', async ({ page }) => {
  const members: { id: string; label: string; role: string; createdAt: string }[] = []
  let issued = 0
  await page.route('**/api/team-workspace*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const resource = url.searchParams.get('resource')
    const method = request.method()
    if (resource === 'audit') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ entries: [], retentionLimit: 200 }) })
      return
    }
    if (resource !== 'members') {
      if (method === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
          revision: 1, updatedAt: '2026-10-22T00:00:00.000Z', state: { project: 'DreamEx Tech', release: '', tasks: [], decisions: [], notes: '' },
          access: { role: 'owner', canRead: true, canWrite: true, canManageMembers: true },
        }) })
        return
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        revision: 2, updatedAt: '2026-10-22T00:01:00.000Z', state: { project: 'DreamEx Tech', release: '', tasks: [], decisions: [], notes: '' },
        access: { role: 'owner', canRead: true, canWrite: true, canManageMembers: true },
      }) })
      return
    }
    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ members, maxMembers: 100 }) })
      return
    }
    if (method === 'POST') {
      issued += 1
      const body = request.postDataJSON() as { label: string; role: string }
      const member = { id: String(issued).padStart(8, '0') + '-1111-4111-8111-111111111111', label: body.label, role: body.role, createdAt: '2026-10-22T00:02:00.000Z' }
      members.push(member)
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ member, token: 'one-time-member-token-' + issued, tokenVisibleOnce: true }) })
      return
    }
    const body = method === 'PATCH' ? request.postDataJSON() as { id: string; role: string } : null
    const id = body?.id || url.searchParams.get('id') || ''
    const index = members.findIndex(member => member.id === id)
    if (method === 'PATCH' && index >= 0) {
      members[index] = { ...members[index], role: body!.role }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ member: members[index] }) })
      return
    }
    if (method === 'DELETE' && index >= 0) {
      const [member] = members.splice(index, 1)
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ removed: true, member }) })
      return
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'member_not_found' }) })
  })

  await page.goto('/team-workspace')
  await page.getByLabel(/Shared workspace access token|Token akses workspace bersama/i).fill('test-owner-access-token')
  await page.getByRole('button', { name: /Connect & load|Hubungkan & muat/i }).click()
  await expect(page.getByRole('heading', { name: /Member access & roles|Akses anggota & role/i })).toBeVisible()
  await page.getByLabel(/Member label|Label anggota/i).fill('Release reviewer')
  await page.getByLabel(/Access role|Role akses/i).selectOption('viewer')
  await page.getByRole('button', { name: /Issue member token|Buat token anggota/i }).click()
  await expect(page.getByText('one-time-member-token-1')).toBeVisible()
  await expect(page.getByText('Release reviewer')).toBeVisible()
  await page.getByRole('combobox', { name: /Role for Release reviewer|Role untuk Release reviewer/i }).selectOption('editor')
  await expect.poll(() => members[0]?.role).toBe('editor')
  page.on('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: /Revoke|Cabut/i }).click()
  await expect(page.getByText('Release reviewer')).toHaveCount(0)
  expect(members).toHaveLength(0)
})

test('viewer role displays read-only workspace state', async ({ page }) => {
  await page.route('**/api/team-workspace', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      revision: 1, updatedAt: null, state: { project: 'DreamEx Tech', release: '', tasks: [], decisions: [], notes: '' },
      access: { role: 'viewer', canRead: true, canWrite: false, canManageMembers: false },
    }),
  }))
  await page.goto('/team-workspace')
  await page.getByLabel(/Shared workspace access token|Token akses workspace bersama/i).fill('test-viewer-access-token')
  await page.getByRole('button', { name: /Connect & load|Hubungkan & muat/i }).click()
  await expect(page.getByText(/Connected as viewer|Terhubung sebagai viewer/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /Publish shared snapshot|Publikasikan snapshot/i })).toBeDisabled()
  await expect(page.getByRole('heading', { name: /Member access & roles|Akses anggota & role/i })).toHaveCount(0)
})
