import { useState } from 'react'
import { Auth } from './components/Auth'
import { PurchaseRequisition } from './components/PurchaseRequisition'
import { RequesterLanding } from './components/RequesterLanding'
import { MyRequestsPage, PRHistoryPage, RequestDetailPage } from './components/RequesterPages'
import { ApproverLanding } from './components/ApproverLanding'
import type { Requisition } from './model'
import { clearSession, getSession } from './api'
import type { Employee } from './api'
import './App.css'

export default function App() {
  const existing = getSession()
  const [employee, setEmployee] = useState<Employee | null>(existing?.employee || null)
  const [page, setPage] = useState<'auth' | 'requester' | 'requisition' | 'active-requests' | 'my-requests' | 'pr-history' | 'request-detail' | 'approver'>(existing ? (existing.employee.approval_level_id ? 'approver' : 'requester') : 'auth')
  const [selectedRequest, setSelectedRequest] = useState<Requisition | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const signOut = () => { clearSession(); setEmployee(null); setPage('auth') }
  const signIn = (signedInEmployee: Employee) => { setEmployee(signedInEmployee); setPage(signedInEmployee.approval_level_id ? 'approver' : 'requester') }
  const openDetail = (request: Requisition) => { setSelectedRequest(request); setPage('request-detail') }
  const pageActions = { onHome: () => setPage('requester'), onActiveRequests: () => setPage('active-requests'), onMyRequests: () => setPage('my-requests'), onHistory: () => setPage('pr-history'), onOpenDraft: () => setPage('requisition'), onOpenDetail: openDetail, onSignOut: signOut }
  if (page === 'auth' || !employee) return <Auth onSignIn={signIn} />
  if (page === 'approver') return <ApproverLanding employee={employee} onSignOut={signOut} />
  if (page === 'requisition') return <PurchaseRequisition employee={employee} onClose={() => setPage('requester')} onSignOut={signOut} onSubmitted={request => { setSelectedRequest(request); setRequestVersion(version => version + 1) }} onViewRequests={() => setPage('my-requests')} />
  if (page === 'active-requests') return <MyRequestsPage {...pageActions} initialTab="active" requestVersion={requestVersion} />
  if (page === 'my-requests') return <MyRequestsPage {...pageActions} requestVersion={requestVersion} />
  if (page === 'pr-history') return <PRHistoryPage {...pageActions} />
  if (page === 'request-detail' && selectedRequest) return <RequestDetailPage {...pageActions} request={selectedRequest} />
  return <RequesterLanding onCreate={() => setPage('requisition')} onMyRequests={() => setPage('my-requests')} onOpenDetail={openDetail} onSignOut={signOut} />
}
