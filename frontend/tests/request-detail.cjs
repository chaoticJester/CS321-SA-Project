const assert = require('node:assert/strict')
const path = require('node:path')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')

async function main() {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
  try {
    const employee = { employee_id: 'requester', full_name: 'Test User', position: 'Employee', department: 'IT', approval_level_id: null }
    const pr = { pr_id: 'P1', pr_no: 'PR-001', requester_id: employee.employee_id, status: 'pending', job_name: 'Notebook สำหรับทีม IT', purpose: 'ทดแทนเครื่องเดิมของทีม IT', asset_type: 'Investment Budget', total_amount: 110000, created_at: '2026-10-01', require_date: '2026-10-01', attachments: [], items: [{ item_id: 'I1', description: 'Notebook HP รุ่น 123456', qty: 5, unit: 'เครื่อง', unit_price: '22000.00' }] }
    const context = await browser.newContext({ baseURL: process.env.APP_URL || 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1024 }, reducedMotion: 'reduce' })
    await context.addInitScript(employee => sessionStorage.setItem('sa-pr-session', JSON.stringify({ token: 'test', employee })), employee)
    await context.route('**/api/**', route => {
      const pathname = new URL(route.request().url()).pathname
      const body = pathname === '/api/pr' ? { data: [pr], pagination: { total: 1, total_pages: 1, page: 1, limit: 100 } } : pathname.endsWith('/status') ? { chain: [] } : pathname.startsWith('/api/employees/') ? employee : pr
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    async function openDetail() {
      await page.goto('/')
      await page.getByRole('button', { name: 'คำขอของฉัน', exact: true }).click()
      await page.getByRole('button', { name: 'ดูรายละเอียด', exact: true }).click()
      await page.locator('.request-summary').waitFor()
    }
    await openDetail()
    const summary = page.locator('.request-summary')
    assert.match(await summary.innerText(), /1 ตุลาคม 2569/)
    assert.deepEqual(await summary.locator('tbody td').allTextContents(), ['Notebook HP รุ่น 123456', '5', '22,000.00', '110,000.00'])
    assert.equal(await summary.locator('.request-summary-total > span > strong').innerText(), '110,000.00')
    await summary.screenshot({ path: path.join(require('node:os').tmpdir(), 'request-summary-reference.png') })
    pr.items = [
      { item_id: 'I1', description: 'Item A', qty: 1, unit: 'ชิ้น', unit_price: '5.50' },
      { item_id: 'I2', description: 'Item B', qty: 2, unit: 'เครื่อง', unit_price: '20,000.00' },
    ]
    await openDetail()
    assert.deepEqual(await summary.locator('tbody td.number').allTextContents(), ['5.50', '5.50', '20,000.00', '40,000.00'])
    assert.equal(await summary.locator('.request-summary-total > span > strong').innerText(), '40,005.50')
    await summary.screenshot({ path: path.join(require('node:os').tmpdir(), 'request-summary-multiple.png') })
    pr.items = [
      { item_id: 'I1', description: 'Item A', qty: 3, unit: 'ชิ้น', unit_price: '0.10' },
      { item_id: 'I2', description: 'Item B', qty: 2, unit: 'ชิ้น', unit_price: '0.20' },
    ]
    await openDetail()
    assert.deepEqual(await summary.locator('tbody td.number').allTextContents(), ['0.10', '0.30', '0.20', '0.40'])
    assert.equal(await summary.locator('.request-summary-total > span > strong').innerText(), '0.70')
    await page.setViewportSize({ width: 390, height: 844 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    assert.deepEqual(errors, [])
    console.log('PASS request summary: Thai date, quantity-only display, 5 × 22,000 = 110,000; multiple items total 40,005.50; comma prices, decimal rounding and mobile layout')
    await context.close()
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
