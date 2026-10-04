const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')

// LIVE_API=1 checks the existing database through the API without changing PRs.
async function main() {
  const live = process.env.LIVE_API === '1'
  const baseURL = process.env.APP_URL || 'http://127.0.0.1:5173'
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1024 } })
  try {
    let session
    let expected
    let failDetail = true
    let failList = false
    const calls = []
    if (live) {
      const response = await context.request.post('/api/auth/login', { data: {
        employee_id: process.env.TEST_EMPLOYEE_ID || 'E0020',
        passcode: process.env.TEST_PASSCODE || '123456',
      } })
      assert.equal(response.status(), 200, 'Backend login failed')
      session = await response.json()
      const list = await context.request.get('/api/pr?limit=100', { headers: { Authorization: `Bearer ${session.token}` } })
      assert.equal(list.status(), 200, 'Backend list failed')
      const result = await list.json()
      expected = result.data
      for (let page = 2; page <= result.pagination.total_pages; page++) {
        const response = await context.request.get(`/api/pr?page=${page}&limit=100`, { headers: { Authorization: `Bearer ${session.token}` } })
        assert.equal(response.status(), 200)
        expected.push(...(await response.json()).data)
      }
      assert.ok(expected.every(pr => pr.requester_id === session.employee.employee_id), 'List includes another requester')
    } else {
      session = { token: 'test-session', employee: { employee_id: 'E0020', full_name: 'Requester', department: 'IT', position: 'Employee', approval_level_id: null } }
      expected = ['pending', 'approved', 'rejected'].map((status, index) => ({
        pr_id: `P${index}`, pr_no: `BACKEND-${index}`, requester_id: 'E0020', status,
        job_name: `Server request ${index}`, purpose: 'Backend purpose', asset_type: 'Investment Budget',
        require_date: '2026-10-30T00:00:00Z', created_at: '2026-10-01T00:00:00Z', vendor_name: 'Vendor', total_amount: 120,
      }))
      await context.route('**/api/**', async route => {
        assert.equal(route.request().headers().authorization, 'Bearer test-session')
        const url = new URL(route.request().url())
        let body, status = 200
        if (url.pathname === '/api/pr') {
          if (failList) { status = 503; body = { message: 'Backend temporarily unavailable' } }
          else body = { data: url.searchParams.get('page') === '2' ? expected.slice(2) : expected.slice(0, 2), pagination: { page: Number(url.searchParams.get('page') || 1), limit: 100, total: 3, total_pages: 2 } }
        } else if (url.pathname.endsWith('/notification-count')) body = { count: 1 }
        else if (failDetail) { status = 500; body = { message: 'Detail unavailable' } }
        else if (url.pathname.endsWith('/status')) body = { pr_id: 'P0', pr_no: 'BACKEND-0', pr_status: 'pending', total: 120, chain: [] }
        else if (url.pathname.startsWith('/api/employees/')) body = session.employee
        else body = { ...expected[0], items: [{ item_id: 'I0', description: 'Server item', qty: 2, unit: 'pcs', unit_price: '60' }], attachments: [] }
        await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
      })
    }
    await context.addInitScript(session => sessionStorage.setItem('sa-pr-session', JSON.stringify(session)), session)
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) calls.push(new URL(request.url()).pathname) })
    await page.goto('/')
    await page.getByRole('heading', { name: 'Your Purchase Requisition', exact: true }).waitFor()
    calls.length = 0
    await page.getByRole('button', { name: 'คำขอของฉัน', exact: true }).click()
    await page.getByRole('status').filter({ hasText: 'กำลังโหลดคำขอ' }).waitFor({ state: 'hidden' })
    let actual = []
    for (let pageIndex = 0; pageIndex < Math.max(1, Math.ceil(expected.length / 10)); pageIndex++) {
      actual.push(...await page.locator('tbody tr td:nth-child(2) strong').allTextContents())
      if (pageIndex < Math.ceil(expected.length / 10) - 1) await page.getByRole('button', { name: 'ถัดไป', exact: true }).click()
    }
    assert.deepEqual(actual.sort(), expected.map(pr => pr.pr_no).sort(), 'My Requests differs from backend data')
    assert.equal(await page.locator('tbody').getByText('PR-DRAFT', { exact: true }).count(), 0)
    const pendingCount = expected.filter(pr => pr.status === 'pending').length
    async function assertCounts() {
      const labels = await page.locator('.request-tabs button').allTextContents()
      assert.match(labels[0], new RegExp(`${pendingCount}$`))
      assert.match(labels[1], new RegExp(`${expected.length}$`))
      assert.match(labels[2], new RegExp(`${expected.length}$`))
    }
    async function geometry() {
      await page.evaluate(() => document.fonts.ready)
      return page.evaluate(() => {
        const selectors = ['main', 'main h1', '.request-tabs', '.approval-table-filters', 'table', ...Array.from({ length: 3 }, (_, index) => `.request-tabs button:nth-child(${index + 1})`)]
        return selectors.map(selector => { const rect = document.querySelector(selector).getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width } })
      })
    }
    function assertAligned(before, after) {
      before.forEach((rect, index) => {
        for (const key of ['x', 'y', 'width']) assert.ok(Math.abs(rect[key] - after[index][key]) < 0.5, `Layout shifts at element ${index}: ${key} ${rect[key]} -> ${after[index][key]}`)
      })
    }
    await assertCounts()
    const allGeometry = await geometry()
    const allColumns = await page.locator('thead th').evaluateAll(cells => cells.map(cell => cell.getBoundingClientRect().width))
    await page.getByRole('button', { name: /กำลังดำเนินการ/ }).click()
    assert.equal(await page.locator('tbody tr td:nth-child(2) strong').count(), pendingCount)
    await assertCounts()
    assertAligned(allGeometry, await geometry())
    const activeColumns = await page.locator('thead th').evaluateAll(cells => cells.map(cell => cell.getBoundingClientRect().width))
    assert.deepEqual(activeColumns, allColumns, 'Table columns shift when filtering pending PRs')
    await page.getByRole('button', { name: /ประวัติคำขอ/ }).click()
    await page.getByRole('heading', { name: 'ประวัติคำขอ', exact: true }).waitFor()
    await assertCounts()
    assertAligned(allGeometry, await geometry())
    assert.deepEqual((await page.locator('tbody tr td:nth-child(2) strong').allTextContents()).sort(), expected.slice(0, 10).map(pr => pr.pr_no).sort(), 'History loses backend rows')
    assert.ok(!calls.some(path => /\/attachments\//.test(path)), 'History eagerly downloads attachment files')
    await page.getByRole('button', { name: /กำลังดำเนินการ/ }).click()
    assert.equal(await page.locator('tbody tr td:nth-child(2) strong').count(), pendingCount)
    assertAligned(allGeometry, await geometry())
    await page.locator('.request-tabs button').nth(2).click()
    await assertCounts()
    if (!live) {
      assert.ok(!calls.some(path => /^\/api\/pr\/P[^/]*$/.test(path)), 'List eagerly fetched PR details')
      // A failing detail/attachment endpoint must not prevent the list from loading.
      const before = calls.length
      await page.getByRole('button', { name: 'ดูรายละเอียด', exact: true }).first().click()
      await page.getByRole('alert').filter({ hasText: 'Detail unavailable' }).waitFor()
      assert.equal(await page.locator('tbody tr').count(), 3)
      assert.ok(calls.slice(before).includes('/api/pr/P0'))
      failDetail = false
      await page.getByRole('button', { name: 'ดูรายละเอียด', exact: true }).first().click()
      await page.locator('.requester-detail').waitFor()
      assert.equal(await page.locator('.requester-detail').getByText('Server item', { exact: true }).count(), 1)
      await page.getByRole('button', { name: 'คำขอของฉัน', exact: true }).click()
      await page.getByRole('status').filter({ hasText: 'กำลังโหลดคำขอ' }).waitFor({ state: 'hidden' })
      failList = true
      await page.getByRole('button', { name: 'หน้าหลัก', exact: true }).click()
      await page.getByRole('button', { name: 'คำขอของฉัน', exact: true }).click()
      await page.getByRole('alert').filter({ hasText: 'Backend temporarily unavailable' }).waitFor()
      assert.equal(await page.locator('tbody tr td:nth-child(2) strong').count(), expected.length, 'A refresh failure should preserve the last successful list with an error')
    }
    assert.deepEqual(errors, [])
    console.log(`PASS My Requests: ${expected.length} backend PRs; stable counts and layout across All, In process, History; ${live ? 'live API and database' : 'pagination, lazy details, and API failures'}`)
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
