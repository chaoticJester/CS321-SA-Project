import { useState } from 'react'
import { RequesterHeader } from './RequesterHeader'

const asset = (name: string) => `${import.meta.env.BASE_URL}figma/${name}`

const examples = [
  { id: 'PR-2024-0582', title: 'Notebook สำหรับทีมพัฒนา' },
  { id: 'PR-2024-0582', title: 'อุปกรณ์สำนักงาน' },
  { id: 'PR-2024-0582', title: 'บริการบำรุงรักษาเครื่องปรับอากาศ' },
]

export function RequesterLanding({ onCreate, onMyRequests, onSignOut }: { onCreate: () => void; onMyRequests: () => void; onSignOut: () => void }) {
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const visibleExamples = normalizedQuery ? examples.filter(example => `${example.id} ${example.title}`.toLocaleLowerCase().includes(normalizedQuery)) : examples

  return <div className="min-h-svh bg-white text-[#222a2d] [font-family:'Noto_Sans_Thai','Bai_Jamjuree',sans-serif]" data-node-id="419:1665">
    <RequesterHeader active="home" onHome={() => document.querySelector('#requester-main')?.scrollIntoView({ behavior: 'smooth' })} onMyRequests={onMyRequests} onSignOut={onSignOut} searchValue={query} onSearchChange={setQuery} onNotifications={() => setNotice('คุณมีการแจ้งเตือนใหม่ 3 รายการ')} searchLabel="Search examples" />

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
