import { useState } from 'react'

const asset = (name: string) => `${import.meta.env.BASE_URL}figma/${name}`

const examples = [
  { id: 'PR-2024-0582', title: 'Notebook สำหรับทีมพัฒนา' },
  { id: 'PR-2024-0582', title: 'อุปกรณ์สำนักงาน' },
  { id: 'PR-2024-0582', title: 'บริการบำรุงรักษาเครื่องปรับอากาศ' },
]

const navItem = 'flex min-h-[34px] items-center gap-[7px] whitespace-nowrap rounded-lg border-0 bg-transparent px-[10px] py-[7px] text-base font-medium text-[#5e6669] no-underline hover:bg-white/60 max-[760px]:text-sm'

export function RequesterLanding({ onCreate, onMyRequests, onSignOut }: { onCreate: () => void; onMyRequests: () => void; onSignOut: () => void }) {
  const [query, setQuery] = useState('')
  const [accountOpen, setAccountOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const visibleExamples = normalizedQuery ? examples.filter(example => `${example.id} ${example.title}`.toLocaleLowerCase().includes(normalizedQuery)) : examples

  return <div className="min-h-svh bg-white text-[#222a2d] [font-family:'Noto_Sans_Thai','Bai_Jamjuree',sans-serif]" data-node-id="419:1665">
    <header className="h-[84px] rounded-b-md bg-[#e7ebef] text-[#31456c] max-[760px]:h-auto">
      <div className="relative mx-auto flex h-[84px] w-[min(1216px,calc(100%_-_48px))] items-center max-[1050px]:w-[calc(100%_-_32px)] max-[760px]:h-auto max-[760px]:min-h-[76px] max-[760px]:flex-wrap max-[760px]:gap-3 max-[760px]:py-4">
        <a className="flex items-center gap-[10px] text-[#222a2d] no-underline" href="#requester-main" aria-label="SA-PR home">
          <span className="flex w-5 flex-col gap-1"><img className="block h-2 w-5" src={asset('requester-logo-top.svg')} alt="" /><img className="block h-2 w-5" src={asset('requester-logo-bottom.svg')} alt="" /></span>
          <strong className="text-xl leading-8 tracking-[-0.2px]">SA‑PR</strong>
        </a>
        <nav className="ml-4 flex items-center gap-0.5 max-[760px]:order-3 max-[760px]:ml-0 max-[760px]:w-full max-[760px]:overflow-x-auto" aria-label="Requester navigation">
          <a className={`${navItem} bg-white/30`} href="#requester-main"><img className="h-[18px] w-[18px]" src={asset('requester-home.svg')} alt="" />หน้าหลัก</a>
          <button className={navItem} type="button" onClick={onMyRequests}><img className="h-[18px] w-[18px]" src={asset('requester-requests.svg')} alt="" />คำขอของฉัน</button>
          <button className={navItem} type="button" onClick={onSignOut}><span className="text-xl leading-none" aria-hidden="true">↪</span>Log out</button>
        </nav>
        <label className="relative ml-auto block w-[540px] max-[1180px]:w-[34vw] max-[760px]:order-2 max-[760px]:w-[calc(100%_-_190px)] max-[520px]:order-4 max-[520px]:w-full">
          <span className="sr-only">Search examples</span>
          <span className="pointer-events-none absolute left-[18px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full border-[3px] border-[#888] after:absolute after:left-[12px] after:top-[11px] after:h-[7px] after:w-[3px] after:rotate-[-45deg] after:rounded-full after:bg-[#888]" />
          <input className="!h-[50px] w-full !rounded-[22px] !border-2 !border-[#8883] !bg-white !py-2 !pl-12 !pr-4 text-base outline-none focus:!border-[#7fa0d5]" value={query} onChange={event => setQuery(event.target.value)} />
        </label>
        <div className="relative ml-[18px] flex items-center gap-1 max-[760px]:ml-auto">
          <button className="relative grid h-[34px] w-[34px] place-items-center rounded-lg border-0 bg-transparent" type="button" aria-label="3 notifications" onClick={() => setNotice('คุณมีการแจ้งเตือนใหม่ 3 รายการ')}>
            <img className="h-[18px] w-[18px]" src={asset('requester-bell.svg')} alt="" /><b className="absolute left-[18px] top-[3px] grid h-[15px] w-[15px] place-items-center rounded-full border-2 border-[#888a] bg-[#b4423e] text-[10px] leading-none text-white [font-family:'Sarabun',sans-serif]">3</b>
          </button>
          <button className="flex h-[42px] items-center gap-2 rounded-[26px] border-0 bg-[#f7f6f1] py-1 pl-1 pr-[9px] text-left" type="button" aria-expanded={accountOpen} onClick={() => setAccountOpen(open => !open)}>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#a9b8a7] text-xs text-[#5e6669]">อก</span><span className="flex flex-col text-[#5e6669] max-[520px]:hidden"><strong className="text-sm font-medium leading-4">Amika R.</strong><small className="text-xs leading-[14px] opacity-70">พนักงาน</small></span><img className="h-[15px] w-[15px] max-[520px]:hidden" src={asset('requester-chevron.svg')} alt="" />
          </button>
          {accountOpen && <div className="absolute right-0 top-[50px] z-20 w-[170px] rounded-lg border border-[#d7dbde] bg-white p-3 text-sm shadow-[0_12px_30px_#2c3f6820]" role="status">Amika R.<br /><small>Requester / พนักงาน</small></div>}
        </div>
      </div>
    </header>

    <main id="requester-main" className="relative mx-auto min-h-[940px] w-[min(1216px,calc(100%_-_48px))] pt-[137px] max-[1050px]:w-[calc(100%_-_32px)] max-[760px]:pt-12">
      {notice && <div className="fixed left-1/2 top-24 z-30 flex -translate-x-1/2 items-center gap-5 rounded-lg border border-[#b8c4da] bg-white py-[10px] pl-[18px] pr-[14px] text-sm text-[#31456c] shadow-[0_8px_28px_#1c2f501f]" role="status">{notice}<button className="border-0 bg-transparent text-xl" type="button" onClick={() => setNotice('')} aria-label="Close notification">×</button></div>}
      <button className="absolute right-[35px] top-[47px] flex h-[43px] w-[148px] items-center justify-center gap-2 rounded-md border-0 bg-[#4f6fae] px-[13px] text-lg font-medium !text-white hover:bg-[#405f9d] max-[760px]:right-0 max-[760px]:top-4" type="button" onClick={onCreate} data-node-id="419:1666"><img className="h-[15px] w-[15px]" src={asset('requester-plus.svg')} alt="" />สร้างคำขอ</button>
      <section className="min-h-[803px] bg-[#f7f6f166] shadow-[0_4px_4px_#00000012]" aria-labelledby="examples-title">
        <header className="flex h-[79px] items-center rounded bg-[#f7f6f1] px-[33px] shadow-[4px_4px_4px_#00000017]"><h1 id="examples-title" className="text-[28px] font-semibold leading-normal text-[#17414dcc] max-[520px]:text-[22px]">Example Purchase Requisition</h1></header>
        <div className="grid grid-cols-3 gap-[33px] px-[33px] pt-[47px] max-[950px]:grid-cols-2 max-[650px]:grid-cols-1 max-[520px]:px-4">
          {visibleExamples.map((example, index) => <article className="flex h-[433px] flex-col items-center rounded-md bg-[#88888859] px-[25px] py-5" key={`${example.title}-${index}`}>
            <div className="h-[268px] w-full rounded-md bg-white" aria-hidden="true" />
            <div className="flex flex-col items-center gap-[14px] pt-5">
              <h2 className="text-center text-[28px] font-medium leading-6 text-[#31456c]">{example.id}</h2>
              <p className="min-h-6 text-center text-base font-medium leading-6">{example.title}</p>
              <button className="flex items-center gap-[7px] border-0 bg-transparent text-sm font-medium leading-6 text-[#4f6fae] hover:underline" type="button" onClick={() => setNotice(`เปิดตัวอย่าง ${example.id} — ${example.title}`)}><img className="h-[14px] w-[18px]" src={asset('requester-eye-outline.svg')} alt="" />ดูตัวอย่าง PDF</button>
            </div>
          </article>)}
          {!visibleExamples.length && <p className="col-span-full py-20 text-center text-[#5e6669]">ไม่พบตัวอย่างที่ตรงกับการค้นหา / No matching examples</p>}
        </div>
      </section>
    </main>
  </div>
}
