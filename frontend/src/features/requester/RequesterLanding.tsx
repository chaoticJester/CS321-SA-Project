import { useEffect, useState } from 'react'
import { listMyPrSummaries } from '../../api'
import type { Employee } from '../../api'
import type { Requisition } from '../../model'
import { readDraft } from '../../model'
import { MyRequestsPage } from './pages/MyRequestsPage'
import { PurchaseRequisitionPage } from './pages/PurchaseRequisitionPage'
import { RequestDetailPage } from './pages/RequestDetailPage'
import { RequesterDashboard } from './pages/RequesterDashboard'
import { RequestHistoryPage } from './pages/RequestHistoryPage'
import { RequesterNotificationsPage } from './pages/RequesterNotificationsPage'
import type { PageActions, RequesterView, RequestListState } from './types'
import { RequesterNotificationsProvider } from './RequesterNotificationsContext'

type RequesterLandingProps = {
  employee: Employee
  onSignOut: () => void
}

export function RequesterLanding({ employee, onSignOut }: RequesterLandingProps) {
  const [view, setView] = useState<RequesterView>('dashboard')
  const [selectedRequest, setSelectedRequest] = useState<Requisition | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const [requestList, setRequestList] = useState<RequestListState>({ requests: [], loading: true, error: '' })
  const showingList = ['active', 'requests', 'history'].includes(view)
  useEffect(() => {
    if (!showingList) return
    let active = true
    Promise.all([listMyPrSummaries(), readDraft().catch(() => undefined)])
      .then(([requests, draft]) => { if (active) setRequestList({ requests, draft, loading: false, error: '' }) })
      .catch(error => { if (active) setRequestList(previous => ({ ...previous, loading: false, error: error instanceof Error ? error.message : 'ไม่สามารถโหลดคำขอจากเซิร์ฟเวอร์ได้' })) })
    return () => { active = false }
  }, [requestVersion, showingList])

  const openDetail = (request: Requisition) => {
    setSelectedRequest(request)
    setView('detail')
  }
  const actions: PageActions = {
    onHome: () => setView('dashboard'),
    onActiveRequests: () => setView('active'),
    onMyRequests: () => setView('requests'),
    onHistory: () => setView('history'),
    onOpenDraft: () => setView('requisition'),
    onOpenDetail: openDetail,
    onSignOut,
    onNotifications: () => setView('notifications'),
  }

  const content = view === 'requisition'
    ? <PurchaseRequisitionPage employee={employee} onClose={actions.onHome} onSignOut={onSignOut} onSubmitted={() => setRequestVersion(version => version + 1)} onViewRequests={actions.onMyRequests} onTrackRequest={openDetail} onNotifications={actions.onNotifications} />
    : view === 'active' || view === 'requests' ? <MyRequestsPage key={view} {...actions} initialTab={view === 'active' ? 'active' : 'all'} requestList={requestList} />
    : view === 'history' ? <RequestHistoryPage {...actions} requestList={requestList} />
    : view === 'detail' && selectedRequest ? <RequestDetailPage {...actions} request={selectedRequest} />
    : view === 'notifications' ? <RequesterNotificationsPage {...actions} />
    : <RequesterDashboard onCreate={actions.onOpenDraft} onMyRequests={actions.onMyRequests} onSignOut={onSignOut} onNotifications={actions.onNotifications} />

  return <RequesterNotificationsProvider refreshKey={`${employee.employee_id}:${requestVersion}:${view}`}>
    {content}
  </RequesterNotificationsProvider>
}
