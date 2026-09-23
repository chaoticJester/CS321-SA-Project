import { useState } from 'react'

const asset = (name: string) => `${import.meta.env.BASE_URL}figma/${name}`

type PageActions = {
  onHome: () => void
  onActiveRequests: () => void
  onMyRequests: () => void
  onHistory: () => void
  onOpenDraft: () => void
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
}

const requests: RequestRow[] = [
  { id: 'IT-026-PR', title: 'Notebook สำหรับทีม IT', budget: '26-IT-ADM-072', date: '21 ก.ย. 2569', status: 'pending', statusText: 'รออนุมัติ', action: 'ดูรายละเอียด' },
  { id: 'IT-026-PR', title: 'Notebook สำหรับทีม IT', budget: '26-IT-ADM-072', date: '21 ก.ย. 2569', status: 'draft', statusText: 'ฉบับร่าง', action: 'เปิดฉบับร่าง' },
  { id: 'IT-026-PR', title: 'Notebook สำหรับทีม IT', budget: '26-IT-ADM-072', date: '21 ก.ย. 2569', status: 'approved', statusText: 'อนุมัติแล้ว', action: 'ดูรายละเอียด' },
  { id: 'IT-026-PR', title: 'Notebook สำหรับทีม IT', budget: '26-IT-ADM-072', date: '21 ก.ย. 2569', status: 'rejected', statusText: 'ปฏิเสธ', action: 'ดูรายละเอียด' },
  { id: 'IT-026-PR', title: 'Notebook สำหรับทีม IT', budget: '26-IT-ADM-072', date: '21 ก.ย. 2569', status: 'cancelled', statusText: 'ยกเลิกแล้ว', action: 'ดูรายละเอียด' },
]

const history = [
  { id: 'IT-026-PR', title: 'Notebook สำหรับทีม IT', requested: '21 ก.ย. 2569', requestedTime: '10.24', status: 'ส่งสำเร็จ', detail: 'กำลังรอผลการอนุมัติ', updated: '21 ก.ย. 2569', updatedTime: '10.24', tone: 'sent' },
  { id: 'IT-026-PR', title: 'Notebook สำหรับทีม IT', requested: '18 ก.ย. 2569', requestedTime: '14.40', status: 'ถูกอนุมัติ', detail: 'โดย สบาย ใจดี', updated: '20 ก.ย. 2569', updatedTime: '09.15', tone: 'approved' },
  { id: 'IT-026-PR', title: 'Notebook สำหรับทีม IT', requested: '15 ก.ย. 2569', requestedTime: '11.05', status: 'ถูกปฏิเสธ', detail: 'เหตุผล : งบประมาณไม่เพียงพอ', updated: '16 ก.ย. 2569', updatedTime: '16.30', tone: 'rejected' },
]

const navItem = 'flex min-h-[34px] items-center gap-[7px] whitespace-nowrap rounded-lg border-0 bg-transparent px-[10px] py-[7px] text-base font-medium text-[#5e6669] hover:bg-white/60 max-[760px]:text-sm'

