import { useState } from 'react'

const asset = (name: string) => `${import.meta.env.BASE_URL}figma/${name}`

const navItem = 'flex min-h-[34px] items-center gap-[7px] whitespace-nowrap rounded-lg border-0 bg-transparent px-[10px] py-[7px] text-base font-medium text-[#5e6669] hover:bg-white/60 max-[760px]:text-sm'

type RequesterHeaderProps = {
  active?: 'home' | 'requests'
  onHome: () => void
  onMyRequests: () => void
  onSignOut: () => void
  searchValue?: string
  onSearchChange?: (value: string) => void
  onNotifications?: () => void
  searchLabel?: string
}

export function RequesterHeader({ active, onHome, onMyRequests, onSignOut, searchValue, onSearchChange, onNotifications, searchLabel = 'Global search' }: RequesterHeaderProps) {
  const [accountOpen, setAccountOpen] = useState(false)

  return <header className="requester-header h-[84px] rounded-b-md bg-[#e7ebef] text-[#31456c] max-[760px]:h-auto">
    <div className="relative mx-auto flex h-[84px] w-[min(1216px,calc(100%_-_48px))] items-center max-[1050px]:w-[calc(100%_-_32px)] max-[760px]:h-auto max-[760px]:min-h-[76px] max-[760px]:flex-wrap max-[760px]:gap-3 max-[760px]:py-4">
      <button className="flex items-center gap-[10px] border-0 bg-transparent p-0 text-[#222a2d]" type="button" onClick={onHome} aria-label="SA-PR home">
        <span className="flex w-5 flex-col gap-1"><img className="block h-2 w-5" src={asset('requester-logo-top.svg')} alt="" /><img className="block h-2 w-5" src={asset('requester-logo-bottom.svg')} alt="" /></span>
        <strong className="text-xl leading-8 tracking-[-0.2px]">SA‑PR</strong>
      </button>
      <nav className="ml-4 flex items-center gap-0.5 max-[760px]:order-3 max-[760px]:ml-0 max-[760px]:w-full max-[760px]:overflow-x-auto" aria-label="Requester navigation">
        <button className={`${navItem} ${active === 'home' ? 'bg-white/30' : ''}`} type="button" onClick={onHome}><img className="h-[18px] w-[18px]" src={asset('requester-home.svg')} alt="" />หน้าหลัก</button>
        <button className={`${navItem} ${active === 'requests' ? 'bg-white/30' : ''}`} type="button" onClick={onMyRequests}><img className="h-[18px] w-[18px]" src={asset('requester-requests.svg')} alt="" />คำขอของฉัน</button>
        <button className={navItem} type="button" onClick={onSignOut}><span className="text-xl leading-none" aria-hidden="true">↪</span>Log out</button>
      </nav>
      <label className="relative ml-auto block w-[540px] max-[1180px]:w-[34vw] max-[760px]:order-2 max-[760px]:w-[calc(100%_-_190px)] max-[520px]:order-4 max-[520px]:w-full">
        <span className="sr-only">{searchLabel}</span>
        <span className="pointer-events-none absolute left-[18px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full border-[3px] border-[#888] after:absolute after:left-[12px] after:top-[11px] after:h-[7px] after:w-[3px] after:rotate-[-45deg] after:rounded-full after:bg-[#888]" />
        <input className="!h-[50px] w-full !rounded-[22px] !border-2 !border-[#8883] !bg-white !py-2 !pl-12 !pr-4 text-base outline-none focus:!border-[#7fa0d5]" aria-label={searchLabel} value={searchValue ?? ''} onChange={event => onSearchChange?.(event.target.value)} readOnly={!onSearchChange} />
      </label>
      <div className="relative ml-[18px] flex items-center gap-1 max-[760px]:ml-auto">
        <button className="relative grid h-[34px] w-[34px] place-items-center rounded-lg border-0 bg-transparent" type="button" aria-label="3 notifications" onClick={onNotifications}>
          <img className="h-[18px] w-[18px]" src={asset('requester-bell.svg')} alt="" /><b className="absolute left-[18px] top-[3px] grid h-[15px] w-[15px] place-items-center rounded-full border-2 border-[#888a] bg-[#b4423e] text-[10px] leading-none text-white [font-family:'Sarabun',sans-serif]">3</b>
        </button>
        <button className="flex h-[42px] items-center gap-2 rounded-[26px] border-0 bg-[#f7f6f1] py-1 pl-1 pr-[9px] text-left" type="button" aria-expanded={accountOpen} onClick={() => setAccountOpen(open => !open)}>
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#a9b8a7] text-xs text-[#5e6669]">อก</span><span className="flex flex-col text-[#5e6669] max-[520px]:hidden"><strong className="text-sm font-medium leading-4">Amika R.</strong><small className="text-xs leading-[14px] opacity-70">พนักงาน</small></span><img className="h-[15px] w-[15px] max-[520px]:hidden" src={asset('requester-chevron.svg')} alt="" />
        </button>
        {accountOpen ? <div className="absolute right-0 top-[50px] z-20 w-[170px] rounded-lg border border-[#d7dbde] bg-white p-3 text-sm shadow-[0_12px_30px_#2c3f6820]" role="status">Amika R.<br /><small>Requester / พนักงาน</small></div> : null}
      </div>
    </div>
  </header>
}
