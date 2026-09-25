import { useState } from 'react'
import { Auth } from './components/Auth'
import { PurchaseRequisition } from './components/PurchaseRequisition'
import { RequesterLanding } from './components/RequesterLanding'
import { MyRequestsPage, PRHistoryPage, RequestDetailPage } from './components/RequesterPages'
import { ApproverLanding } from './components/ApproverLanding'
import type { Requisition } from './model'
import './App.css'

export default function App() {
  const [page, setPage] = useState<'auth' | 'requester' | 'requisition' | 'active-requests' | 'my-requests' | 'pr-history' | 'request-detail' | 'approver'>('auth')
  const [selectedRequest, setSelectedRequest] = useState<Requisition | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const signOut = () => setPage('auth')
  const openDetail = (request: Requisition) => { setSelectedRequest(request); setPage('request-detail') }
  const pageActions = { onHome: () => setPage('requester'), onActiveRequests: () => setPage('active-requests'), onMyRequests: () => setPage('my-requests'), onHistory: () => setPage('pr-history'), onOpenDraft: () => setPage('requisition'), onOpenDetail: openDetail, onSignOut: signOut }
  if (page === 'auth') return <Auth onSignIn={role => setPage(role === 'approver' ? 'approver' : 'requester')} />
  if (page === 'approver') return <ApproverLanding onSignOut={signOut} />
  if (page === 'requisition') return <PurchaseRequisition onClose={() => setPage('requester')} onSignOut={signOut} onSubmitted={request => { setSelectedRequest(request); setRequestVersion(version => version + 1) }} onViewRequests={() => setPage('my-requests')} />
  if (page === 'active-requests') return <MyRequestsPage {...pageActions} initialTab="active" requestVersion={requestVersion} />
  if (page === 'my-requests') return <MyRequestsPage {...pageActions} requestVersion={requestVersion} />
  if (page === 'pr-history') return <PRHistoryPage {...pageActions} />
  if (page === 'request-detail' && selectedRequest) return <RequestDetailPage {...pageActions} request={selectedRequest} />
  return <RequesterLanding onCreate={() => setPage('requisition')} onMyRequests={() => setPage('my-requests')} onSignOut={signOut} />
}
