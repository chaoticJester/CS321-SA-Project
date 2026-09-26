import { useEffect, useState } from 'react'
import { activeItems, grandTotal, money, readSubmittedRequisitions } from '../model'
import type { Requisition } from '../model'
import { RequesterHeader } from './RequesterHeader'

const asset = (name: string) => `${import.meta.env.BASE_URL}figma/${name}`

type PageActions = {
  onHome: () => void
  onActiveRequests: () => void
  onMyRequests: () => void
  onHistory: () => void
  onOpenDraft: () => void
  onOpenDetail: (request: Requisition) => void
  onSignOut: () => void
}

type RequestStatus = 'pending' | 'draft' | 'approved' | 'rejected' | 'cancelled'

type RequestRow = {
  id: string
  title: string
  budget: string
  date: string
  status: RequestStatus
  statusText: string
  action: string
  request?: Requisition
}

const seedRequests: RequestRow[] = [
  { id: 'IT-026-PR', title: 'Notebook สำหรับทีม IT', budget: '26-IT-ADM-072', date: '21 ก.ย. 2569', status: 'pending', statusText: 'รออนุมัติ', action: 'ดูรายละเอียด' },
  { id: 'IT-026-PR', title: 'Notebook สำหรับทีม IT', budget: '26-IT-ADM-072', date: '21 ก.ย. 2569', status: 'draft', statusText: 'ฉบับร่าง', action: 'เปิดฉบับร่าง' },
  { id: 'IT-026-PR', title: 'Notebook สำหรับทีม IT', budget: '26-IT-ADM-072', date: '21 ก.ย. 2569', status: 'approved', statusText: 'อนุมัติแล้ว', action: 'ดูรายละเอียด' },
  { id: 'IT-026-PR', title: 'Notebook สำหรับทีม IT', budget: '26-IT-ADM-072', date: '21 ก.ย. 2569', status: 'rejected', statusText: 'ปฏิเสธ', action: 'ดูรายละเอียด' },
  { id: 'IT-026-PR', title: 'Notebook สำหรับทีม IT', budget: '26-IT-ADM-072', date: '21 ก.ย. 2569', status: 'cancelled', statusText: 'ยกเลิกแล้ว', action: 'ดูรายละเอียด' },
]

function requestFromSeed(row: RequestRow): Requisition {
  return {
    basic: { job: row.title, mainGroup: 'General Adm', budgetType: 'Office Supply', requiredDate: '2569-10-01', budgetCode: row.budget, purpose: 'ทดแทนเครื่องเดิมของทีม IT ที่ใช้งานเกิน 5 ปี', line: 'IT', description: 'อุปกรณ์สำหรับทีม IT', currency: 'THB' },
    items: [{ id: 'sample-item', budgetCode: row.budget, name: 'Notebook HP รุ่น 123456', brand: 'HP', model: '123456', detail: '', quantity: '5', unit: 'เครื่อง', price: '22000' }],
    attachments: [], purchaser: 'Procurement', remark: '', step: 4, createdAt: new Date('2026-09-21T10:24:00+07:00').toISOString(), reference: row.id,
  }
}

const history = [
  { id: 'IT-026-PR', title: 'Notebook สำหรับทีม IT', requested: '21 ก.ย. 2569', requestedTime: '10.24', status: 'ส่งสำเร็จ', detail: 'กำลังรอผลการอนุมัติ', updated: '21 ก.ย. 2569', updatedTime: '10.24', tone: 'sent' },
  { id: 'IT-026-PR', title: 'Notebook สำหรับทีม IT', requested: '18 ก.ย. 2569', requestedTime: '14.40', status: 'ถูกอนุมัติ', detail: 'โดย สบาย ใจดี', updated: '20 ก.ย. 2569', updatedTime: '09.15', tone: 'approved' },
  { id: 'IT-026-PR', title: 'Notebook สำหรับทีม IT', requested: '15 ก.ย. 2569', requestedTime: '11.05', status: 'ถูกปฏิเสธ', detail: 'เหตุผล : งบประมาณไม่เพียงพอ', updated: '16 ก.ย. 2569', updatedTime: '16.30', tone: 'rejected' },
]

const statusStyles: Record<RequestStatus, string> = {
  pending: 'bg-[#e7ebef] text-[#5e6669]', draft: 'bg-[#d9d6cd] text-[#5e6669]', approved: 'bg-[#a9b8a7] text-[#405747]', rejected: 'border border-[#b4423eb3] bg-[#b4423e33] text-[#8c3431]', cancelled: 'bg-[#d9d6cd] text-[#5e6669]',
}

