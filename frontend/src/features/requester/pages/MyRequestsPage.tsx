import { Eye } from 'lucide-react'
import { useState } from 'react'
import { getPr } from '../../../api'
import { PolishedSelect } from '../../../components/PolishedSelect'
import { requestCounts } from '../../../model'
import { RequesterHeader } from '../components/RequesterHeader'
import { RequestTabs } from '../components/RequestTabs'
import { statusStyles, statusText } from '../data'
import type { PageActions, RequestRow, RequestListState } from '../types'

type MyRequestsPageProps = PageActions & {
  initialTab?: 'active' | 'all'
  requestList: RequestListState
}

export function MyRequestsPage({ initialTab = 'all', requestList, ...props }: MyRequestsPageProps) {
  const tab = initialTab
  const [query, setQuery] = useState('')
  const [month, setMonth] = useState('all')
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('all')
  const [notice, setNotice] = useState('')
  const [opening, setOpening] = useState('')
  const { requests: submitted, draft, loading, error } = requestList

  const requests: RequestRow[] = submitted.map(request => ({
    id: request.reference || request.backendId || 'PR',
    title: request.basic.job || 'Purchase Requisition',
    budget: request.basic.budgetCode || '—',
    date: new Date(request.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }),
    status: request.status || 'pending',
    statusText: statusText[request.status || 'pending'],
    action: 'ดูรายละเอียด',
    request,
  }))
  if (draft) requests.unshift({ id: 'PR-DRAFT', title: draft.basic.job || 'Purchase Requisition', budget: draft.basic.budgetCode || '—', date: new Date(draft.createdAt).toLocaleDateString('th-TH'), status: 'draft', statusText: 'ฉบับร่าง', action: 'เปิดฉบับร่าง', request: draft })
  const months = [...new Set(submitted.map(request => request.createdAt.slice(0, 7)))].sort().reverse()
  const counts = requestCounts(submitted)
  const normalized = query.trim().toLocaleLowerCase()
  const visible = requests.filter(row => (tab === 'all' || row.status === 'pending') && (status === 'all' || row.status === status) && (month === 'all' || row.request?.createdAt.startsWith(month)) && (!normalized || `${row.id} ${row.title} ${row.budget}`.toLocaleLowerCase().includes(normalized)))
  const pageCount = Math.max(1, Math.ceil(visible.length / 10))
  const currentPage = Math.min(page, pageCount)
  const pageRows = visible.slice((currentPage - 1) * 10, currentPage * 10)
  const showActive = () => { setStatus('all'); setPage(1); props.onActiveRequests() }
  const showAll = () => { setStatus('all'); setPage(1); props.onMyRequests() }
  async function openRequest(row: RequestRow) {
    if (row.status === 'draft') { props.onOpenDraft(); return }
    if (!row.request?.backendId || opening) return
    setOpening(row.request.backendId)
    setNotice('')
    try {
      props.onOpenDetail(await getPr(row.request.backendId))
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'ไม่สามารถโหลดรายละเอียดคำขอได้')
    } finally {
      setOpening('')
    }
  }

  return <div className="requester-requests min-h-svh bg-white text-[#222a2d] [font-family:'Noto_Sans_Thai','Bai_Jamjuree',sans-serif]" data-node-id="423:1641">
    <RequesterHeader active="requests" {...props} />
    <main className="design-page requester-list-page">
      <h1 className="text-[28px] font-bold text-[#31456c]">คำขอของฉัน</h1>
      <RequestTabs active={tab} onActiveRequests={showActive} onMyRequests={showAll} onHistory={props.onHistory} activeCount={counts.active} historyCount={submitted.length} allCount={requests.length} />
      <div className="approval-table-filters"><input className="!h-[41px] !rounded-md !border-[#8883] px-3 text-sm" aria-label="Search requests" placeholder="เลขที่ PR, ชื่อรายการ หรือ Budget Code" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} /><PolishedSelect compact ariaLabel="Request status" value={status} options={[{ value: 'draft', label: 'ฉบับร่าง' }, { value: 'all', label: 'ทุกสถานะ' }, { value: 'pending', label: 'รออนุมัติ' }, { value: 'approved', label: 'อนุมัติแล้ว' }, { value: 'rejected', label: 'ปฏิเสธ' }]} onChange={value => { setStatus(value); setPage(1) }} /><PolishedSelect compact ariaLabel="Request month" value={month} options={[{ value: 'all', label: 'ทุกเดือน' }, ...months.map(value => ({ value, label: new Date(value + '-01').toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }) }))]} onChange={value => { setMonth(value); setPage(1) }} /><button className="border-0 bg-transparent text-sm text-[#4f6fae]" type="button" onClick={() => { setQuery(''); setStatus('all'); setMonth('all'); setPage(1) }}>ล้างตัวกรอง</button></div>
      {notice || error ? <div className="mt-4 rounded-md border border-[#b8c4da] bg-[#f7f9fc] px-4 py-2 text-sm text-[#31456c]" role="alert">{notice || error}</div> : null}
      <div className="mt-7 overflow-x-auto rounded-lg border border-[#8883]"><table className="w-full table-fixed min-w-[850px] border-collapse text-sm"><thead className="h-[51px] bg-[#f7f6f1] text-left font-medium text-[#888]"><tr><th className="w-[11%] px-5">ลำดับ</th><th className="w-[28%] px-5">เลขที่คำขอ / รายการ</th><th className="w-[24%] px-5">Budget Code</th><th className="w-[18%] px-5">สถานะ</th><th className="px-5">ดำเนินการ</th></tr></thead><tbody>{pageRows.map((row, index) => <tr className="h-[85px] border-t border-[#8883]" key={`${row.id}-${row.status}-${index}`}><td className="px-5 text-center">{(currentPage - 1) * 10 + index + 1}</td><td className="px-5"><strong className="block text-base">{row.id}</strong><span className="text-[#888]">{row.title}</span></td><td className="px-5"><strong className="block text-base">{row.budget}</strong><span className="text-[#888]">{row.date}</span></td><td className="px-5"><span className={`inline-flex min-h-[29px] items-center gap-1.5 rounded-lg px-2.5 ${statusStyles[row.status]}`}><span aria-hidden="true">{row.status === 'approved' ? '✓' : row.status === 'rejected' ? '×' : row.status === 'draft' ? '▤' : '◷'}</span>{row.statusText}</span></td><td className="px-5"><button className="flex items-center gap-[7px] border-0 bg-transparent text-[#4f6fae]" type="button" disabled={Boolean(opening)} onClick={() => void openRequest(row)}><Eye size={18} />{opening === row.request?.backendId ? 'กำลังโหลด…' : row.action}</button></td></tr>)}{loading ? <tr><td colSpan={5} className="p-8 text-center text-[#888]" role="status">กำลังโหลดคำขอ…</td></tr> : !pageRows.length && !notice && !error ? <tr><td colSpan={5} className="p-8 text-center text-[#888]">ไม่พบคำขอ</td></tr> : null}</tbody></table><div className="flex h-[82px] items-center justify-between px-8 text-sm text-[#888]"><span>แสดง {pageRows.length} จาก {visible.length} รายการ</span><div className="flex gap-2"><button className="rounded-md border border-[#8883] bg-white px-4 py-2" type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>ก่อนหน้า</button><button className="rounded-md border-0 bg-[#4f6fae] px-3 py-2 text-white" type="button">{currentPage}</button><button className="rounded-md border border-[#8883] bg-white px-4 py-2" type="button" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>ถัดไป</button></div></div></div>
    </main>
  </div>
}
