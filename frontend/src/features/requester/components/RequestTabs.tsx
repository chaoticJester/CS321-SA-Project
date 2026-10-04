import type { PageActions } from '../types'

type RequestTabsProps = Pick<PageActions, 'onActiveRequests' | 'onMyRequests' | 'onHistory'> & {
  active: 'active' | 'all' | 'history'
  activeCount: number
  historyCount: number
  allCount: number
}

export function RequestTabs({ active, onActiveRequests, onMyRequests, onHistory, activeCount, historyCount, allCount }: RequestTabsProps) {
  const activeClass = 'border-b-[3px] border-[#4f6fae] font-semibold text-[#4f6fae]'

  return <div className="request-tabs mt-[37px] flex h-[43px] items-end gap-10 border-b border-[#d7dbde] text-base text-[#888] max-[600px]:gap-5">
    <button className={`h-full border-0 bg-transparent px-0 ${active === 'active' ? activeClass : ''}`} type="button" aria-pressed={active === 'active'} onClick={onActiveRequests} data-label={`กำลังดำเนินการ　${activeCount}`}><span>กำลังดำเนินการ　{activeCount}</span></button>
    <button className={`h-full border-0 bg-transparent px-0 ${active === 'history' ? activeClass : ''}`} type="button" aria-pressed={active === 'history'} onClick={onHistory} data-label={`◷ ประวัติคำขอ　${historyCount}`}><span>◷ ประวัติคำขอ　{historyCount}</span></button>
    <button className={`h-full border-0 bg-transparent px-0 ${active === 'all' ? activeClass : ''}`} type="button" aria-pressed={active === 'all'} onClick={onMyRequests} data-label={`ทั้งหมด　${allCount}`}><span>ทั้งหมด　{allCount}</span></button>
  </div>
}
