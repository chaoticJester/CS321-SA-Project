import { useState } from 'react'
import { Check, X, Clock3, TriangleAlert, CornerUpRight } from 'lucide-react'
import { getSession } from '../api'
import { PolishedSelect } from './PolishedSelect'
import { isNotificationRead, useReadNotifications } from '../notifications'

export type NotificationItem = {
  id: string
  kind: 'approved' | 'rejected' | 'pending' | 'urgent' | 'forwarded'
  title: string
  reference: string
  subject: string
  detail: string
  date: string
  onOpen: () => void
}

export function NotificationsPage({ items, approver = false, loading = false, error = '' }: { items: NotificationItem[]; approver?: boolean; loading?: boolean; error?: string }) {
  const { read, markRead } = useReadNotifications(getSession()?.employee.employee_id || '')
  const [tab, setTab] = useState<'all' | 'unread'>('all')
  const [kind, setKind] = useState('all')
  const unread = items.filter(item => !isNotificationRead(read, item.id))
  const visible = items.filter(item => (tab === 'all' || !isNotificationRead(read, item.id)) && (kind === 'all' || item.kind === kind))
  return <section className={`notifications-page ${approver ? 'approver-notifications' : ''}`} data-node-id={approver ? '514:6346' : '474:3179'}>
    <header><h1>การแจ้งเตือน</h1><button type="button" onClick={() => markRead(items.map(item => item.id))}>✓ ทำเครื่องหมายอ่านทั้งหมด</button></header>
    <div className="notification-tabs"><button type="button" aria-pressed={tab === 'all'} onClick={() => setTab('all')}>ทั้งหมด&nbsp; {items.length}</button><button type="button" aria-pressed={tab === 'unread'} onClick={() => setTab('unread')}>ยังไม่อ่าน&nbsp; {unread.length}</button></div>
    <div className="notification-filter"><span>ประเภท</span><PolishedSelect compact ariaLabel="Notification type" value={kind} onChange={setKind} options={[{ value: 'all', label: 'ทุกประเภท' }, { value: 'approved', label: 'อนุมัติแล้ว' }, { value: 'rejected', label: 'ปฏิเสธ' }, { value: 'pending', label: 'รออนุมัติ' }, ...(approver ? [{ value: 'urgent', label: 'ใกล้ครบกำหนด' }, { value: 'forwarded', label: 'ส่งต่อ' }] : [])]} /></div>
    <div className="notification-list">{visible.map(item => <article className={`notification-row ${isNotificationRead(read, item.id) ? 'is-read' : ''}`} key={item.id}>
      <span className={`notification-icon ${item.kind}`} aria-hidden="true">{item.kind === 'approved' ? <Check size={24} /> : item.kind === 'rejected' ? <X size={24} /> : item.kind === 'urgent' ? <TriangleAlert size={24} /> : item.kind === 'forwarded' ? <CornerUpRight size={24} /> : <Clock3 size={24} />}</span>
      <div className="notification-content"><strong>{item.title}{!isNotificationRead(read, item.id) ? <i /> : null}</strong><button className="notification-request" type="button" onClick={() => { markRead([item.id]); item.onOpen() }}>{item.reference} · {item.subject}</button><small>{item.detail}</small></div>
      {approver ? <div className="notification-action"><time>{new Date(item.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</time><button className={item.kind === 'approved' || item.kind === 'rejected' ? 'text-button' : 'pdf-download'} type="button" onClick={() => { markRead([item.id]); item.onOpen() }}>{item.kind === 'approved' || item.kind === 'rejected' ? 'ดูรายละเอียด' : 'พิจารณาคำขอ'}</button></div> : null}
    </article>)}{loading ? <p className="list-state" role="status">กำลังโหลดการแจ้งเตือน…</p> : error ? <p className="list-state" role="alert">{error}</p> : !visible.length ? <p className="list-state">ไม่มีการแจ้งเตือน</p> : null}</div>
  </section>
}
