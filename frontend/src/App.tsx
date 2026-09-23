import { useState } from 'react'
import { Auth } from './components/Auth'
import { PurchaseRequisition } from './components/PurchaseRequisition'
import { RequesterLanding } from './components/RequesterLanding'
import { MyRequestsPage, PRHistoryPage } from './components/RequesterPages'
import './App.css'

export default function App() {
  const [page, setPage] = useState<'auth' | 'requester' | 'requisition' | 'active-requests' | 'my-requests' | 'pr-history'>('auth')
  const signOut = () => setPage('auth')
  const pageActions = { onHome: () => setPage('requester'), onActiveRequests: () => setPage('active-requests'), onMyRequests: () => setPage('my-requests'), onHistory: () => setPage('pr-history'), onOpenDraft: () => setPage('requisition'), onSignOut: signOut }
  if (page === 'auth') return <Auth onSignIn={() => setPage('requester')} />
  if (page === 'requisition') return <PurchaseRequisition onClose={() => setPage('requester')} onSignOut={signOut} />
  if (page === 'active-requests') return <MyRequestsPage {...pageActions} initialTab="active" />
  if (page === 'my-requests') return <MyRequestsPage {...pageActions} />
  if (page === 'pr-history') return <PRHistoryPage {...pageActions} />
  return <RequesterLanding onCreate={() => setPage('requisition')} onMyRequests={() => setPage('my-requests')} onSignOut={signOut} />
}
