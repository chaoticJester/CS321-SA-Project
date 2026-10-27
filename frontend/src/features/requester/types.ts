import type { Requisition } from '../../model'

export type RequesterView = 'dashboard' | 'requisition' | 'active' | 'requests' | 'history' | 'detail' | 'notifications'

export type PageActions = {
  onHome: () => void
  onActiveRequests: () => void
  onMyRequests: () => void
  onHistory: () => void
  onOpenDraft: () => void
  onOpenDetail: (request: Requisition) => void
  onSignOut: () => void
  onNotifications: () => void
}

export type RequestListState = {
  requests: Requisition[]
  draft?: Requisition
  loading: boolean
  error: string
}

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'draft'

export type RequestRow = {
  id: string
  title: string
  budget: string
  date: string
  status: RequestStatus
  statusText: string
  action: string
  request?: Requisition
}
