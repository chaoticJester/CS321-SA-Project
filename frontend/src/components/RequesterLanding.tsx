import { useEffect, useState } from 'react'
import { listMyPrs } from '../api'
import { grandTotal, money, requestCounts } from '../model'
import type { Requisition } from '../model'
import { RequesterHeader } from './RequesterHeader'

const asset = (name: string) => `${import.meta.env.BASE_URL}figma/${name}`

const statusMeta = {
  pending: { label: 'รออนุมัติ', icon: '◷', className: 'bg-[#e7ebef] text-[#5e6669]' },
  approved: { label: 'อนุมัติแล้ว', icon: '✓', className: 'bg-[#a9b8a7] text-[#405747]' },
  rejected: { label: 'ปฏิเสธ', icon: '×', className: 'border border-[#b4423eb3] bg-[#b4423e33] text-[#8c3431]' },
} as const

type LandingProps = {
  onCreate: () => void
  onMyRequests: () => void
  onOpenDetail: (request: Requisition) => void
  onSignOut: () => void
}

export function RequesterLanding({ onCreate, onMyRequests, onOpenDetail, onSignOut }: LandingProps) {
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [requests, setRequests] = useState<Requisition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    listMyPrs()
      .then(values => { if (active) setRequests(values) })
      .catch(error => { if (active) setNotice(error instanceof Error ? error.message : 'Could not load your requests.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const counts = requestCounts(requests)
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const visibleRequests = normalizedQuery
    ? requests.filter(request => `${request.reference} ${request.basic.job} ${request.basic.budgetCode} ${request.status}`.toLocaleLowerCase().includes(normalizedQuery))
    : requests

  return <div className="min-h-svh bg-white text-[#222a2d] [font-family:'Noto_Sans_Thai','Bai_Jamjuree',sans-serif]" data-node-id="419:1665">
    <RequesterHeader active="home" onHome={() => document.querySelector('#requester-main')?.scrollIntoView({ behavior: 'smooth' })} onMyRequests={onMyRequests} onSignOut={onSignOut} searchValue={query} onSearchChange={setQuery} onNotifications={() => setNotice(`คุณมีคำขอที่กำลังดำเนินการ ${counts.active} รายการ`)} searchLabel="Search your requests" />

    <main id="requester-main" className="relative mx-auto min-h-[940px] w-[min(1216px,calc(100%_-_48px))] pt-[137px] max-[1050px]:w-[calc(100%_-_32px)] max-[760px]:pt-12">
      {notice && <div className="fixed left-1/2 top-24 z-30 flex -translate-x-1/2 items-center gap-5 rounded-lg border border-[#b8c4da] bg-white py-[10px] pl-[18px] pr-[14px] text-sm text-[#31456c] shadow-[0_8px_28px_#1c2f501f]" role="status">{notice}<button className="border-0 bg-transparent text-xl" type="button" onClick={() => setNotice('')} aria-label="Close notification">×</button></div>}
      <button className="absolute right-[35px] top-[47px] flex h-[43px] w-[148px] items-center justify-center gap-2 rounded-md border-0 bg-[#4f6fae] px-[13px] text-lg font-medium !text-white hover:bg-[#405f9d] max-[760px]:right-0 max-[760px]:top-4" type="button" onClick={onCreate} data-node-id="419:1666"><img className="h-[15px] w-[15px]" src={asset('requester-plus.svg')} alt="" />สร้างคำขอ</button>
      <section className="min-h-[803px] bg-[#f7f6f166] shadow-[0_4px_4px_#00000012]" aria-labelledby="requests-title">
        <header className="flex min-h-[79px] flex-wrap items-center justify-between gap-3 rounded bg-[#f7f6f1] px-[33px] py-4 shadow-[4px_4px_4px_#00000017]"><h1 id="requests-title" className="text-[28px] font-semibold leading-normal text-[#17414dcc] max-[520px]:text-[22px]">My Purchase Requisitions</h1><button className="border-0 bg-transparent text-sm text-[#4f6fae]" type="button" onClick={onMyRequests}>ทั้งหมด {counts.all}　·　กำลังดำเนินการ {counts.active}　·　ประวัติ {counts.history}</button></header>
        <div className="grid grid-cols-3 gap-[33px] px-[33px] py-[47px] max-[950px]:grid-cols-2 max-[650px]:grid-cols-1 max-[520px]:px-4">
          {visibleRequests.map(request => { const status = request.status || 'pending'; const meta = statusMeta[status]; return <article className="flex min-h-[433px] flex-col rounded-md bg-[#88888859] px-[25px] py-5" key={request.backendId || request.reference}>
            <div className="flex h-[268px] w-full flex-col rounded-md bg-white p-6 text-sm shadow-sm" aria-label={`${request.reference} summary`}>
              <div className="flex items-start justify-between gap-3"><strong className="text-lg text-[#31456c]">{request.reference || request.backendId}</strong><span className={`inline-flex min-h-[29px] items-center gap-1.5 rounded-lg px-2.5 ${meta.className}`}><span aria-hidden="true">{meta.icon}</span>{meta.label}</span></div>
              <h2 className="mt-7 text-xl font-semibold text-[#222a2d]">{request.basic.job || 'Purchase Requisition'}</h2>
              <dl className="mt-5 grid gap-3 text-[#5e6669]"><div><dt className="inline">Budget Code: </dt><dd className="inline font-medium text-[#222a2d]">{request.basic.budgetCode || request.basic.budgetType || '—'}</dd></div><div><dt className="inline">วันที่ส่ง: </dt><dd className="inline font-medium text-[#222a2d]">{new Date(request.createdAt).toLocaleDateString('th-TH')}</dd></div></dl>
              <strong className="mt-auto text-right text-xl text-[#31456c]">฿{money(grandTotal(request.items))}</strong>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center gap-[14px] pt-5"><p className="text-center text-base font-medium leading-6">{request.basic.purpose || 'Purchase Requisition'}</p><button className="flex items-center gap-[7px] border-0 bg-transparent text-sm font-medium leading-6 text-[#4f6fae] hover:underline" type="button" onClick={() => onOpenDetail(request)}><img className="h-[14px] w-[18px]" src={asset('requester-eye-outline.svg')} alt="" />ดูรายละเอียด</button></div>
          </article> })}
          {loading && <p className="col-span-full py-20 text-center text-[#5e6669]" role="status">กำลังโหลดคำขอ… / Loading requests…</p>}
          {!loading && !visibleRequests.length && <p className="col-span-full py-20 text-center text-[#5e6669]">{requests.length ? 'ไม่พบคำขอที่ตรงกับการค้นหา / No matching requests' : 'ยังไม่มีคำขอที่ส่งแล้ว / No submitted requests yet'}</p>}
        </div>
      </section>
    </main>
  </div>
}
