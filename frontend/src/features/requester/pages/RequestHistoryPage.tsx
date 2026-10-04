import { Eye } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getPr, getPrApproval } from '../../../api'
import type { ApprovalStatus } from '../../../api'
import { requestCounts } from '../../../model'
import type { Requisition } from '../../../model'
import { PolishedSelect } from '../../../components/PolishedSelect'
import { RequesterHeader } from '../components/RequesterHeader'
import { RequestTabs } from '../components/RequestTabs'
import { historyTone } from '../data'
import type { PageActions, RequestListState } from '../types'

export function RequestHistoryPage({ requestList, ...props }: PageActions & { requestList: RequestListState }) {
  const [error, setError] = useState('')
  const { requests, draft, loading } = requestList
  const [approvals, setApprovals] = useState<Record<string, ApprovalStatus>>({})
  const [opening, setOpening] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [month, setMonth] = useState('all')
  const [page, setPage] = useState(1)
  useEffect(() => {
    let active = true
    Promise.allSettled(requests.map(request => getPrApproval(request.backendId!))).then(results => {
      if (!active) return
      const next: Record<string, ApprovalStatus> = {}
      results.forEach((result, index) => { if (result.status === 'fulfilled') next[requests[index].backendId!] = result.value })
      setApprovals(next)
    })
    return () => { active = false }
  }, [requests])
  const counts = requestCounts(requests)
  const visible = requests.filter(request => (status === 'all' || request.status === status) && (month === 'all' || request.createdAt.startsWith(month)) && (!query.trim() || `${request.reference} ${request.basic.job} ${request.basic.budgetCode}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())))
  const months = [...new Set(requests.map(request => request.createdAt.slice(0, 7)))].sort().reverse()
  const pageCount = Math.max(1, Math.ceil(visible.length / 10))
  const currentPage = Math.min(page, pageCount)
  const rows = visible.slice((currentPage - 1) * 10, currentPage * 10)
  async function openRequest(request: Requisition) {
    if (!request.backendId || opening) return
    setOpening(request.backendId)
    setError('')
    try { props.onOpenDetail(await getPr(request.backendId)) }
    catch (error) { setError(error instanceof Error ? error.message : 'ไม่สามารถโหลดรายละเอียดคำขอได้') }
    finally { setOpening('') }
  }
  return <div className="requester-screen request-history" data-node-id="426:2575"><RequesterHeader active="requests" {...props} />
    <main className="design-page requester-list-page"><h1 className="text-[28px] font-bold text-[#31456c]">ประวัติคำขอ</h1>
      <RequestTabs active="history" onActiveRequests={props.onActiveRequests} onMyRequests={props.onMyRequests} onHistory={props.onHistory} activeCount={counts.active} historyCount={requests.length} allCount={counts.all + (draft ? 1 : 0)} />
      <div className="approval-table-filters"><input aria-label="Search request history" placeholder="เลขที่ PR, ชื่อรายการ หรือ Budget Code" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} /><PolishedSelect compact ariaLabel="History status" value={status} onChange={value => { setStatus(value); setPage(1) }} options={[{ value: 'all', label: 'ทุกสถานะ' }, { value: 'pending', label: 'ส่งสำเร็จ' }, { value: 'approved', label: 'ถูกอนุมัติ' }, { value: 'rejected', label: 'ถูกปฏิเสธ' }]} /><PolishedSelect compact ariaLabel="History month" value={month} onChange={value => { setMonth(value); setPage(1) }} options={[{ value: 'all', label: 'ทุกเดือน' }, ...months.map(value => ({ value, label: new Date(value + '-01').toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }) }))]} /><button type="button" onClick={() => { setQuery(''); setStatus('all'); setMonth('all'); setPage(1) }}>ล้างตัวกรอง</button></div>
      {error || requestList.error ? <p className="form-error" role="alert">{error || requestList.error}</p> : null}
      <div className="table-frame"><table className="requester-history-table"><thead><tr><th>ลำดับ</th><th>เลขที่คำขอ / รายการ</th><th>วันที่ส่งคำขอ</th><th>สถานะ</th><th>อัปเดตล่าสุด</th><th>ดำเนินการ</th></tr></thead><tbody>{rows.map((request, index) => {
        const tone = request.status || 'pending'
        const latest = approvals[request.backendId!]?.chain.filter(step => step.approved_at).at(-1)
        const date = new Date(request.createdAt)
        const updated = new Date(latest?.approved_at || request.createdAt)
        return <tr key={request.backendId}><td>{(currentPage - 1) * 10 + index + 1}</td><td><strong>{request.reference}</strong><small>{request.basic.job}</small></td><td><strong>{date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</strong><small>{date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</small></td><td><span className={`request-history-status ${historyTone[tone === 'pending' ? 'sent' : tone]}`}>{tone === 'rejected' ? '× ถูกปฏิเสธ' : tone === 'approved' ? '✓ ถูกอนุมัติ' : '✓ ส่งสำเร็จ'}</span><small>{tone === 'pending' ? 'กำลังรอผลการอนุมัติ' : tone === 'rejected' ? `เหตุผล: ${latest?.comment || '—'}` : `โดย ${latest?.approver_name || '—'}`}</small></td><td><strong>{updated.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</strong><small>{updated.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</small></td><td><button type="button" disabled={Boolean(opening)} onClick={() => void openRequest(request)}><Eye size={18} />{opening === request.backendId ? 'กำลังโหลด…' : 'ดูรายละเอียด'}</button></td></tr>
      })}</tbody></table>{loading ? <p className="list-state" role="status">กำลังโหลดประวัติคำขอ…</p> : !rows.length && !error && !requestList.error ? <p className="list-state">ไม่มีประวัติคำขอ</p> : null}
      <div className="table-footer"><span>แสดง {rows.length} จาก {visible.length} รายการ</span><div><button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>ก่อนหน้า</button><button type="button" className="current-page">{currentPage}</button><button type="button" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>ถัดไป</button></div></div></div>
    </main>
  </div>
}
