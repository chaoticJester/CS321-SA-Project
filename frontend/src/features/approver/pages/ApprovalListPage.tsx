import { useState } from 'react'
import type { ApprovalHistoryItem, PendingApproval } from '../../../api'
import { PolishedSelect } from '../../../components/PolishedSelect'
import type { ApproverView } from '../types'
import { Status } from '../components/Status'

function isHistoryItem(item: PendingApproval | ApprovalHistoryItem): item is ApprovalHistoryItem {
  return 'decision' in item
}

type Props = {
  view: 'pending' | 'history' | 'all'
  pending: PendingApproval[]
  history: ApprovalHistoryItem[]
  loading: boolean
  error: string
  onView: (view: ApproverView) => void
  onOpenApproval: (item: PendingApproval) => void
  onOpenDetail: (item: PendingApproval) => void
}

export function ApprovalListPage({ view, pending, history, loading, error, onView, onOpenApproval, onOpenDetail }: Props) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [month, setMonth] = useState('all')
  const [page, setPage] = useState(1)
  const source: Array<PendingApproval | ApprovalHistoryItem> = view === 'history' ? history : view === 'all' ? [...pending, ...history] : pending
  const months = [...new Set(source.map(item => item.created_at.slice(0, 7)))].sort().reverse()
  const visible = source.filter(item => {
    const decision = isHistoryItem(item) ? item.decision : 'pending'
    return (status === 'all' || status === decision) && (month === 'all' || item.created_at.startsWith(month)) && (!query.trim() || `${item.pr_no} ${item.job_name} ${item.requester_name}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  })
  const pageCount = Math.max(1, Math.ceil(visible.length / 10))
  const currentPage = Math.min(page, pageCount)
  const rows = visible.slice((currentPage - 1) * 10, currentPage * 10)
  const reset = () => { setQuery(''); setStatus('all'); setMonth('all'); setPage(1) }
  return <section className="approver-list" data-node-id={view === 'history' ? '488:3141' : '484:2289'}>
    <h1 className="text-[28px] font-bold text-[#17414d]">{view === 'history' ? 'ประวัติการอนุมัติ' : 'รายการที่รออนุมัติ'}</h1>
    <div className="notification-tabs"><button type="button" aria-pressed={view === 'pending'} onClick={() => { onView('pending'); reset() }}>รอการอนุมัติ&nbsp; {pending.length}</button><button type="button" aria-pressed={view === 'history'} onClick={() => { onView('history'); reset() }}>◷ ประวัติการอนุมัติ&nbsp; {history.length}</button><button type="button" aria-pressed={view === 'all'} onClick={() => { onView('all'); reset() }}>ทั้งหมด&nbsp; {pending.length + history.length}</button></div>
    <div className="approval-table-filters"><input aria-label="Search approvals" placeholder="เลขที่ PR, ชื่อรายการ หรือ ผู้ขอ" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} /><PolishedSelect compact ariaLabel="Approval status" value={status} onChange={value => { setStatus(value); setPage(1) }} options={[{ value: 'all', label: 'ทุกสถานะ' }, { value: 'pending', label: 'รออนุมัติ' }, { value: 'approved', label: 'อนุมัติ' }, { value: 'rejected', label: 'ปฏิเสธ' }]} /><PolishedSelect compact ariaLabel="Approval month" value={month} onChange={value => { setMonth(value); setPage(1) }} options={[{ value: 'all', label: 'ทุกเดือน' }, ...months.map(value => ({ value, label: new Date(value + '-01').toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }) }))]} /><button type="button" onClick={reset}>ล้างตัวกรอง</button></div>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <div className="table-frame"><table className="approval-table"><thead><tr><th>เลขที่ PR / รายการ</th><th>ผู้ขอ / หน่วยงาน</th><th>ยอดรวม</th><th>{view === 'history' ? 'ผลการอนุมัติ' : 'กำหนดใช้'}</th><th>{view === 'history' ? 'วันที่ตัดสินใจ' : 'สถานะ'}</th><th>ดำเนินการ</th></tr></thead><tbody>{rows.map(item => {
      const completed = isHistoryItem(item)
      const decision = completed ? item.decision : 'pending'
      return <tr key={`${item.pr_id}:${decision}`}><td><strong>{item.pr_no}</strong><small>{item.job_name}</small></td><td><strong>{item.requester_name}</strong><small>{item.requester_department || '—'}</small></td><td className="whitespace-nowrap">{Number(item.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} THB</td>
        <td>{view === 'history' && completed ? <><Status tone={item.decision}>{item.decision === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}</Status><small>{item.comment || (item.decision === 'approved' ? 'ผ่านการอนุมัติ' : '')}</small></> : new Date(item.require_date || item.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
        <td>{view === 'history' && completed ? <>{new Date(item.approved_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}<small>{new Date(item.approved_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</small></> : <Status tone={decision}>{completed ? (decision === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ') : 'รอการอนุมัติจากคุณ'}</Status>}</td>
        <td><button type="button" onClick={() => completed ? onOpenDetail(item) : onOpenApproval(item)}>◉ {completed ? 'ดูรายละเอียด' : 'พิจารณา'}</button></td></tr>
    })}</tbody></table>{loading ? <p className="list-state" role="status">กำลังโหลดคำขอ…</p> : !rows.length && !error ? <p className="list-state">ไม่มีรายการ</p> : null}
    <div className="table-footer"><span>แสดง {rows.length} จาก {visible.length} รายการ</span><div><button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>ก่อนหน้า</button><button type="button" className="current-page">{currentPage}</button><button type="button" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>ถัดไป</button></div></div></div>
  </section>
}