function Tabs({ active, onActiveRequests, onMyRequests, onHistory, activeCount = 2, allCount = 5 }: Pick<PageActions, 'onActiveRequests' | 'onMyRequests' | 'onHistory'> & { active: 'active' | 'all' | 'history'; activeCount?: number; allCount?: number }) {
  const activeClass = 'border-b-[3px] border-[#4f6fae] font-semibold text-[#4f6fae]'
  return <div className="mt-[62px] flex h-[43px] items-end gap-10 border-b border-[#d7dbde] text-base text-[#888] max-[600px]:gap-5"><button className={`h-full border-0 bg-transparent px-0 ${active === 'active' ? activeClass : ''}`} type="button" aria-pressed={active === 'active'} onClick={onActiveRequests}>กำลังดำเนินการ　{activeCount}</button><button className={`h-full border-0 bg-transparent px-0 ${active === 'history' ? activeClass : ''}`} type="button" aria-pressed={active === 'history'} onClick={onHistory}>◷ ประวัติคำขอ　3</button><button className={`h-full border-0 bg-transparent px-0 ${active === 'all' ? activeClass : ''}`} type="button" aria-pressed={active === 'all'} onClick={onMyRequests}>ทั้งหมด　{allCount}</button></div>
}

export function MyRequestsPage({ initialTab = 'all', requestVersion, ...props }: PageActions & { initialTab?: 'active' | 'all'; requestVersion: number }) {
  const [tab, setTab] = useState<'active' | 'all'>(initialTab)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [notice, setNotice] = useState('')
  const [submitted, setSubmitted] = useState<Requisition[]>([])
  useEffect(() => { let active = true; readSubmittedRequisitions().then(values => { if (active) setSubmitted(values) }).catch(() => setNotice('ไม่สามารถโหลดคำขอที่บันทึกไว้ได้ / Could not load saved requests.')); return () => { active = false } }, [requestVersion])
  const submittedRows: RequestRow[] = submitted.map(request => ({ id: request.reference || 'PR-DRAFT', title: request.basic.job || 'Purchase Requisition', budget: request.basic.budgetCode || '—', date: new Date(request.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }), status: 'pending', statusText: 'รออนุมัติ', action: 'ดูรายละเอียด', request }))
  const requests = [...submittedRows, ...seedRequests]
  const normalized = query.trim().toLocaleLowerCase()
  const visible = requests.filter(row => (tab === 'all' || row.status === 'pending' || row.status === 'draft') && (status === 'all' || row.status === status) && (!normalized || `${row.id} ${row.title} ${row.budget}`.toLocaleLowerCase().includes(normalized)))
  const showActive = () => { setTab('active'); setStatus('all') }
  const showAll = () => { setTab('all'); setStatus('all') }
  return <div className="min-h-svh bg-white text-[#222a2d] [font-family:'Noto_Sans_Thai','Bai_Jamjuree',sans-serif]" data-node-id="423:1641"><RequesterHeader active="requests" {...props} /><main className="mx-auto w-[min(1216px,calc(100%_-_48px))] pb-20 pt-7 max-[760px]:w-[calc(100%_-_32px)]"><h1 className="text-[28px] font-bold text-[#31456c]">คำขอของฉัน</h1><Tabs active={tab} onActiveRequests={showActive} onMyRequests={showAll} onHistory={props.onHistory} activeCount={requests.filter(row => row.status === 'pending' || row.status === 'draft').length} allCount={requests.length} />
    <div className="mt-10 grid grid-cols-[1fr_104px_134px_auto] gap-3 max-[800px]:grid-cols-2"><input className="!h-[41px] !rounded-md !border-[#8883] px-3 text-sm" aria-label="Search requests" placeholder="เลขที่ PR, ชื่อรายการ หรือ Budget Code" value={query} onChange={event => setQuery(event.target.value)} /><select className="!h-[41px] !rounded-md !border-[#8883] px-3 text-sm" aria-label="Request status" value={status} onChange={event => setStatus(event.target.value)}><option value="all">ทุกสถานะ</option><option value="pending">รออนุมัติ</option><option value="draft">ฉบับร่าง</option><option value="approved">อนุมัติแล้ว</option><option value="rejected">ปฏิเสธ</option></select><select className="!h-[41px] !rounded-md !border-[#8883] px-3 text-sm" aria-label="Request month"><option>กันยายน 2569</option></select><button className="border-0 bg-transparent text-sm text-[#4f6fae]" type="button" onClick={() => { setQuery(''); setStatus('all') }}>ล้างตัวกรอง</button></div>
    {notice ? <div className="mt-4 rounded-md border border-[#b8c4da] bg-[#f7f9fc] px-4 py-2 text-sm text-[#31456c]" role="status">{notice}</div> : null}
    <div className="mt-7 overflow-x-auto rounded-lg border border-[#8883]"><table className="w-full min-w-[850px] border-collapse text-sm"><thead className="h-[51px] bg-[#f7f6f1] text-left font-medium text-[#888]"><tr><th className="w-[11%] px-5">ลำดับ</th><th className="w-[28%] px-5">เลขที่คำขอ / รายการ</th><th className="w-[24%] px-5">Budget Code</th><th className="w-[18%] px-5">สถานะ</th><th className="px-5">ดำเนินการ</th></tr></thead><tbody>{visible.map((row, index) => <tr className="h-[85px] border-t border-[#8883]" key={`${row.id}-${row.status}-${index}`}><td className="px-5 text-center">{index + 1}</td><td className="px-5"><strong className="block text-base">{row.id}</strong><span className="text-[#888]">{row.title}</span></td><td className="px-5"><strong className="block text-base">{row.budget}</strong><span className="text-[#888]">{row.date}</span></td><td className="px-5"><span className={`inline-flex min-h-[29px] items-center gap-1.5 rounded-lg px-2.5 ${statusStyles[row.status]}`}><span aria-hidden="true">{row.status === 'approved' ? '✓' : row.status === 'rejected' ? '×' : row.status === 'draft' ? '▤' : '◷'}</span>{row.statusText}</span></td><td className="px-5"><button className="flex items-center gap-[7px] border-0 bg-transparent text-[#4f6fae]" type="button" onClick={() => row.status === 'draft' ? props.onOpenDraft() : props.onOpenDetail(row.request || requestFromSeed(row))}><img className="h-[14px] w-[18px]" src={asset('requester-eye-outline.svg')} alt="" />{row.action}</button></td></tr>)}</tbody></table><div className="flex h-[82px] items-center justify-between px-8 text-sm text-[#888]"><span>แสดง {visible.length} จาก {tab === 'active' ? requests.filter(row => row.status === 'pending' || row.status === 'draft').length : requests.length} รายการ</span><div className="flex gap-2"><button className="rounded-md border border-[#8883] bg-white px-4 py-2" type="button" disabled>ก่อนหน้า</button><button className="rounded-md border-0 bg-[#4f6fae] px-3 py-2 text-white" type="button">1</button><button className="rounded-md border border-[#8883] bg-white px-4 py-2" type="button" disabled>ถัดไป</button></div></div></div>
  </main></div>
}

