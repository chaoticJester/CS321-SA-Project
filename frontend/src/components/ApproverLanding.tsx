import { useState } from 'react'

const asset = (name: string) => `${import.meta.env.BASE_URL}figma/${name}`

const queue = [
  { id: 'PR-2024-0582', subject: 'จัดซื้ออุปกรณ์สำนักงาน', owner: 'ณัฐวุฒิ · ฝ่ายจัดซื้อ', amount: '฿48,500', waiting: 'รอมา 3 วัน', overdue: true },
  { id: 'FN-2024-0198', subject: 'ค่าเดินทางไปประชุมลูกค้า', owner: 'กมลชนก · ฝ่ายการเงิน', amount: '฿12,400', waiting: 'รอมา 1 วัน' },
  { id: 'PR-2024-0577', subject: 'วัสดุสิ้นเปลืองสายการผลิต 2', owner: 'ธนกฤต · ฝ่ายผลิต', amount: '฿224,000', waiting: 'รอมา 4 วัน', overdue: true },
]

const totals = [
  { label: 'คำขอทั้งหมด', value: '1,240', delta: '12% จากเดือนก่อน', icon: 'approver-trend-total.svg' },
  { label: 'รออนุมัติ', value: '320', delta: '8% จากเดือนก่อน', icon: 'approver-trend-pending.svg' },
  { label: 'อนุมัติแล้ว', value: '860', delta: '15% จากเดือนก่อน', icon: 'approver-trend-approved.svg' },
  { label: 'ปฏิเสธ', value: '60', delta: '3% จากเดือนก่อน', icon: 'approver-trend-rejected.svg' },
]

const shares = [
  { label: 'จัดซื้อจัดจ้าง', count: '496 รายการ', percent: '40%', color: '#173f4a' },
  { label: 'ทรัพยากรบุคคล', count: '310 รายการ', percent: '25%', color: '#2c3f68' },
  { label: 'การเงิน', count: '248 รายการ', percent: '20%', color: '#4f6fae' },
  { label: 'ทั่วไป', count: '186 รายการ', percent: '15%', color: '#7fa0d5' },
]

const requests = [
  { id: 'PR-2024-0582', subject: 'จัดซื้ออุปกรณ์สำนักงาน', type: 'จัดซื้อจัดจ้าง', typeColor: '#173f4a', initials: 'ณว', owner: 'ณัฐวุฒิ', amount: '฿48,500', date: '28/05/2567', status: 'รออนุมัติ', tone: 'pending' },
  { id: 'HR-2024-0311', subject: 'อบรมหลักสูตรภายนอก', type: 'ทรัพยากรบุคคล', typeColor: '#2c3f68', initials: 'วศ', owner: 'วริศรา', amount: '฿86,000', date: '28/05/2567', status: 'อนุมัติแล้ว', tone: 'approved' },
  { id: 'FN-2024-0198', subject: 'ค่าเดินทางไปประชุมลูกค้า', type: 'การเงิน', typeColor: '#4f6fae', initials: 'กช', owner: 'กมลชนก', amount: '฿12,400', date: '27/05/2567', status: 'รออนุมัติ', tone: 'pending' },
  { id: 'GL-2024-0093', subject: 'ขอใช้งานห้องประชุมใหญ่', type: 'ทั่วไป', typeColor: '#7fa0d5', initials: 'ปก', owner: 'ปกรณ์', amount: '—', date: '27/05/2567', status: 'ปฏิเสธ', tone: 'rejected' },
]

const statusStyles: Record<string, string> = {
  pending: 'border-[#e0cb9b] bg-[#f4ebd8] text-[#825c1e]',
  approved: 'border-[#b9cdb8] bg-[#e5ede4] text-[#3d5f45]',
  rejected: 'border-[#e3b9b7] bg-[#f6e4e3] text-[#9e3a36]',
}

const navItem = 'flex min-h-[34px] items-center gap-[7px] whitespace-nowrap rounded-lg border-0 bg-transparent px-[10px] py-[7px] text-base font-medium text-[#31456cd1] no-underline hover:bg-[#e9eaf0] max-[760px]:text-[13px]'
const card = 'min-w-0 overflow-hidden rounded-[14px] border border-[#d7dbde] bg-white max-[1050px]:min-h-[406px]'
const sectionHeading = 'flex min-h-[42px] items-baseline justify-between border-b border-[#d7dbde] pb-[11px] max-[760px]:items-start max-[760px]:gap-3'

