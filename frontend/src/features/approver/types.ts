export type ApproverView = 'dashboard' | 'pending' | 'history' | 'all' | 'detail' | 'request-detail' | 'notifications'

export type ApprovalQueueItem = {
  id: string
  prId: string
  subject: string
  owner: string
  amount: string
  waiting: string
  overdue: boolean
}