export function RequestDetailPage({ request, ...props }: PageActions & { request: Requisition }) {
  const items = activeItems(request.items)
  const total = grandTotal(items)
  const openAttachment = (file: File) => { const url = URL.createObjectURL(file); window.open(url, '_blank', 'noopener,noreferrer'); window.setTimeout(() => URL.revokeObjectURL(url), 60_000) }
  const approval = [
    ['นายสมชาย ใจดี', 'Senior Chief', 'อนุมัติแล้ว'], ['นางสาวพิมช์ชนก วัฒนะ', 'Manager', 'อนุมัติแล้ว'], ['นายธนกร สุขใจ', 'General Manager', 'รออนุมัติ'], ['นางสาวกมลชนก แก้วดี', 'FGM.', 'รอลำดับ'], ['นายวิชัย ตั้งมั่น', 'Senior Director', 'รอลำดับ'], ['นายรชตะ เดชาพิพัฒน์', 'Vice President', 'รอลำดับ'],
  ]
  return <div className="min-h-svh bg-white text-[#222a2d] [font-family:'Noto_Sans_Thai','Bai_Jamjuree',sans-serif]" data-node-id="442:3176"><RequesterHeader active="requests" {...props} /><main className="mx-auto w-[min(1216px,calc(100%_-_48px))] pb-24 pt-11 max-[760px]:w-[calc(100%_-_32px)]"><button className="border-0 bg-transparent p-0 text-sm text-[#888]" type="button" onClick={props.onMyRequests}>คำขอของฉัน　/　{request.reference}</button><div className="mt-3 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-[28px] font-semibold text-[#31456c]">{request.reference || 'PR-DRAFT'}</h1><p className="text-base text-[#888]">{request.basic.job || 'Purchase Requisition'}</p></div><div className="flex gap-3"><span className="inline-flex h-[29px] items-center rounded-lg bg-[#e7ebef] px-3 text-sm text-[#5e6669]">◷ รออนุมัติ</span><button className="h-[29px] rounded-lg border border-[#8884] bg-white px-4 text-sm" type="button" onClick={() => window.print()}>ดาวน์โหลด PR</button></div></div>
    <section className="mt-6 rounded-lg border-2 border-[#8885] p-7" aria-labelledby="approval-title"><div className="flex items-center justify-between gap-4"><h2 id="approval-title" className="text-[22px] font-semibold text-[#4f6fae]">สถานะการอนุมัติ</h2><span className="text-sm text-[#888]">อนุมัติแล้ว 2 จาก 6 ลำดับ</span></div><ol className="mt-7 grid grid-cols-6 gap-5 max-[900px]:grid-cols-3 max-[560px]:grid-cols-2">{approval.map(([name, role, state], index) => <li className="relative min-w-0 text-sm" key={name}><span className={`mb-3 grid h-9 w-9 place-items-center rounded-full border ${index < 2 ? 'border-[#a9b8a7] bg-[#a9b8a7] text-white' : index === 2 ? 'border-[#4f6fae] bg-[#4f6fae] text-white' : 'border-[#7fa0d5] text-[#4f6fae]'}`}>{index < 2 ? '✓' : index + 1}</span><strong className="block truncate">{name}</strong><small className="block text-[#5e6669]">{role}</small><small className={index === 2 ? 'text-[#4f6fae]' : 'text-[#888]'}>{state}</small></li>)}</ol></section>
    <div className="mt-4 grid grid-cols-[minmax(0,1fr)_310px] gap-7 max-[850px]:grid-cols-1"><section className="rounded-lg border-2 border-[#8885] p-6" aria-labelledby="detail-title"><h2 id="detail-title" className="text-[22px] font-semibold text-[#4f6fae]">รายละเอียดใบขอสั่งซื้อ</h2><dl className="mt-6 grid grid-cols-2 gap-x-10 gap-y-5 text-sm max-[560px]:grid-cols-1">{[['ชื่อรายการ (Job Name)', request.basic.job], ['กลุ่มสินค้าหลัก / Main Group', request.basic.mainGroup], ['ผู้ขอสั่งซื้อ / IT', 'อมิกา รัตนกุล / IT'], ['วันที่ต้องการใช้ (Require Date)', request.basic.requiredDate], ['Budget Type', request.basic.budgetType], ['Budget Code', request.basic.budgetCode], ['วัตถุประสงค์ (Purpose)', request.basic.purpose]].map(([label, value]) => <div key={label}><dt className="text-[#31456c]">{label}</dt><dd className="mt-1 font-semibold text-[#222a2d]">{value || '—'}</dd></div>)}</dl><div className="mt-8 overflow-x-auto"><table className="w-full min-w-[560px] border-collapse text-sm"><thead className="h-12 bg-[#f7f6f1] text-left text-[#5e6669]"><tr><th className="px-4">รายละเอียดสินค้า</th><th className="px-4">จำนวน</th><th className="px-4 text-right">ราคาต่อหน่วย</th><th className="px-4 text-right">รวม (บาท)</th></tr></thead><tbody>{items.map(item => <tr className="border-b border-[#8883]" key={item.id}><td className="px-4 py-4">{item.name}</td><td className="px-4 py-4">{item.quantity} {item.unit}</td><td className="px-4 py-4 text-right">{money(Number(item.price) || 0)}</td><td className="px-4 py-4 text-right">{money((Number(item.quantity) || 0) * (Number(item.price) || 0))}</td></tr>)}</tbody></table></div><div className="mt-6 flex items-baseline justify-between text-lg"><strong>ยอดรวม</strong><strong className="text-xl">{money(total)}　<small className="font-normal">บาท</small></strong></div></section><aside className="space-y-5"><section className="rounded-lg border-2 border-[#8885] p-5"><h2 className="text-[22px] font-semibold text-[#4f6fae]">เอกสารแนบ</h2><div className="mt-4 space-y-2">{request.attachments.length ? request.attachments.map(attachment => <div className="flex items-center justify-between gap-3 rounded-md border-2 border-[#8885] p-3 text-sm" key={attachment.id}><div className="min-w-0"><strong className="block truncate">{attachment.file.name}</strong><small className="text-[#888]">{Math.ceil(attachment.file.size / 1024)} KB</small></div><button className="border-0 bg-transparent text-[#4f6fae]" type="button" onClick={() => openAttachment(attachment.file)}>เปิดดู</button></div>) : <p className="rounded-md border border-dashed border-[#8885] p-5 text-center text-sm text-[#888]">ไม่มีเอกสารแนบ</p>}</div></section><div className="rounded-lg bg-[#e7ebef] p-5 text-sm text-[#17414d]"><strong>◷　รอ General Manager ตรวจสอบ</strong><small className="mt-1 block pl-7">นายธนกร สุขใจ</small></div></aside></div>
  </main></div>
}

