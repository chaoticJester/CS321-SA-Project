const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')

// LIVE_API=1 reads the existing API/database; no PRs or attachments are changed.
async function main() {
  const live = process.env.LIVE_API === '1'
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
  const context = await browser.newContext({ baseURL: process.env.APP_URL || 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1024 } })
  try {
    let session, expected
    const calls = []
    if (live) {
      const response = await context.request.post('/api/auth/login', { data: { employee_id: process.env.TEST_EMPLOYEE_ID || 'E0020', passcode: process.env.TEST_PASSCODE || '123456' } })
      assert.equal(response.status(), 200)
      session = await response.json()
      const result = await context.request.get('/api/pr?limit=100&status=pending', { headers: { Authorization: `Bearer ${session.token}` } })
      assert.equal(result.status(), 200)
      const list = await result.json()
      expected = list.data
      for (let page = 2; page <= list.pagination.total_pages; page++) {
        const response = await context.request.get(`/api/pr?limit=100&status=pending&page=${page}`, { headers: { Authorization: `Bearer ${session.token}` } })
        assert.equal(response.status(), 200)
        expected.push(...(await response.json()).data)
      }
      assert.ok(expected.every(pr => pr.status === 'pending' && pr.requester_id === session.employee.employee_id))
    } else {
      session = { token: 'test-token', employee: { employee_id: 'E0020', full_name: 'Requester', position: 'Employee', department: 'IT', approval_level_id: null } }
      expected = [0, 1, 2].map(index => ({ pr_id: `P${index}`, pr_no: `PENDING-${index}`, requester_id: 'E0020', status: 'pending', job_name: `Backend job ${index}`, require_date: '2026-10-30T00:00:00Z', created_at: '2026-10-01T00:00:00Z', total_amount: 60 }))
      await context.route('**/api/**', async route => {
        assert.equal(route.request().headers().authorization, 'Bearer test-token')
        const url = new URL(route.request().url())
        let body, status = 200
        if (url.pathname === '/api/pr') {
          if (url.searchParams.has('status')) assert.equal(url.searchParams.get('status'), 'pending', 'Landing cards must request pending PRs')
          body = { data: url.searchParams.get('page') === '2' ? expected.slice(2) : expected.slice(0, 2), pagination: { total: 3, total_pages: 2, page: Number(url.searchParams.get('page') || 1), limit: 100 } }
        } else if (url.pathname.endsWith('/notification-count')) body = { count: 3 }
        else if (url.pathname === '/api/pr/P0/status') body = { pr_id: 'P0', pr_no: 'PENDING-0', pr_status: 'pending', total: 1, chain: [] }
        else if (url.pathname === '/api/pr/P0') body = { ...expected[0], items: [{ item_id: 'I0', description: 'Backend item', qty: 1, unit: 'pcs', unit_price: '60' }], attachments: [] }
        else if (url.pathname.startsWith('/api/employees/')) body = session.employee
        // Broken details/attachments must never be fetched just to display cards.
        else { status = 404; body = { message: 'Attachment file not found' } }
        await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
      })
    }
    await context.addInitScript(session => sessionStorage.setItem('sa-pr-session', JSON.stringify(session)), session)
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('request', request => { const url = new URL(request.url()); if (url.pathname.startsWith('/api/')) calls.push(url.pathname) })
    await page.goto('/')
    await page.getByRole('heading', { name: 'Your Purchase Requisition', exact: true }).waitFor()
    await page.getByRole('status').filter({ hasText: 'กำลังโหลดคำขอ' }).waitFor({ state: 'hidden' })
    assert.deepEqual((await page.locator('.home-request-card h2').allTextContents()).sort(), expected.map(pr => pr.pr_no).sort())
    assert.deepEqual((await page.locator('.home-request-card p').allTextContents()).sort(), expected.map(pr => pr.job_name).sort())
    assert.ok(!calls.some(path => /^\/api\/pr\/[^/]+/.test(path) && path !== '/api/pr/notification-count'), 'Landing eagerly fetched details or attachments')
    if (expected.length && !live) {
      await page.getByRole('button', { name: 'ดูตัวอย่าง PDF', exact: true }).first().click()
      await page.getByRole('dialog', { name: 'ตัวอย่างใบขอสั่งซื้อ' }).waitFor()
      assert.ok(calls.includes('/api/pr/P0'))
      assert.equal(await page.locator('.print-only').getByText('Backend item', { exact: true }).count(), 1)
      await page.getByRole('button', { name: 'ปิดตัวอย่าง', exact: true }).click()
      await page.getByRole('button', { name: 'ดูตัวอย่าง PDF', exact: true }).nth(1).click()
      await page.getByRole('alert').filter({ hasText: 'Attachment file not found' }).waitFor()
      assert.equal(await page.locator('.home-request-card').count(), expected.length)
    }
    assert.deepEqual(errors, [])
    console.log(`PASS requester landing: ${expected.length} pending PRs; ${live ? 'live backend/database' : 'pagination, deferred preview, and missing-file isolation'}`)
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
