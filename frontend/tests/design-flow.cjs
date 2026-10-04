const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs/promises')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')

// Exercise the UI against deterministic API responses without changing the database.
async function main() {
  const output = process.env.VERIFY_OUTPUT || path.join(require('node:os').tmpdir(), 'sa-pr-design-check')
  await fs.mkdir(output, { recursive: true })
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 }, reducedMotion: 'reduce' })
  const requester = { employee_id: 'E0020', full_name: 'Amika R.', position: 'พนักงาน', department: 'Technology Development', approval_level_id: null }
  const approver = { employee_id: 'E0018', full_name: 'Chatchai P.', position: 'Manager', department: 'Technology Development', approval_level_id: 'L2' }
  const prs = ['pending', 'pending', 'approved', 'rejected'].map((status, index) => ({
    pr_id: 'P' + index, pr_no: 'IT-0' + (26 - index) + '-PR', requester_id: requester.employee_id,
    requester_name: requester.full_name, requester_department: requester.department,
    require_date: '2026-10-30T00:00:00Z', created_at: '2026-09-21T09:42:00Z',
    job_name: ['Notebook สำหรับทีม IT', 'อุปกรณ์สำนักงาน', 'อุปกรณ์เครือข่าย', 'เครื่องพิมพ์สำนักงาน'][index],
    purpose: 'ทดแทนเครื่องเก่าของทีม IT', asset_type: 'Investment Budget', vendor_name: 'ABC Company',
    status, total_amount: 57000, items: [{ item_id: 'I' + index, description: 'HP ProBook 440 G10', qty: 3, unit: 'เครื่อง', unit_price: '19000' }], attachments: [],
  }))
  let pending = prs.filter(pr => pr.status === 'pending')
  const history = prs.filter(pr => pr.status !== 'pending').map(pr => ({ ...pr, decision: pr.status, approved_at: '2026-09-22T10:24:00Z', comment: pr.status === 'rejected' ? 'งบประมาณไม่เพียงพอ' : null }))
  const errors = []
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/api/**', async route => {
    const req = route.request()
    const url = new URL(req.url())
    let body
    let status = 200
    if (url.pathname === '/api/auth/login') {
      const data = req.postDataJSON()
      if (data.passcode !== '123456') { status = 401; body = { message: 'Invalid credentials' } }
      else body = { token: 'test-token', employee: data.employee_id === 'E0018' ? approver : requester }
    } else if (url.pathname.endsWith('/notification-count')) body = { count: 3 }
    else if (url.pathname === '/api/pr' && req.method() === 'GET') body = { data: prs, pagination: { page: 1, limit: 100, total: prs.length, total_pages: 1 } }
    else if (url.pathname === '/api/pr' && req.method() === 'POST') {
      const data = req.postDataJSON()
      assert.equal(data.items.length, 1, 'Inherited budget code must not submit the empty trailing row')
      const saved = { ...prs[0], ...data, pr_id: 'P4', pr_no: 'IT-027-PR', items: data.items.map((item, index) => ({ ...item, item_id: 'NEW' + index })) }
      prs.push(saved); pending.push(saved); body = { pr_id: 'P4' }; status = 201
    } else if (url.pathname.endsWith('/pending-approvals')) body = pending
    else if (url.pathname.endsWith('/approval-history')) body = history
    else if (url.pathname.startsWith('/api/employees/')) body = requester
    else if (url.pathname.endsWith('/approve')) {
      const data = req.postDataJSON()
      if (data.passcode !== '123456') { status = 401; body = { message: 'Invalid passcode' } }
      else { const id = url.pathname.split('/')[3]; pending = pending.filter(item => item.pr_id !== id); body = { message: 'Approved', pr_id: id, current_level: 'L3', is_final: false } }
    } else if (url.pathname.endsWith('/reject')) {
      const id = url.pathname.split('/')[3]; pending = pending.filter(item => item.pr_id !== id); body = { message: 'Rejected', pr_id: id }
    } else if (url.pathname.endsWith('/status')) {
      const pr = prs.find(pr => pr.pr_id === url.pathname.split('/')[3])
      body = { pr_id: pr.pr_id, pr_no: pr.pr_no, pr_status: pr.status, total: 4, chain: [1, 2, 3, 4].map((number, index) => ({ sequence_order: number, level_name: ['Senior Chief', 'Manager', 'General Manager', 'FGM.'][index], approver_id: index === 1 ? 'E0018' : 'A' + index, approver_name: ['Anan S.', 'Chatchai P.', 'Krisana V.', 'Suwat T.'][index], status: pr.status === 'approved' || index === 0 ? 'approved' : pr.status === 'rejected' && index === 1 ? 'rejected' : 'pending', approved_at: index === 0 ? '2026-09-21T09:45:00Z' : null, comment: pr.status === 'rejected' ? 'งบประมาณไม่เพียงพอ' : null })) }
    } else if (url.pathname.startsWith('/api/pr/')) body = prs.find(pr => pr.pr_id === url.pathname.split('/')[3])
    else { status = 404; body = { message: 'Unexpected API route: ' + url.pathname }; errors.push(body.message) }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  })
  async function capture(name) {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    assert.ok(await page.locator('main, main *').evaluateAll(elements => elements.some(element => element.getBoundingClientRect().width > 0 && getComputedStyle(element).animationName !== 'none')), 'Missing page motion on ' + name)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true })
    const broken = await page.locator('img').evaluateAll(images => images.filter(image => !image.complete || !image.naturalWidth).map(image => image.src))
    assert.deepEqual(broken, [], 'Broken assets on ' + name)
    assert.equal(await page.locator('vite-error-overlay').count(), 0)
    console.log('PASS ' + name)
  }
  async function login(id) {
    await page.getByLabel('Employee ID', { exact: true }).fill(id)
    await page.getByLabel('Password', { exact: true }).fill('123456')
    await page.getByRole('button', { name: 'เข้าสู่ระบบ / SIGN IN', exact: true }).click()
  }
  async function choose(label, option) {
    await page.getByRole('button', { name: label, exact: true }).click()
    await page.getByRole('option').filter({ hasText: option }).first().click()
  }
  try {
    await page.goto(process.env.APP_URL || 'http://127.0.0.1:5173')
    await capture('login-id')
    await page.getByRole('button', { name: 'อีเมลบริษัท / Email' }).click(); await capture('login-email')
    await page.getByRole('button', { name: 'ลืมรหัสผ่าน? / Forgot' }).click(); await capture('forgot-password')
    await page.getByRole('button', { name: 'ย้อนกลับไปหน้าเข้าสู่ระบบ' }).click()
    await page.getByLabel('Employee ID', { exact: true }).fill('bad')
    await page.getByLabel('Password', { exact: true }).fill('bad')
    await page.getByRole('button', { name: 'เข้าสู่ระบบ / SIGN IN', exact: true }).click()
    await page.getByRole('button', { name: 'ลองอีกครั้ง / TRY AGAIN' }).waitFor()
    await capture('login-error')
    await page.reload(); await login('E0020')
    await page.locator('.home-request-card').first().waitFor()
    assert.equal(await page.locator('.home-request-card').count(), 2)
    assert.equal(await page.locator('.home-request-card').filter({ hasText: 'IT-024-PR' }).count(), 0)
    await capture('requester-home')
    await page.getByRole('button', { name: 'ดูตัวอย่าง PDF' }).first().click(); await page.getByRole('dialog', { name: 'ตัวอย่างใบขอสั่งซื้อ' }).waitFor(); await capture('requester-pdf')
    await page.getByRole('button', { name: 'Zoom in' }).click()
    assert.match(await page.locator('.pdf-zoom').innerText(), /110/)
    await page.getByRole('button', { name: 'ปิดตัวอย่าง', exact: true }).click()
    await page.getByRole('button', { name: '4 notifications', exact: true }).click()
    await page.locator('.notification-row').first().waitFor(); await capture('requester-notifications')
    await page.getByRole('button', { name: '✓ ทำเครื่องหมายอ่านทั้งหมด' }).click()
    await page.getByRole('button', { name: /ยังไม่อ่าน/ }).click()
    assert.equal(await page.locator('.notification-row').count(), 0)
    await page.getByRole('button', { name: 'คำขอของฉัน', exact: true }).click()
    await page.locator('tbody tr').first().waitFor(); await capture('my-requests')
    await page.getByRole('button', { name: 'ดูรายละเอียด', exact: true }).first().click(); await page.locator('.requester-detail').waitFor(); await capture('requester-detail')
    await page.getByRole('button', { name: /^คำขอของฉัน.*\// }).click()
    await page.getByRole('button', { name: /ประวัติคำขอ/ }).click()
    await page.locator('tbody tr').first().waitFor(); await capture('request-history')
    await page.getByRole('button', { name: 'หน้าหลัก', exact: true }).click()
    await page.getByRole('button', { name: 'สร้างคำขอ', exact: true }).click()
    await page.getByRole('heading', { name: 'Purchase Requisition (PR) / ใบขอสั่งซื้อสินค้า' }).waitFor(); await capture('create-basic')
    await page.getByLabel('Jobs Name/ชื่องาน', { exact: true }).fill('Notebook')
    await choose('Main Group/กลุ่มสินค้าหลัก', 'General Adm')
    await choose('Budget Type/ชนิดงบประมาณ', 'Investment Budget')
    await choose('Budget Code/งบประมาณเลขที่', '26-23-ADM-072')
    await page.getByLabel('Require Date/วันที่ต้องการของ', { exact: true }).fill('2026-10-30')
    await page.getByLabel('Purpose/วัตถุประสงค์', { exact: true }).fill('ทดแทนเครื่องเก่า')
    await page.getByRole('button', { name: 'Next', exact: true }).click(); await capture('create-items-empty')
    assert.equal(await page.getByLabel('Budget Code 1', { exact: true }).innerText(), '26-23-ADM-072')
    assert.equal(await page.getByRole('combobox', { name: 'Budget Code 1', exact: true }).count(), 0)
    await page.getByRole('button', { name: 'Next', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: 'Add at least one item' }).waitFor()
    await page.getByLabel('Name 1', { exact: true }).fill('Notebook')
    await page.getByLabel('QTY 1', { exact: true }).fill('3')
    await page.getByLabel('Unit 1', { exact: true }).fill('เครื่อง')
    await page.getByLabel('Unit Price 1', { exact: true }).fill('19000')
    await page.getByRole('button', { name: 'Add item 1' }).click(); await capture('create-items-filled')
    assert.equal(await page.getByLabel('Budget Code 2', { exact: true }).innerText(), '26-23-ADM-072')
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await choose('Budget Code/งบประมาณเลขที่', '26-23-ADM-073')
    await page.getByRole('button', { name: 'Next', exact: true }).click()
    assert.equal(await page.getByLabel('Budget Code 1', { exact: true }).innerText(), '26-23-ADM-073')
    assert.equal(await page.getByLabel('Budget Code 2', { exact: true }).innerText(), '26-23-ADM-073')
    await page.getByRole('button', { name: 'Save Draft', exact: true }).click()
    await page.getByRole('status').filter({ hasText: 'Draft saved on this device' }).waitFor()
    await page.reload()
    await page.getByRole('button', { name: 'สร้างคำขอ', exact: true }).click()
    await page.getByLabel('Budget Code 1', { exact: true }).waitFor()
    assert.equal(await page.getByLabel('Budget Code 1', { exact: true }).innerText(), '26-23-ADM-073')
    assert.equal(await page.getByLabel('Budget Code 2', { exact: true }).innerText(), '26-23-ADM-073')
    await page.getByRole('button', { name: 'Next', exact: true }).click(); await capture('create-attachments')
    assert.equal(await page.getByLabel('Document No.', { exact: true }).count(), 0)
    await choose('Purchaser Section', 'PURCHASING 1')
    await page.getByRole('button', { name: 'Next', exact: true }).click(); await capture('create-review')
    await page.getByRole('button', { name: 'View PDF', exact: true }).click(); await capture('draft-pdf')
    await page.getByRole('button', { name: 'ปิดหน้าต่าง', exact: true }).click()
    await page.getByRole('button', { name: 'Submit', exact: true }).click()
    await page.getByRole('dialog', { name: 'ส่งคำขอสำเร็จ' }).waitFor(); await capture('submit-success')
    await page.getByRole('button', { name: '→ ติดตามคำขอ', exact: true }).click()
    assert.match(await page.getByRole('heading', { name: 'IT-027-PR', exact: true }).innerText(), /IT-027-PR/)
    await page.getByRole('button', { name: 'Log out', exact: true }).click(); await login('E0018')
    await page.locator('.dashboard-queue-row').first().waitFor(); await capture('approver-dashboard')
    await page.getByRole('button', { name: /รายการที่รออนุมัติ/ }).click()
    await page.locator('tbody tr').first().waitFor(); await capture('approval-pending')
    await page.getByRole('button', { name: /ประวัติการอนุมัติ/ }).click()
    await page.locator('tbody tr').first().waitFor(); await capture('approval-history')
    await page.getByRole('button', { name: '◉ ดูรายละเอียด', exact: true }).first().click(); await capture('approval-readonly-detail')
    await page.getByRole('button', { name: /รายการที่รออนุมัติ/ }).click()
    await page.getByRole('button', { name: '◉ พิจารณา', exact: true }).first().click()
    await page.locator('.decision-panel').waitFor(); await capture('approval-review')
    await page.getByRole('button', { name: 'อนุมัติ', exact: true }).click(); await capture('approval-signature')
    await page.getByLabel('Approval passcode').fill('111111')
    await page.getByRole('button', { name: 'ติดตามและลงลายเซ็น', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: 'Invalid passcode' }).waitFor()
    assert.equal(await page.getByRole('dialog', { name: 'ลงลายเซ็นอิเล็กทรอนิก' }).count(), 1)
    await page.getByLabel('Approval passcode').fill('123456')
    await page.getByRole('button', { name: 'ติดตามและลงลายเซ็น', exact: true }).click()
    await page.locator('.signature-success').waitFor(); await capture('approval-signed')
    assert.equal(await page.getByRole('dialog').count(), 0)
    await page.getByRole('button', { name: /notifications/ }).click()
    await page.locator('.notification-row').first().waitFor(); await capture('approver-notifications')
    await page.setViewportSize({ width: 390, height: 844 }); await capture('mobile-notifications')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Mobile page overflows')
    assert.deepEqual(errors, [], 'Runtime errors')
    console.log('PASS all design flows; output: ' + output)
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
