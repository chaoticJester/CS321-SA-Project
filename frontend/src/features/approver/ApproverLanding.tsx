import { useEffect, useState } from 'react'
import { approvePr, getApprovalHistory, getPendingApprovals, getPr, rejectPr } from '../../api'
import type { ApprovalHistoryItem, Employee, PendingApproval } from '../../api'
import type { Requisition } from '../../model'
import { ApproverHeader } from './components/ApproverHeader'
import { Notice } from './components/Notice'
import { ApprovalDetailPage } from './pages/ApprovalDetailPage'
import { ApprovalListPage } from './pages/ApprovalListPage'
import { ApproverDashboard } from './pages/ApproverDashboard'
import type { ApproverView } from './types'
import { daysWaiting } from './utils'
import { NotificationsPage } from '../../components/NotificationsPage'
import type { NotificationItem } from '../../components/NotificationsPage'
import { isNotificationRead, useReadNotifications } from '../../notifications'

export function ApproverLanding({ employee, onSignOut }: { employee: Employee; onSignOut: () => void }) {
  const { read } = useReadNotifications(employee.employee_id)
  const [view, setView] = useState<ApproverView>('dashboard')
  const [notice, setNotice] = useState('')
  const [history, setHistory] = useState<ApprovalHistoryItem[]>([])
  const [historyError, setHistoryError] = useState('')
  const [signedAt, setSignedAt] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingApproval[]>([])
  const [selected, setSelected] = useState<PendingApproval | null>(null)
  const [requisition, setRequisition] = useState<Requisition | null>(null)
  const [passcode, setPasscode] = useState('')
  const [reason, setReason] = useState('')
  const [decisionError, setDecisionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [queueVersion, setQueueVersion] = useState(0)
  const [loadedAt, setLoadedAt] = useState(() => Date.now())

  useEffect(() => {
    let active = true
    getApprovalHistory(employee.employee_id).then(items => { if (active) { setHistory(items); setHistoryError('') } }).catch(error => { if (active) setHistoryError(error instanceof Error ? error.message : 'ไม่สามารถโหลดประวัติได้') })
    getPendingApprovals(employee.employee_id)
      .then(items => { if (active) { setPending(items); setLoadedAt(Date.now()) } })
      .catch(error => { if (active) setNotice(error instanceof Error ? error.message : 'Unable to load approval queue') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [employee.employee_id, queueVersion])

  const queue = pending.map(item => {
    const days = daysWaiting(item.created_at, loadedAt)
    return { id: item.pr_no, prId: item.pr_id, subject: item.job_name || 'Purchase Requisition', owner: item.requester_name, amount: `฿${Number(item.total_amount).toLocaleString('en-US')}`, waiting: `รอมา ${days} วัน`, overdue: days >= 3 }
  })
  const queueTotal = pending.reduce((sum, item) => sum + Number(item.total_amount), 0)
  const oldestDays = pending.reduce((max, item) => Math.max(max, daysWaiting(item.created_at, loadedAt)), 0)

  async function openApproval(item: PendingApproval, readOnly = false) {
    setSignedAt(null)
    setSelected(item)
    setRequisition(null)
    setDecisionError('')
    setPasscode('')
    setReason('')
    setView(readOnly ? 'request-detail' : 'detail')
    try { setRequisition(await getPr(item.pr_id)) }
    catch (error) { setDecisionError(error instanceof Error ? error.message : 'Unable to load this request') }
  }

  function closeApproval() {
    if (busy) return
    setSelected(null)
    setRequisition(null)
    setDecisionError('')
    setSignedAt(null)
    setView(view === 'request-detail' ? 'history' : 'pending')
  }

  async function decide(action: 'approve' | 'reject') {
    if (!selected) return
    if (action === 'approve' && !/^\d{6}$/.test(passcode)) { setDecisionError('Enter your 6-digit passcode / กรุณากรอกรหัส 6 หลัก'); return }
    if (action === 'reject' && !reason.trim()) { setDecisionError('Enter a rejection reason / กรุณาระบุเหตุผลที่ปฏิเสธ'); return }
    setBusy(true)
    setDecisionError('')
    try {
      if (action === 'approve') await approvePr(selected.pr_id, passcode)
      else await rejectPr(selected.pr_id, reason.trim())
      if (action === 'approve') {
        setSignedAt(new Date().toISOString())
      } else {
        setNotice(`ปฏิเสธ ${selected.pr_no} เรียบร้อยแล้ว`)
        setSelected(null)
        setRequisition(null)
        setView('pending')
      }
      setQueueVersion(version => version + 1)
    } catch (error) {
      setDecisionError(error instanceof Error ? error.message : 'Could not save the decision')
    } finally {
      setBusy(false)
    }
  }

  function startApproval() {
    if (pending[0]) void openApproval(pending[0])
    else { setView('pending'); setNotice('ไม่มีคำขอที่รออนุมัติ') }
  }

  const notifications: NotificationItem[] = [
    ...pending.map(item => ({ id: `${item.pr_id}:pending`, kind: 'pending' as const, title: 'มีคำขอรอการอนุมัติใหม่', reference: item.pr_no, subject: item.job_name || '', detail: `ผู้ขอ : ${item.requester_name} · ${Number(item.total_amount).toLocaleString('en-US')} THB`, date: item.created_at, onOpen: () => void openApproval(item) })),
    ...history.map(item => ({ id: `${item.pr_id}:${item.decision}:${item.approved_at}`, kind: item.decision, title: item.decision === 'approved' ? 'คุณอนุมัติคำขอเรียบร้อยแล้ว' : 'คำขอถูกปฏิเสธ', reference: item.pr_no, subject: item.job_name || '', detail: item.comment || 'บันทึกผลการอนุมัติแล้ว', date: item.approved_at, onOpen: () => void openApproval(item, true) })),
  ]
  const notificationCount = notifications.filter(item => !isNotificationRead(read, item.id)).length

  return <div className="approver-screen min-h-svh bg-white text-[#222a2d] [font-family:'Noto_Sans_Thai','Bai_Jamjuree',sans-serif]">
    <ApproverHeader employee={employee} pendingCount={pending.length} notificationCount={notificationCount} view={view} onView={setView} onSignOut={onSignOut} onNotifications={() => setView('notifications')} />
    <main key={view} className={`mx-auto w-[min(1216px,calc(100%_-_48px))] max-[760px]:w-[calc(100%_-_32px)] ${view === 'dashboard' ? 'min-h-[1586px] py-20 pt-[84px] max-[760px]:pt-7' : 'min-h-[940px] py-[55px]'}`}>
      <Notice message={notice} onClose={() => setNotice('')} />
      {view === 'dashboard' ? <ApproverDashboard pending={pending} history={history} queue={queue} queueTotal={queueTotal} oldestDays={oldestDays} loadedAt={loadedAt} loading={loading} onStartApproval={startApproval} onOpenApproval={item => void openApproval(item)} onOpenPending={() => setView('all')} onOpenDetail={item => void openApproval(item, true)} /> : null}
      {view === 'pending' || view === 'history' || view === 'all' ? <ApprovalListPage view={view} pending={pending} history={history} loading={loading} error={historyError} onView={setView} onOpenApproval={item => void openApproval(item)} onOpenDetail={item => void openApproval(item, true)} /> : null}
      {view === 'detail' || view === 'request-detail' ? <ApprovalDetailPage readOnly={view === 'request-detail'} signedAt={signedAt} employee={employee} selected={selected} requisition={requisition} passcode={passcode} reason={reason} error={decisionError} busy={busy} onBack={closeApproval} onPasscode={setPasscode} onReason={setReason} onDecision={decide} /> : null}
      {view === 'notifications' ? <NotificationsPage approver loading={loading} error={historyError} items={notifications} /> : null}
    </main>
  </div>
}
