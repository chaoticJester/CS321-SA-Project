import { TrendingDown, TrendingUp } from 'lucide-react'
import type { ApprovalHistoryItem, PendingApproval } from '../../../api'
import { asset } from '../data'
import type { ApprovalQueueItem } from '../types'
import { Status } from '../components/Status'

type Props = {
  pending: PendingApproval[]
  history: ApprovalHistoryItem[]
  queue: ApprovalQueueItem[]
  queueTotal: number
  oldestDays: number
  loadedAt: number
  loading: boolean
  onStartApproval: () => void
  onOpenApproval: (item: PendingApproval) => void
  onOpenDetail: (item: PendingApproval) => void
  onOpenPending: () => void
}

export function ApproverDashboard({ pending, history, queue, queueTotal, oldestDays, loadedAt, loading, onStartApproval, onOpenApproval, onOpenDetail, onOpenPending }: Props) {
  const all = [...new Map([...pending, ...history].map(item => [item.pr_id, item])).values()]
  const approved = history.filter(item => item.decision === 'approved')
  const rejected = history.filter(item => item.decision === 'rejected')
  const overdueCount = queue.filter(item => item.overdue).length
  const latest = [...all].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 4)
  const totals = [{ label: 'คำขอทั้งหมด', value: all.length }, { label: 'รออนุมัติ', value: pending.length }, { label: 'อนุมัติแล้ว', value: approved.length }, { label: 'ปฏิเสธ', value: rejected.length }]
  const monthKeys = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(loadedAt)
    date.setDate(1); date.setMonth(date.getMonth() - 5 + index)
    return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, label: date.toLocaleDateString('th-TH', { month: 'short' }) }
  })
  const monthly = monthKeys.map(month => ({ ...month, total: all.filter(item => item.created_at.startsWith(month.key)).length, approved: approved.filter(item => item.approved_at.startsWith(month.key)).length }))
  const lastMonth = monthKeys.at(-2)?.key || ''
  const thisMonth = monthKeys.at(-1)?.key || ''
  const monthlyChange = (index: number) => {
    const rows = [all, pending, approved, rejected][index]
    const dateFor = (item: PendingApproval) => 'approved_at' in item ? String(item.approved_at) : item.created_at
    const previous = rows.filter(item => dateFor(item).startsWith(lastMonth)).length
    const current = rows.filter(item => dateFor(item).startsWith(thisMonth)).length
    return previous ? Math.round((current - previous) / previous * 100) : 0
  }
  const maximum = Math.max(1, ...monthly.map(item => item.total), ...monthly.map(item => item.approved))
  const points = (field: 'total' | 'approved') => monthly.map((item, index) => `${45 + index * 96},${245 - item[field] / maximum * 200}`).join(' ')
  const categoryCounts = new Map<string, number>()
  for (const item of all) { const label = item.asset_type || 'จัดซื้อจัดจ้าง'; categoryCounts.set(label, (categoryCounts.get(label) || 0) + 1) }
  const categories = [...categoryCounts].slice(0, 4)
  const colors = ['#173f4a', '#2c3f68', '#4f6fae', '#7fa0d5']
  let offset = 0
  const gradient = categories.map(([, count], index) => { const start = offset; offset += count / Math.max(1, all.length) * 100; return `${colors[index]} ${start}% ${offset}%` }).join(', ')
  return <div className="dashboard-design" data-node-id="367:2835">
    <section className="dashboard-queue"><div className="dashboard-queue-heading"><div><h1><strong>{pending.length}</strong> คำขอรอการอนุมัติของคุณ</h1><p>เก่าสุดรอมา <b>{oldestDays} วัน</b><span><img width="20" height="20" src={asset('approver-overdue.svg')} alt="" />เกินกำหนด {overdueCount} รายการ</span>รวมวงเงิน <b>฿{queueTotal.toLocaleString('en-US')}</b></p></div><button type="button" onClick={onStartApproval} disabled={loading}>เริ่มอนุมัติ</button></div>
    {queue.slice(0, 3).map(item => <button className="dashboard-queue-row" type="button" key={item.prId} onClick={() => { const request = pending.find(value => value.pr_id === item.prId); if (request) onOpenApproval(request) }}><span>{item.id}</span><strong>{item.subject}</strong><span>{item.owner}</span><b>{item.amount}</b><em className={item.overdue ? 'overdue' : ''}>{item.waiting}</em></button>)}
    {loading ? <p role="status" className="dashboard-queue-state">กำลังโหลดคำขอ…</p> : !queue.length ? <p className="dashboard-queue-state">ไม่มีคำขอที่รออนุมัติ</p> : null}</section>
    <section className="dashboard-overview"><header><h2>ภาพรวมทั้งระบบ</h2><p>ข้อมูลถึง {new Date(loadedAt).toLocaleString('th-TH')}</p></header><div className="dashboard-total-grid">{totals.map((total, index) => <article key={total.label}><p>{total.label}</p><strong>{total.value.toLocaleString('en-US')}</strong><small className={monthlyChange(index) < 0 ? 'trend-down' : 'trend-up'}>{monthlyChange(index) < 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}{Math.abs(monthlyChange(index))}% จากเดือนก่อน</small></article>)}</div></section>
    <div className="dashboard-chart-grid"><article className="dashboard-chart"><header><h2>สถิติคำขอรายเดือน</h2><div><span><i style={{ background: colors[2] }} />คำขอทั้งหมด</span><span><i style={{ background: colors[0] }} />อนุมัติแล้ว</span></div></header><svg viewBox="0 0 640 285" role="img" aria-label="Monthly requisitions and approvals">{[0, 1, 2, 3].map(index => <g key={index}><line x1="45" y1={245 - index * 66.67} x2="525" y2={245 - index * 66.67} stroke="#d7dbde" /><text x="32" y={249 - index * 66.67} textAnchor="end" fill="#5e6669" fontSize="10">{Math.round(maximum * index / 3)}</text></g>)}<polyline points={points('total')} fill="none" stroke="#4f6fae" strokeWidth="2" /><polyline points={points('approved')} fill="none" stroke="#173f4a" strokeWidth="2" />{monthly.map((month, index) => <text key={month.key} x={45 + index * 96} y="270" textAnchor="middle" fill="#5e6669" fontSize="10">{month.label}</text>)}<text x="537" y="44" fontSize="11" fill="#4f6fae">คำขอทั้งหมด</text><text x="537" y="152" fontSize="11" fill="#173f4a">อนุมัติแล้ว</text></svg><small>ดูเป็นตาราง</small></article>
    <article className="dashboard-categories"><h2>ประเภทคำขอ</h2><div><div className="dashboard-donut" style={{ background: gradient ? `conic-gradient(${gradient})` : '#e7ebef' }}><span><strong>{all.length.toLocaleString('en-US')}</strong><small>คำขอทั้งหมด</small></span></div><ul>{categories.map(([label, count], index) => <li key={label}><i style={{ background: colors[index] }} /><p>{label}<small>{count} รายการ</small></p><strong>{Math.round(count / all.length * 100)}%</strong></li>)}</ul></div></article></div>
    <section className="dashboard-latest"><header><h2>คำขอล่าสุด</h2><button type="button" onClick={onOpenPending}>ดูคำขอทั้งหมด {all.length.toLocaleString('en-US')} รายการ</button></header><div className="overflow-x-auto"><table><thead><tr><th>เลขที่คำขอ</th><th>เรื่อง</th><th>ประเภท</th><th>ผู้ขอ</th><th>จำนวนเงิน</th><th>วันที่</th><th>สถานะ</th></tr></thead><tbody>{latest.map(item => <tr key={item.pr_id} onClick={() => 'decision' in item ? onOpenDetail(item) : onOpenApproval(item)}><td><button type="button" onClick={event => { event.stopPropagation(); if ('decision' in item) onOpenDetail(item); else onOpenApproval(item) }}>{item.pr_no}</button></td><td>{item.job_name}</td><td>{item.asset_type || 'จัดซื้อจัดจ้าง'}</td><td>{item.requester_name}</td><td>฿{Number(item.total_amount).toLocaleString('en-US')}</td><td>{new Date(item.created_at).toLocaleDateString('th-TH')}</td><td><Status tone={'decision' in item ? String(item.decision) : 'pending'}>{'decision' in item ? (item.decision === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธ') : 'รออนุมัติ'}</Status></td></tr>)}</tbody></table></div></section>
  </div>
}