function Status({ tone, children }: { tone: string; children: string }) {
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[26px] border px-[10px] py-1 text-sm ${statusStyles[tone]}`}><img className="h-3 w-3" src={asset(`approver-status-${tone}.svg`)} alt="" />{children}</span>
}

export function ApproverLanding({ onSignOut }: { onSignOut: () => void }) {
  const [accountOpen, setAccountOpen] = useState(false)
  const [notice, setNotice] = useState('')

  function startApproval() {
    setNotice('เปิดคำขอ PR-2024-0582 สำหรับตรวจสอบแล้ว')
    document.getElementById('latest-requests')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return <div className="min-h-svh bg-white text-[#222a2d] [font-family:'Noto_Sans_Thai','Bai_Jamjuree',sans-serif]" data-node-id="367:2835">
    <header className="h-[84px] bg-[#f7f6f1] text-[#31456c] max-[760px]:h-auto">
      <div className="relative mx-auto flex h-[84px] w-[min(1216px,calc(100%_-_48px))] items-center max-[760px]:h-auto max-[760px]:min-h-[76px] max-[760px]:w-[calc(100%_-_32px)] max-[760px]:flex-wrap max-[760px]:gap-3 max-[760px]:py-4">
        <a className="flex items-center gap-[10px] text-[#222a2d] no-underline" href="#approver-top" aria-label="SA-PR dashboard">
          <span className="flex w-5 flex-col gap-1"><img className="block h-2 w-5" src={asset('approver-logo-top.svg')} alt="" /><img className="block h-2 w-5" src={asset('approver-logo-bottom.svg')} alt="" /></span>
          <strong className="text-xl leading-8 tracking-[-0.2px]">SA‑PR</strong>
        </a>
        <nav className="ml-[220px] flex items-center gap-5 max-[1050px]:ml-[60px] max-[760px]:order-3 max-[760px]:ml-0 max-[760px]:w-full max-[760px]:gap-1 max-[760px]:overflow-x-auto" aria-label="Approver navigation">
          <a className={navItem} href="#approver-overview"><img className="h-[18px] w-[18px]" src={asset('approver-dashboard.svg')} alt="" />แดชบอร์ด</a>
          <a className={navItem} href="#approver-queue"><img className="h-[18px] w-[18px]" src={asset('approver-requests.svg')} alt="" />รายการที่รออนุมัติ <b className="grid h-5 min-w-[27px] place-items-center rounded-[26px] bg-[#4f6fae] px-1.5 text-[11px] text-white">12</b></a>
          <button className={navItem} type="button" onClick={onSignOut}><span aria-hidden="true">↪</span>Log out</button>
        </nav>
        <div className="relative ml-auto flex items-center gap-1">
          <button className="relative grid h-[34px] w-[34px] place-items-center rounded-lg border-0 bg-transparent" type="button" aria-label="3 notifications" onClick={() => setNotice('คุณมีการแจ้งเตือนใหม่ 3 รายการ')}>
            <img className="h-[18px] w-[18px]" src={asset('approver-bell.svg')} alt="" /><b className="absolute left-[18px] top-[3px] grid h-[15px] w-[15px] place-items-center rounded-full border-2 border-[#888a] bg-[#b4423e] text-[10px] leading-none text-white [font-family:'Sarabun',sans-serif]">3</b>
          </button>
          <button className="flex h-[42px] min-w-[145px] items-center gap-2 rounded-[26px] border-0 bg-[#7fa0d559] py-1 pl-1 pr-[9px] text-left max-[760px]:w-12 max-[760px]:min-w-12 max-[760px]:pr-1" type="button" aria-expanded={accountOpen} onClick={() => setAccountOpen(open => !open)}>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs text-[#31456c]">ชช</span><span className="flex flex-1 flex-col text-[#222a2d] max-[760px]:hidden"><strong className="text-sm font-medium leading-4">Chatchai P.</strong><small className="text-xs leading-[14px] opacity-70">ผู้บริหาร</small></span><img className="h-[15px] w-[15px] max-[760px]:hidden" src={asset('approver-chevron.svg')} alt="" />
          </button>
          {accountOpen && <div className="absolute right-0 top-[50px] z-4 w-[175px] rounded-[9px] border border-[#d7dbde] bg-white p-[14px] text-[13px] shadow-[0_12px_30px_#2c3f6820]" role="status">ผู้อนุมัติระดับ 2<br /><small>Approver Level 2</small></div>}
        </div>
      </div>
    </header>

    <main id="approver-top" className="mx-auto min-h-[1586px] w-[min(1216px,calc(100%_-_48px))] py-20 pt-[84px] max-[760px]:w-[calc(100%_-_32px)] max-[760px]:pt-7 max-[430px]:w-[calc(100%_-_24px)]">
      {notice && <div className="fixed left-1/2 top-24 z-5 flex -translate-x-1/2 items-center gap-[18px] rounded-lg border border-[#b8c4da] bg-white py-[10px] pl-[18px] pr-[14px] text-sm text-[#31456c] shadow-[0_8px_28px_#1c2f501f]" role="status">{notice}<button className="border-0 bg-transparent text-xl" type="button" onClick={() => setNotice('')} aria-label="ปิดการแจ้งเตือน">×</button></div>}

      <section id="approver-queue" className="scroll-mt-5 rounded-[18px] bg-[#2c3f68] px-8 pb-[18px] pt-[30px] text-white max-[760px]:px-5 max-[760px]:pb-[14px] max-[760px]:pt-6" aria-labelledby="approval-queue-title">
        <div className="flex items-start justify-between pb-[26px] max-[760px]:gap-5 max-[430px]:flex-col">
          <div className="flex items-baseline gap-[22px] max-[760px]:items-start max-[760px]:gap-3"><strong className="text-[42px] leading-[76px] tracking-[-0.84px] [font-family:'Bai_Jamjuree',sans-serif] max-[760px]:text-[34px] max-[760px]:leading-[42px]">12</strong><div><h1 id="approval-queue-title" className="text-[28px] font-bold leading-[38px] [font-family:'Sarabun','Noto_Sans_Thai',sans-serif] max-[760px]:text-xl max-[760px]:leading-7">คำขอรอการอนุมัติของคุณ</h1><div className="mt-[10px] flex items-center gap-[26px] text-base leading-6 text-[#e7ebefb3] max-[760px]:flex-wrap max-[760px]:gap-x-[18px] max-[760px]:gap-y-[5px] max-[760px]:text-[13px]"><span className="flex items-center gap-[7px]">เก่าสุดรอมา <b className="font-medium text-white">3 วัน</b></span><span className="flex items-center gap-[7px] text-[#e6b865]"><img className="h-5 w-5" src={asset('approver-overdue.svg')} alt="" />เกินกำหนด <b className="font-medium">2 รายการ</b></span><span className="flex items-center gap-[7px]">รวมวงเงิน <b className="font-medium text-white">฿1,284,900</b></span></div></div></div>
          <button className="h-12 rounded-lg border-0 bg-white px-[26px] font-medium text-[#173f4a]! max-[760px]:whitespace-nowrap max-[760px]:px-[14px] max-[430px]:self-end" type="button" onClick={startApproval}>เริ่มอนุมัติ</button>
        </div>
        <div>{queue.map(item => <button className="grid min-h-[52px] w-full grid-cols-[128px_minmax(180px,1fr)_210px_96px_82px] items-center gap-[18px] border-0 border-t border-[#e7ebef29] bg-transparent py-[14px] pl-4 pr-[14px] text-left text-base text-white hover:bg-[#ffffff0a] max-[1050px]:grid-cols-[120px_minmax(170px,1fr)_170px_90px_82px] max-[1050px]:gap-3 max-[760px]:grid-cols-[1fr_auto] max-[760px]:gap-x-3 max-[760px]:gap-y-[5px] max-[760px]:px-0" type="button" key={item.id} onClick={() => setNotice(`เลือก ${item.id} — ${item.subject}`)}>
          <span className="text-[#e7ebefb3] [font-family:'Bai_Jamjuree',sans-serif] [font-weight:500] max-[760px]:col-start-1 max-[760px]:row-start-1">{item.id}</span><strong className="font-normal max-[760px]:col-span-full max-[760px]:row-start-2">{item.subject}</strong><span className="text-right text-[15px] text-[#e7ebef9e] max-[760px]:col-start-1 max-[760px]:row-start-3 max-[760px]:text-left">{item.owner}</span><b className="text-right font-medium max-[760px]:col-start-2 max-[760px]:row-start-3">{item.amount}</b><em className={`text-right not-italic max-[760px]:col-start-2 max-[760px]:row-start-1 ${item.overdue ? 'font-medium text-[#e6b865]' : 'text-[#e7ebef9e]'}`}>{item.waiting}</em>
        </button>)}</div>
      </section>

      <section id="approver-overview" className="mt-9 scroll-mt-5" aria-labelledby="overview-title">
        <header className={sectionHeading}><h2 id="overview-title" className="text-[22px] leading-[30px] text-[#222a2d]">ภาพรวมทั้งระบบ</h2><p className="text-base text-[#5e6669] max-[760px]:text-right max-[760px]:text-[13px]">ข้อมูลถึง 28 พฤษภาคม 2567 เวลา 09:41 น.</p></header>
        <div className="mt-[18px] grid grid-cols-4 overflow-hidden rounded-[10px] border border-[#d7dbde] max-[760px]:grid-cols-2">{totals.map((total, index) => <article className={`min-h-[129px] px-[22px] py-[18px] max-[430px]:p-[15px] ${index > 0 ? 'border-l border-[#d7dbde]' : ''} ${index > 1 ? 'max-[760px]:border-t' : ''} ${index === 2 ? 'max-[760px]:border-l-0' : ''}`} key={total.label}><p className="text-base leading-6 text-[#5e6669]">{total.label}</p><strong className="block text-[36px] leading-[45px] [font-family:'Bai_Jamjuree',sans-serif] max-[430px]:text-[30px]">{total.value}</strong><small className="flex items-center gap-[5px] pt-1 text-sm text-[#5e6669]"><img className="h-4 w-4" src={asset(total.icon)} alt="" />{total.delta}</small></article>)}</div>
      </section>

      <section className="mt-9 grid h-[406px] grid-cols-[769fr_429fr] gap-[18px] max-[1050px]:h-auto max-[1050px]:grid-cols-1" aria-label="Request statistics">
        <article className={card}>
          <header className="flex h-12 items-center justify-between px-[22px] pt-[18px] max-[760px]:h-auto max-[760px]:min-h-[70px] max-[760px]:items-start"><h2 className="text-[22px] leading-[30px] text-[#222a2d]">สถิติคำขอรายเดือน</h2><div className="flex gap-[18px] text-base max-[760px]:gap-[9px] max-[760px]:text-xs"><span className="flex items-center gap-[7px]"><i className="h-[10px] w-[10px] rounded-[3px] bg-[#4f6fae]" />คำขอทั้งหมด</span><span className="flex items-center gap-[7px]"><i className="h-[10px] w-[10px] rounded-[3px] bg-[#173f4a]" />อนุมัติแล้ว</span></div></header>
          <div className="overflow-hidden px-[22px] pt-[14px] max-[1050px]:overflow-x-auto"><div className="relative h-[290px] w-[725px]" aria-label="Monthly request line chart">
            {[1500, 1000, 500, 0].map((value, index) => <div className="absolute left-[46px] h-px w-[583px] bg-[#d7dbde]" key={value} style={{ top: `${16 + index * 80}px` }}><span className="absolute right-[calc(100%+10px)] top-[-7px] w-[30px] text-[11px] text-[#5e6669]">{value}</span></div>)}
            <img className="absolute inset-0 h-[290px] w-[725px]" src={asset('approver-chart-grid.svg')} alt="คำขอทั้งหมด" />
            <img className="absolute inset-0 h-[290px] w-[725px]" src={asset('approver-chart-line-total.svg')} alt="อนุมัติแล้ว" />
            <span className="absolute left-[641px] top-[25px] text-[11px] text-[#4f6fae]">คำขอทั้งหมด</span><span className="absolute left-[641px] top-[134px] text-[11px] text-[#173f4a]">อนุมัติแล้ว</span>
            <div className="absolute left-[23px] top-[270px] grid grid-cols-6 gap-[70.6px] text-center text-[11px] text-[#5e6669]">{['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.'].map(month => <span className="w-[46px]" key={month}>{month}</span>)}</div>
          </div></div>
          <button type="button" className="mx-[22px] mt-[14px] border-0 bg-transparent p-0 text-sm text-[#5e6669]!" onClick={() => setNotice('ข้อมูลรายเดือน: ม.ค. – มิ.ย. 2567')}>ดูเป็นตาราง</button>
        </article>

        <article className={card}>
          <header className="flex h-12 items-center justify-between px-[22px] pt-[18px] max-[760px]:h-auto max-[760px]:min-h-[70px] max-[760px]:items-start"><h2 className="text-[22px] leading-[30px] text-[#222a2d]">ประเภทคำขอ</h2></header>
          <div className="grid grid-cols-[159px_1fr] items-center gap-[30px] px-[27px] pt-[68px] max-[1050px]:grid-cols-[160px_260px] max-[1050px]:justify-center max-[760px]:grid-cols-[132px_minmax(160px,1fr)] max-[760px]:gap-[18px] max-[760px]:px-[18px] max-[760px]:py-[42px] max-[430px]:grid-cols-1 max-[430px]:justify-items-center">
            <div className="relative h-[132px] w-[132px]" aria-label="1,240 requests by type">
              <img className="absolute left-[66px] top-0 h-[118.67px] w-[65.2px]" src={asset('approver-chart-line-approved.svg')} alt="" />
              <img className="absolute left-[20.5px] top-[92.5px] h-[39.5px] w-[90.5px]" src={asset('approver-donut-1.svg')} alt="" />
              <img className="absolute left-0 top-[28.2px] h-[75.64px] w-[29.94px]" src={asset('approver-donut-2.svg')} alt="" />
              <img className="absolute left-[14.2px] top-0 h-[39.5px] w-[51.89px]" src={asset('approver-donut-3.svg')} alt="" />
              <strong className="absolute left-0 top-[46px] w-[132px] text-center text-[22px] leading-7 [font-family:'Bai_Jamjuree',sans-serif]">1,240</strong><small className="absolute left-0 top-[72px] w-[132px] text-center text-[11px]">คำขอทั้งหมด</small>
            </div>
            <div className="grid gap-3 max-[430px]:w-full">{shares.map(share => <div className="grid grid-cols-[10px_1fr_auto] items-start gap-[9px]" key={share.label}><span className="mt-[7px] h-[10px] w-[10px] rounded-sm" style={{ background: share.color }} /><p className="text-base leading-[22px] max-[760px]:text-[13px]">{share.label}<small className="block text-[13px] text-[#5e6669] max-[760px]:text-[11px]">{share.count}</small></p><strong className="text-base leading-6 max-[760px]:text-[13px]">{share.percent}</strong></div>)}</div>
          </div>
        </article>
      </section>

      <section id="latest-requests" className="mt-9 scroll-mt-5" aria-labelledby="latest-title">
        <header className={sectionHeading}><h2 id="latest-title" className="text-[22px] leading-[30px] text-[#222a2d]">คำขอล่าสุด</h2><button className="border-0 bg-transparent text-base text-[#4f6fae]! underline max-[760px]:max-w-[180px] max-[760px]:text-right" type="button" onClick={() => setNotice('กำลังแสดง 4 รายการล่าสุดจากทั้งหมด 1,240 รายการ')}>ดูคำขอทั้งหมด 1,240 รายการ</button></header>
        <div className="mt-[18px] overflow-x-auto"><table className="w-full min-w-[1000px] table-fixed border-collapse text-base">
          <thead><tr className="h-[29px] text-left text-sm font-normal text-[#5e6669]"><th className="w-[154px] px-4 font-normal">เลขที่คำขอ</th><th className="w-[344px] px-4 font-normal">เรื่อง</th><th className="w-[174px] px-4 font-normal">ประเภท</th><th className="w-36 px-4 font-normal">ผู้ขอ</th><th className="w-[124px] px-4 font-normal">จำนวนเงิน</th><th className="w-[124px] px-4 font-normal">วันที่</th><th className="w-[136px] px-4 font-normal">สถานะ</th></tr></thead>
          <tbody>{requests.map(request => <tr className="h-14 cursor-pointer border-t border-[#d7dbde] hover:bg-[#f8f9fb]" key={request.id} onClick={() => setNotice(`เลือก ${request.id} — ${request.subject}`)}>
            <td className="px-4 [font-family:'Bai_Jamjuree',sans-serif]">{request.id}</td><td className="px-4">{request.subject}</td><td className="px-4"><span className="mr-[7px] inline-block h-2 w-2 rounded-sm" style={{ background: request.typeColor }} />{request.type}</td><td className="px-4"><span className="mr-2 inline-grid h-[26px] w-[26px] place-items-center rounded-full bg-[#e7ebef] text-[11px] leading-none text-[#5e6669] [font-family:'Sarabun',sans-serif] [font-weight:700]">{request.initials}</span>{request.owner}</td><td className="px-4 text-right [font-family:'Bai_Jamjuree',sans-serif]">{request.amount}</td><td className="px-4 text-[#5e6669] [font-family:'Bai_Jamjuree',sans-serif]">{request.date}</td><td className="px-4"><Status tone={request.tone}>{request.status}</Status></td>
          </tr>)}</tbody>
        </table></div>
      </section>
    </main>
  </div>
}
