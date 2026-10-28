import type { Requisition } from './model'

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
const SESSION_KEY = 'sa-pr-session'

export type Employee = {
  employee_id: string
  full_name: string
  position: string | null
  department: string | null
  approval_level_id: string | null
}

type Session = { token: string; employee: Employee }

export type ApprovalStep = {
  sequence_order: number
  level_name: string
  approver_id: string
  approver_name: string
  position: string | null
  department: string | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  comment: string | null
  approved_at: string | null
}

export type ApprovalStatus = {
  pr_id: string
  pr_no: string
  pr_status: 'pending' | 'approved' | 'rejected'
  total: number
  chain: ApprovalStep[]
}

type ApiPr = {
  pr_id: string
  pr_no: string
  requester_id: string
  require_date: string
  job_name: string | null
  purpose: string | null
  asset_type: string | null
  budget_code?: string | null
  vendor_name: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  total_amount: number
  items: Array<{ item_id: string; description: string; qty: number; unit: string | null; unit_price: string }>
  attachments?: Array<{ attachment_id: string; file_type: string; file_path: string; file_name: string | null }>
}

export type PendingApproval = {
  pr_id: string
  pr_no: string
  job_name: string | null
  requester_id: string
  requester_name: string
  created_at: string
  total_amount: number | string
  require_date?: string
  requester_department?: string | null
  asset_type?: string | null
  // Where this approver sits in the PR's chain (pending list only).
  current_level?: number
  total_levels?: number
}

export type ApprovalHistoryItem = PendingApproval & {
  decision: 'approved' | 'rejected'
  comment: string | null
  approved_at: string
}

export function getSession(): Session | null {
  try {
    const value = sessionStorage.getItem(SESSION_KEY)
    return value ? JSON.parse(value) as Session : null
  } catch {
    return null
  }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = getSession()
  const headers = new Headers(init.headers)
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (session) headers.set('Authorization', `Bearer ${session.token}`)
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  const body = await response.json().catch(() => ({})) as { message?: string }
  if (!response.ok) throw new Error(body.message || `Request failed (${response.status})`)
  return body as T
}

export async function login(employeeId: string, passcode: string): Promise<Session> {
  const session = await request<Session>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ employee_id: employeeId, passcode }),
  })
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

function toRequisition(pr: ApiPr, approval?: ApprovalStatus): Requisition {
  return {
    basic: {
      job: pr.job_name || '',
      mainGroup: '',
      budgetType: pr.asset_type || '',
      requiredDate: pr.require_date.slice(0, 10),
      budgetCode: pr.budget_code || '',
      purpose: pr.purpose || '',
      line: '',
      description: '',
      currency: 'THB',
    },
    items: (pr.items || []).map(item => ({
      id: item.item_id,
      budgetCode: pr.budget_code || '',
      name: item.description,
      brand: '',
      model: '',
      detail: '',
      quantity: String(item.qty),
      unit: item.unit || '',
      price: String(item.unit_price),
    })),
    attachments: [],
    attachmentInfo: { documentType: '', documentNo: '', documentDate: '' },
    purchaser: pr.vendor_name || '',
    remark: '',
    step: 4,
    createdAt: pr.created_at,
    reference: pr.pr_no,
    backendId: pr.pr_id,
    status: pr.status,
    approval,
  }
}

export async function getPr(prId: string): Promise<Requisition> {
  const [pr, approval] = await Promise.all([
    request<ApiPr>(`/pr/${encodeURIComponent(prId)}`),
    request<ApprovalStatus>(`/pr/${encodeURIComponent(prId)}/status`),
  ])
  const value = toRequisition(pr, approval)
  const [requester, attachments] = await Promise.all([
    request<Employee>(`/employees/${encodeURIComponent(pr.requester_id)}`),
    Promise.all((pr.attachments || []).map(async attachment => {
      const session = getSession()
      const response = await fetch(`${API_BASE}/pr/${encodeURIComponent(prId)}/attachments/${encodeURIComponent(attachment.attachment_id)}/download`, { headers: session ? { Authorization: `Bearer ${session.token}` } : {} })
      if (!response.ok) throw new Error('ไม่สามารถโหลดเอกสารแนบได้')
      const blob = await response.blob()
      return { id: attachment.attachment_id, file: new File([blob], attachment.file_name || attachment.file_path, { type: attachment.file_type }) }
    })),
  ])
  return { ...value, requester, attachments }
}

async function listMyPrRows(statuses: ApiPr['status'][] = []) {
  type PrListResponse = {
    data: Array<Omit<ApiPr, 'items'> & { items?: ApiPr['items'] }>
    pagination: { page: number; limit: number; total: number; total_pages: number }
  }

  const params = new URLSearchParams({ limit: '100' })
  if (statuses.length) params.set('status', statuses.join(','))
  const firstPage = await request<PrListResponse>(`/pr?${params}`)
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, firstPage.pagination.total_pages - 1) }, (_, index) =>
      request<PrListResponse>(`/pr?${params}&page=${index + 2}`),
    ),
  )
  return [firstPage, ...remainingPages].flatMap(result => result.data)
}

