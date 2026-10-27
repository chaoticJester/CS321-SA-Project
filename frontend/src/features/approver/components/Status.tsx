import { asset, statusStyles } from '../data'

export function Status({ tone, children }: { tone: string; children: string }) {
  return <span className={`approver-status inline-flex items-center gap-1.5 whitespace-nowrap rounded-[26px] border px-[10px] py-1 text-sm ${statusStyles[tone]}`}><img className="h-3 w-3" src={asset(`approver-status-${tone}.svg`)} alt="" />{children}</span>
}
