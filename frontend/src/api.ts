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
  vendor_name: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  total_amount: number
  items: Array<{ item_id: string; description: string; qty: number; unit: string | null; unit_price: string }>
}

export type PendingApproval = {
  pr_id: string
  pr_no: string
  job_name: string | null
  requester_id: string
  requester_name: string
  created_at: string
  total_amount: number | string
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
      budgetCode: '',
      purpose: pr.purpose || '',
      line: '',
      description: '',
      currency: 'THB',
    },
    items: (pr.items || []).map(item => ({
      id: item.item_id,
      budgetCode: '',
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
  return toRequisition(pr, approval)
}

export async function listMyPrs(): Promise<Requisition[]> {
  type PrListResponse = {
    data: Array<Omit<ApiPr, 'items'> & { items?: ApiPr['items'] }>
    pagination: { page: number; limit: number; total: number; total_pages: number }
  }

  const firstPage = await request<PrListResponse>('/pr?limit=100')
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, firstPage.pagination.total_pages - 1) }, (_, index) =>
      request<PrListResponse>(`/pr?page=${index + 2}&limit=100`),
    ),
  )
  const rows = [firstPage, ...remainingPages].flatMap(result => result.data)

  return Promise.all(rows.map(row => getPr(row.pr_id)))
}

export async function createPr(value: Requisition): Promise<Requisition> {
  const result = await request<{ pr_id: string }>('/pr', {
    method: 'POST',
    body: JSON.stringify({
      require_date: value.basic.requiredDate,
      job_name: value.basic.job,
      purpose: value.basic.purpose,
      asset_type: value.basic.budgetType || value.basic.mainGroup,
      vendor_name: value.purchaser,
      items: value.items.map(item => ({
        description: [item.name, item.brand, item.model, item.detail].filter(Boolean).join(' · '),
        qty: Number(item.quantity),
        unit: item.unit,
        unit_price: Number(item.price),
      })),
    }),
  })

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
