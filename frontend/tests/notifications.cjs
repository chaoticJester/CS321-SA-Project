const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')

async function main() {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
  try {
    for (const role of ['requester', 'approver']) {
      const employee = { employee_id: role, full_name: 'Test User', position: 'Employee', department: 'IT', approval_level_id: role === 'approver' ? 'L1' : null }
      const storageKey = `sa-pr-read-notifications:${role}`
      const prs = ['pending', 'pending', 'pending', 'approved', 'rejected'].map((status, i) => ({ pr_id: `P${i}`, pr_no: `PR${i}`, requester_id: role, requester_name: 'Test User', status, job_name: `Test ${i}`, total_amount: 50, created_at: '2026-10-04', require_date: '2026-10-30', items: [], attachments: [] }))
      const context = await browser.newContext({ baseURL: process.env.APP_URL || 'http://127.0.0.1:5173', viewport: { width: 1440, height: 900 } })
      await context.addInitScript(employee => sessionStorage.setItem('sa-pr-session', JSON.stringify({ token: 'test', employee })), employee)
      await context.route('**/api/**', route => {
        const url = new URL(route.request().url())
        const path = url.pathname
        let body
        if (path.endsWith('pending-approvals')) body = prs.filter(pr => pr.status === 'pending')
        else if (path.endsWith('approval-history')) body = prs.filter(pr => pr.status !== 'pending').map(pr => ({ ...pr, decision: pr.status, approved_at: '2026-10-04', comment: '' }))
        else if (path === '/api/pr') {
          const filtered = url.searchParams.has('status') ? prs.filter(pr => url.searchParams.get('status').split(',').includes(pr.status)) : prs
          body = { data: filtered, pagination: { total: filtered.length, total_pages: 1, page: 1, limit: 100 } }
        } else if (path.endsWith('/status')) body = { chain: [] }
        else if (path.startsWith('/api/employees/')) body = employee
        else body = prs.find(pr => pr.pr_id === path.split('/')[3])
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
      })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      const badge = count => page.getByRole('button', { name: `${count} notifications`, exact: true })
      await page.goto('/')
      await badge(5).waitFor()
      assert.notEqual(await page.locator('main').first().evaluate(el => getComputedStyle(el).animationName), 'none')
      await badge(5).click()
      await page.locator('.notification-row').first().waitFor()
      assert.equal(await page.locator('.notification-row').count(), 5)
      assert.equal(await page.locator('.notification-row').first().evaluate(el => getComputedStyle(el).animationName), 'page-enter')
      await page.locator('.notification-request').first().click()
      await badge(4).waitFor()
      await badge(4).click()
      await page.locator('.notification-row.is-read').first().waitFor()
      assert.equal(await page.locator('.notification-row.is-read').count(), 1)
      await page.getByRole('button', { name: /ทำเครื่องหมายอ่านทั้งหมด/ }).click()
      await badge(0).waitFor()
      assert.equal(await page.locator('.notification-count').count(), 0)
      await page.getByRole('button', { name: /^ยังไม่อ่าน/ }).click()
      assert.equal(await page.locator('.notification-row').count(), 0)
      await page.reload()
      await page.getByRole('banner').waitFor()
      await badge(0).click()
      await page.locator('.notification-row').first().waitFor()
      assert.equal(await page.locator('.notification-row.is-read').count(), 5)
      // A later status is a new notification even when the old pending item was read.
      prs[0].status = 'approved'
      await page.reload()
      await badge(1).waitFor()
      await page.setViewportSize({ width: 390, height: 844 })
      const bounds = await badge(1).boundingBox()
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390)
      await badge(1).click()
      await page.locator('.notification-row').first().waitFor()
      await page.emulateMedia({ reducedMotion: 'reduce' })
      assert.equal(await page.locator('.notification-row').first().evaluate(el => getComputedStyle(el).animationName), 'none')
      // Native storage events keep another open tab in sync.
      const secondPage = await context.newPage()
      await secondPage.goto('/')
      await secondPage.evaluate(key => localStorage.removeItem(key), storageKey)
      await badge(5).waitFor()
      // Legacy requester read IDs and malformed storage remain safe.
      const legacyRead = role === 'requester' ? ['P0:approved:', 'P1:pending:1'] : ['P0:approved:2026-10-04', 'P1:pending']
      await secondPage.evaluate(({ key, read }) => localStorage.setItem(key, JSON.stringify(read)), { key: storageKey, read: legacyRead })
      await badge(3).waitFor()
      await secondPage.evaluate(key => localStorage.setItem(key, '{}'), storageKey)
      await badge(5).waitFor()
      assert.deepEqual(errors, [])
      await context.close()
      console.log(`PASS ${role}: unread 5 → 4 → 0; persisted reads, new status, cross-tab updates, legacy IDs, malformed storage, mobile layout and reduced motion`)
    }
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