const historyTone: Record<string, string> = { sent: 'border border-[#4f6fae] bg-[#4f6fae1f]', approved: 'bg-[#a9b8a7]', rejected: 'border border-[#b4423eb3] bg-[#b4423e33]' }

export function PRHistoryPage(props: PageActions) {
  const [notice, setNotice] = useState('')
  return <div className="min-h-svh bg-white text-[#222a2d] [font-family:'Noto_Sans_Thai','Bai_Jamjuree',sans-serif]" data-node-id="426:2575"><RequesterHeader active="requests" {...props} /><main className="mx-auto w-[min(1216px,calc(100%_-_48px))] pb-20 pt-7 max-[760px]:w-[calc(100%_-_32px)]"><h1 className="text-[28px] font-bold text-[#31456c]">คำขอของฉัน</h1><Tabs active="history" onActiveRequests={props.onActiveRequests} onMyRequests={props.onMyRequests} onHistory={props.onHistory} />
    {notice ? <div className="mt-5 rounded-md border border-[#b8c4da] bg-[#f7f9fc] px-4 py-2 text-sm text-[#31456c]" role="status">{notice}</div> : null}
    <div className="mt-10 overflow-x-auto rounded-lg border border-[#8883]"><table className="w-full min-w-[920px] border-collapse text-sm"><thead className="h-[51px] bg-[#f7f6f1] text-left font-medium text-[#888]"><tr><th className="w-[9%] px-5">ลำดับ</th><th className="w-[21%] px-5">เลขที่คำขอ / รายการ</th><th className="w-[17%] px-5">วันที่ส่งคำขอ</th><th className="w-[22%] px-5">สถานะ</th><th className="w-[17%] px-5">อัปเดตล่าสุด</th><th className="px-5">ดำเนินการ</th></tr></thead><tbody>{history.map((row, index) => <tr className="h-[85px] border-t border-[#8883]" key={`${row.status}-${index}`}><td className="px-5 text-center">{index + 1}</td><td className="px-5"><strong className="block text-base">{row.id}</strong><span className="text-[#888]">{row.title}</span></td><td className="px-5"><strong className="block text-base">{row.requested}</strong><span className="text-[#888]">{row.requestedTime}</span></td><td className="px-5"><span className={`inline-flex min-h-[29px] items-center gap-1.5 rounded-lg px-2.5 ${historyTone[row.tone]}`}><span>{row.tone === 'rejected' ? '×' : '✓'}</span>{row.status}</span><small className="mt-1 block text-[#888]">{row.detail}</small></td><td className="px-5"><strong className="block text-base">{row.updated}</strong><span className="text-[#888]">{row.updatedTime}</span></td><td className="px-5"><button className="flex items-center gap-[7px] border-0 bg-transparent text-[#4f6fae]" type="button" onClick={() => setNotice(`เปิดประวัติ ${row.id} — ${row.status}`)}><img className="h-[14px] w-[18px]" src={asset('requester-eye-outline.svg')} alt="" />ดูรายละเอียด</button></td></tr>)}</tbody></table><div className="flex h-[82px] items-center justify-between px-8 text-sm text-[#888]"><span>แสดง 3 จาก 3 รายการ</span><div className="flex gap-2"><button className="rounded-md border border-[#8883] bg-white px-4 py-2" type="button">ก่อนหน้า</button><button className="rounded-md border-0 bg-[#4f6fae] px-3 py-2 text-white" type="button">1</button><button className="rounded-md border border-[#8883] bg-white px-4 py-2" type="button">ถัดไป</button></div></div></div>
  </main></div>
}