function RequesterHeader({ active, onHome, onMyRequests, onSignOut }: Pick<PageActions, 'onHome' | 'onMyRequests' | 'onSignOut'> & { active: 'home' | 'requests' }) {
  const [accountOpen, setAccountOpen] = useState(false)
  return <header className="h-[84px] rounded-b-md bg-[#e7ebef] text-[#31456c] max-[760px]:h-auto">
    <div className="relative mx-auto flex h-[84px] w-[min(1216px,calc(100%_-_48px))] items-center max-[1050px]:w-[calc(100%_-_32px)] max-[760px]:h-auto max-[760px]:min-h-[76px] max-[760px]:flex-wrap max-[760px]:gap-3 max-[760px]:py-4">
      <button className="flex items-center gap-[10px] border-0 bg-transparent p-0 text-[#222a2d]" type="button" onClick={onHome} aria-label="SA-PR home"><span className="flex w-5 flex-col gap-1"><img className="block h-2 w-5" src={asset('requester-logo-top.svg')} alt="" /><img className="block h-2 w-5" src={asset('requester-logo-bottom.svg')} alt="" /></span><strong className="text-xl leading-8 tracking-[-0.2px]">SA‑PR</strong></button>
      <nav className="ml-4 flex items-center gap-0.5 max-[760px]:order-3 max-[760px]:ml-0 max-[760px]:w-full max-[760px]:overflow-x-auto" aria-label="Requester navigation">
        <button className={`${navItem} ${active === 'home' ? 'bg-white/30' : ''}`} type="button" onClick={onHome}><img className="h-[18px] w-[18px]" src={asset('requester-home.svg')} alt="" />หน้าหลัก</button>
        <button className={`${navItem} ${active === 'requests' ? 'bg-white/30' : ''}`} type="button" onClick={onMyRequests}><img className="h-[18px] w-[18px]" src={asset('requester-requests.svg')} alt="" />คำขอของฉัน</button>
        <button className={navItem} type="button" onClick={onSignOut}><span className="text-xl leading-none" aria-hidden="true">↪</span>Log out</button>
      </nav>
      <label className="relative ml-auto block w-[540px] max-[1180px]:w-[34vw] max-[760px]:order-2 max-[760px]:w-[calc(100%_-_190px)] max-[520px]:order-4 max-[520px]:w-full"><span className="sr-only">Search</span><span className="pointer-events-none absolute left-[18px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full border-[3px] border-[#888] after:absolute after:left-[12px] after:top-[11px] after:h-[7px] after:w-[3px] after:rotate-[-45deg] after:rounded-full after:bg-[#888]" /><input className="!h-[50px] w-full !rounded-[22px] !border-2 !border-[#8883] !bg-white !py-2 !pl-12 !pr-4" aria-label="Global search" /></label>
      <div className="relative ml-[18px] flex items-center gap-1 max-[760px]:ml-auto"><button className="relative grid h-[34px] w-[34px] place-items-center rounded-lg border-0 bg-transparent" type="button" aria-label="3 notifications"><img className="h-[18px] w-[18px]" src={asset('requester-bell.svg')} alt="" /><b className="absolute left-[18px] top-[3px] grid h-[15px] w-[15px] place-items-center rounded-full border-2 border-[#888a] bg-[#b4423e] text-[10px] leading-none text-white">3</b></button><button className="flex h-[42px] items-center gap-2 rounded-[26px] border-0 bg-[#f7f6f1] py-1 pl-1 pr-[9px] text-left" type="button" aria-expanded={accountOpen} onClick={() => setAccountOpen(open => !open)}><span className="grid h-7 w-7 place-items-center rounded-full bg-[#a9b8a7] text-xs">อก</span><span className="flex flex-col max-[520px]:hidden"><strong className="text-sm font-medium leading-4">Amika R.</strong><small className="text-xs leading-[14px] opacity-70">พนักงาน</small></span><img className="h-[15px] w-[15px] max-[520px]:hidden" src={asset('requester-chevron.svg')} alt="" /></button>{accountOpen ? <div className="absolute right-0 top-[50px] z-20 w-[170px] rounded-lg border border-[#d7dbde] bg-white p-3 text-sm shadow-[0_12px_30px_#2c3f6820]">Amika R.<br /><small>Requester / พนักงาน</small></div> : null}</div>
    </div>
  </header>
}

const statusStyles: Record<RequestStatus, string> = {
  pending: 'bg-[#e7ebef] text-[#5e6669]', draft: 'bg-[#d9d6cd] text-[#5e6669]', approved: 'bg-[#a9b8a7] text-[#405747]', rejected: 'border border-[#b4423eb3] bg-[#b4423e33] text-[#8c3431]', cancelled: 'bg-[#d9d6cd] text-[#5e6669]',
}

function Tabs({ active, onActiveRequests, onMyRequests, onHistory }: Pick<PageActions, 'onActiveRequests' | 'onMyRequests' | 'onHistory'> & { active: 'active' | 'all' | 'history' }) {
  const activeClass = 'border-b-[3px] border-[#4f6fae] font-semibold text-[#4f6fae]'
  return <div className="mt-[62px] flex h-[43px] items-end gap-10 border-b border-[#d7dbde] text-base text-[#888] max-[600px]:gap-5"><button className={`h-full border-0 bg-transparent px-0 ${active === 'active' ? activeClass : ''}`} type="button" aria-pressed={active === 'active'} onClick={onActiveRequests}>กำลังดำเนินการ　2</button><button className={`h-full border-0 bg-transparent px-0 ${active === 'history' ? activeClass : ''}`} type="button" aria-pressed={active === 'history'} onClick={onHistory}>◷ ประวัติคำขอ　3</button><button className={`h-full border-0 bg-transparent px-0 ${active === 'all' ? activeClass : ''}`} type="button" aria-pressed={active === 'all'} onClick={onMyRequests}>ทั้งหมด　5</button></div>
}

