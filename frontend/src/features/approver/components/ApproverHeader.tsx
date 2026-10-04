import { ProfileMenu } from '../../../components/ProfileMenu'
import type { Employee } from '../../../api'
import { NotificationButton } from '../../../components/NotificationButton'
import { asset } from '../data'
import type { ApproverView } from '../types'

const navItem = 'flex min-h-[34px] items-center gap-[7px] whitespace-nowrap rounded-lg border-0 bg-transparent px-[10px] py-[7px] text-base font-medium text-[#31456cd1] no-underline hover:bg-[#e9eaf0] max-[760px]:text-[13px]'

type Props = {
  employee: Employee
  pendingCount: number
  notificationCount: number
  view: ApproverView
  onView: (view: ApproverView) => void
  onSignOut: () => void
  onNotifications: () => void
}

export function ApproverHeader({ employee, pendingCount, notificationCount, view, onView, onSignOut, onNotifications }: Props) {
  const initials = employee.full_name.split(/\s+/).map(part => part[0]).join('').slice(0, 2)

  return <header className="approver-header h-[84px] bg-[#f7f6f1] text-[#31456c] max-[760px]:h-auto">
    <div className="relative mx-auto grid h-[84px] w-[min(1216px,calc(100%_-_48px))] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-6 max-[760px]:flex max-[760px]:h-auto max-[760px]:min-h-[76px] max-[760px]:w-[calc(100%_-_32px)] max-[760px]:flex-wrap max-[760px]:gap-3 max-[760px]:py-4">
      <button className="flex items-center gap-[10px] border-0 bg-transparent p-0 text-[#222a2d]" type="button" onClick={() => onView('dashboard')} aria-label="SA-PR dashboard">
        <span className="flex w-5 flex-col gap-1"><img className="block h-2 w-5" src={asset('approver-logo-top.svg')} alt="" /><img className="block h-2 w-5" src={asset('approver-logo-bottom.svg')} alt="" /></span><strong className="text-xl leading-8 tracking-[-0.2px]">SA‑PR</strong>
      </button>
      <nav className="flex items-center justify-center gap-5 max-[760px]:order-3 max-[760px]:w-full max-[760px]:gap-1 max-[760px]:overflow-x-auto" aria-label="Approver navigation">
        <button className={`${navItem} ${view === 'dashboard' ? 'bg-[#e9eaf0]' : ''}`} type="button" onClick={() => onView('dashboard')}><img className="h-[18px] w-[18px]" src={asset('approver-dashboard.svg')} alt="" />แดชบอร์ด</button>
        <button className={`${navItem} ${['pending', 'history', 'detail', 'request-detail', 'all'].includes(view) ? 'bg-[#e9eaf0]' : ''}`} type="button" onClick={() => onView('pending')}><img className="h-[18px] w-[18px]" src={asset('approver-requests.svg')} alt="" />รายการที่รออนุมัติ <b className="grid h-5 min-w-[27px] place-items-center rounded-[26px] bg-[#4f6fae] px-1.5 text-[11px] text-white">{pendingCount}</b></button>
      </nav>
      <div className="relative ml-auto flex shrink-0 items-center gap-1">
        <NotificationButton count={notificationCount} onClick={onNotifications} />
        <ProfileMenu className="flex h-[42px] min-w-[145px] items-center gap-2 rounded-[26px] border-0 bg-[#7fa0d559] py-1 pl-1 pr-[9px] text-left max-[760px]:w-12 max-[760px]:min-w-12 max-[760px]:pr-1" onSignOut={onSignOut}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs text-[#31456c]">{initials}</span><span className="flex flex-1 flex-col text-[#222a2d] max-[760px]:hidden"><strong className="text-sm font-medium leading-4">{employee.full_name}</strong><small className="text-xs leading-[14px] opacity-70">{employee.position || 'ผู้บริหาร'}</small></span><img className="h-[15px] w-[15px] max-[760px]:hidden" src={asset('approver-chevron.svg')} alt="" /></ProfileMenu>
      </div>
    </div>
  </header>
}
