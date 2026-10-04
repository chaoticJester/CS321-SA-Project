import { useState } from 'react'
import { Auth } from './components/Auth'
import { RequesterLanding } from './features/requester/RequesterLanding'
import { ApproverLanding } from './features/approver/ApproverLanding'
import { clearSession, getSession } from './api'
import type { Employee } from './api'
import './App.css'
import './design.css'

export default function App() {
  const existing = getSession()
  const [employee, setEmployee] = useState<Employee | null>(existing?.employee || null)
  const [page, setPage] = useState<'auth' | 'requester' | 'approver'>(existing ? (existing.employee.approval_level_id ? 'approver' : 'requester') : 'auth')
  const signOut = () => { clearSession(); setEmployee(null); setPage('auth') }
  const signIn = (signedInEmployee: Employee) => { setEmployee(signedInEmployee); setPage(signedInEmployee.approval_level_id ? 'approver' : 'requester') }
  if (page === 'auth' || !employee) return <Auth onSignIn={signIn} />
  if (page === 'approver') return <ApproverLanding employee={employee} onSignOut={signOut} />
  return <RequesterLanding employee={employee} onSignOut={signOut} />
}