export function MyRequestsPage({ initialTab = 'all', ...props }: PageActions & { initialTab?: 'active' | 'all' }) {
  const [tab, setTab] = useState<'active' | 'all'>(initialTab)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [notice, setNotice] = useState('')
  const normalized = query.trim().toLocaleLowerCase()
  const visible = requests.filter(row => (tab === 'all' || row.status === 'pending' || row.status === 'draft') && (status === 'all' || row.status === status) && (!normalized || `${row.id} ${row.title} ${row.budget}`.toLocaleLowerCase().includes(normalized)))
  const showActive = () => { setTab('active'); setStatus('all') }
  const showAll = () => { setTab('all'); setStatus('all') }
  return <div className="min-h-svh bg-white text-[#222a2d] [font-family:'Noto_Sans_Thai','Bai_Jamjuree',sans-serif]" data-node-id="423:1641"><RequesterHeader active="requests" {...props} /><main className="mx-auto w-[min(1216px,calc(100%_-_48px))] pb-20 pt-7 max-[760px]:w-[calc(100%_-_32px)]"><h1 className="text-[28px] font-bold text-[#31456c]">คำขอของฉัน</h1><Tabs active={tab} onActiveRequests={showActive} onMyRequests={showAll} onHistory={props.onHistory} />
    <div className="mt-10 grid grid-cols-[1fr_104px_134px_auto] gap-3 max-[800px]:grid-cols-2"><input className="!h-[41px] !rounded-md !border-[#8883] px-3 text-sm" aria-label="Search requests" placeholder="เลขที่ PR, ชื่อรายการ หรือ Budget Code" value={query} onChange={event => setQuery(event.target.value)} /><select className="!h-[41px] !rounded-md !border-[#8883] px-3 text-sm" aria-label="Request status" value={status} onChange={event => setStatus(event.target.value)}><option value="all">ทุกสถานะ</option><option value="pending">รออนุมัติ</option><option value="draft">ฉบับร่าง</option><option value="approved">อนุมัติแล้ว</option><option value="rejected">ปฏิเสธ</option></select><select className="!h-[41px] !rounded-md !border-[#8883] px-3 text-sm" aria-label="Request month"><option>กันยายน 2569</option></select><button className="border-0 bg-transparent text-sm text-[#4f6fae]" type="button" onClick={() => { setQuery(''); setStatus('all') }}>ล้างตัวกรอง</button></div>
    {notice ? <div className="mt-4 rounded-md border border-[#b8c4da] bg-[#f7f9fc] px-4 py-2 text-sm text-[#31456c]" role="status">{notice}</div> : null}
    <div className="mt-7 overflow-x-auto rounded-lg border border-[#8883]"><table className="w-full min-w-[850px] border-collapse text-sm"><thead className="h-[51px] bg-[#f7f6f1] text-left font-medium text-[#888]"><tr><th className="w-[11%] px-5">ลำดับ</th><th className="w-[28%] px-5">เลขที่คำขอ / รายการ</th><th className="w-[24%] px-5">Budget Code</th><th className="w-[18%] px-5">สถานะ</th><th className="px-5">ดำเนินการ</th></tr></thead><tbody>{visible.map((row, index) => <tr className="h-[85px] border-t border-[#8883]" key={`${row.status}-${index}`}><td className="px-5 text-center">{index + 1}</td><td className="px-5"><strong className="block text-base">{row.id}</strong><span className="text-[#888]">{row.title}</span></td><td className="px-5"><strong className="block text-base">{row.budget}</strong><span className="text-[#888]">{row.date}</span></td><td className="px-5"><span className={`inline-flex min-h-[29px] items-center gap-1.5 rounded-lg px-2.5 ${statusStyles[row.status]}`}><span aria-hidden="true">{row.status === 'approved' ? '✓' : row.status === 'rejected' ? '×' : row.status === 'draft' ? '▤' : '◷'}</span>{row.statusText}</span></td><td className="px-5"><button className="flex items-center gap-[7px] border-0 bg-transparent text-[#4f6fae]" type="button" onClick={() => row.status === 'draft' ? props.onOpenDraft() : setNotice(`เปิดรายละเอียด ${row.id} — ${row.statusText}`)}><img className="h-[14px] w-[18px]" src={asset('requester-eye-outline.svg')} alt="" />{row.action}</button></td></tr>)}</tbody></table><div className="flex h-[82px] items-center justify-between px-8 text-sm text-[#888]"><span>แสดง {visible.length} จาก {tab === 'active' ? 2 : requests.length} รายการ</span><div className="flex gap-2"><button className="rounded-md border border-[#8883] bg-white px-4 py-2" type="button">ก่อนหน้า</button><button className="rounded-md border-0 bg-[#4f6fae] px-3 py-2 text-white" type="button">1</button><button className="rounded-md border border-[#8883] bg-white px-4 py-2" type="button">ถัดไป</button></div></div></div>
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