// The table needs only the list response; do not download every PR's attachments.
export async function listMyPrSummaries(statuses: ApiPr['status'][] = []): Promise<Requisition[]> {
  const rows = await listMyPrRows(statuses)
  return rows.map(row => toRequisition({ ...row, items: [] }))
}

export async function listMyPrs(): Promise<Requisition[]> {
  const rows = await listMyPrRows()
  return Promise.all(rows.map(async row => {
    const approval = await getPrApproval(row.pr_id)
    return toRequisition({ ...row, items: [] }, approval)
  }))
}

// The PDF endpoint needs the Authorization header, so it cannot be used as an <iframe src> directly.
export function getPrPdf(prId: string): Promise<Blob> {
  return requestPdf(`/pr/${encodeURIComponent(prId)}/pdf`)
}

// A PR that has not been submitted yet; the server renders it without saving.
export function getDraftPrPdf(value: Requisition): Promise<Blob> {
  return requestPdf('/pr/pdf-preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toPrBody(value)) })
}

async function requestPdf(path: string, init: RequestInit = {}): Promise<Blob> {
  const session = getSession()
  const headers = new Headers(init.headers)
  if (session) headers.set('Authorization', `Bearer ${session.token}`)
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string }
    throw new Error(body.message || 'ไม่สามารถโหลดไฟล์ PDF ได้')
  }
  return response.blob()
}

export function savePdf(blob: Blob, reference: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${reference.replace(/[^A-Za-z0-9._-]/g, '_') || 'PR'}.pdf`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export async function downloadPrPdf(prId: string, reference: string) {
  savePdf(await getPrPdf(prId), reference)
}

export function getPrApproval(prId: string) {
  return request<ApprovalStatus>(`/pr/${encodeURIComponent(prId)}/status`)
}

export async function getMyNotificationCount(): Promise<number> {
  const result = await request<{ count: number }>('/pr/notification-count')
  return Number.isFinite(result.count) ? Math.max(0, result.count) : 0
}

// Body of POST /api/pr, also accepted by POST /api/pr/pdf-preview.
function toPrBody(value: Requisition) {
  return {
    require_date: value.basic.requiredDate,
    job_name: value.basic.job,
    purpose: value.basic.purpose,
    asset_type: value.basic.budgetType || value.basic.mainGroup,
    budget_code: value.basic.budgetCode,
    vendor_name: value.purchaser,
    items: value.items.map(item => ({
      description: [item.name, item.brand, item.model, item.detail].filter(Boolean).join(' · '),
      qty: Number(item.quantity),
      unit: item.unit,
      unit_price: Number(item.price),
    })),
  }
}

export type PrNumberReservation = { reservation_id: string; pr_no: string }

export function reservePrNumber() {
  return request<PrNumberReservation>('/pr/number-reservations', { method: 'POST' })
}

export async function createPr(value: Requisition): Promise<Requisition> {
  const send = (reservationId: string) => request<{ pr_id: string }>('/pr', {
    method: 'POST',
    body: JSON.stringify({ ...toPrBody(value), reservation_id: reservationId }),
  })
  let result: { pr_id: string }
  try {
    result = await send(value.reservationId || (await reservePrNumber()).reservation_id)
  } catch (error) {
    // A restored draft may hold a reservation that was already used or belongs to another user.
    if (!(error instanceof Error && /reservation/i.test(error.message))) throw error
    result = await send((await reservePrNumber()).reservation_id)
  }

  for (const attachment of value.attachments) {
    const form = new FormData()
    form.append('file', attachment.file)
    await request(`/pr/${encodeURIComponent(result.pr_id)}/attachments`, { method: 'POST', body: form })
  }

  const saved = await getPr(result.pr_id)
  return { ...saved, basic: { ...saved.basic, budgetCode: value.basic.budgetCode, mainGroup: value.basic.mainGroup, line: value.basic.line, description: value.basic.description }, attachments: value.attachments, attachmentInfo: value.attachmentInfo, remark: value.remark }
}

export function getPendingApprovals(employeeId: string) {
  return request<PendingApproval[]>(`/employees/${encodeURIComponent(employeeId)}/pending-approvals`)
}

export function getApprovalHistory(employeeId: string) {
  return request<ApprovalHistoryItem[]>(`/employees/${encodeURIComponent(employeeId)}/approval-history`)
}

export function approvePr(prId: string, passcode: string) {
  return request<{ message: string; pr_id: string; current_level: string; is_final: boolean }>(`/pr/${encodeURIComponent(prId)}/approve`, {
    method: 'POST',
    body: JSON.stringify({ passcode }),
  })
}

export function rejectPr(prId: string, reason: string) {
  return request<{ message: string; pr_id: string }>(`/pr/${encodeURIComponent(prId)}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}
