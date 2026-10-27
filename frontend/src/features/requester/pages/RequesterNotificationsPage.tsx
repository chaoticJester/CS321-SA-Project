import { useEffect, useState } from 'react'
import { getPr, listMyPrs } from '../../../api'
import type { Requisition } from '../../../model'
import { NotificationsPage } from '../../../components/NotificationsPage'
import { RequesterHeader } from '../components/RequesterHeader'
import type { PageActions } from '../types'
import { requesterNotificationId } from '../../../notifications'

export function RequesterNotificationsPage(props: PageActions) {
  const [requests, setRequests] = useState<Requisition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    listMyPrs().then(values => { if (active) setRequests(values) })
      .catch(error => { if (active) setError(error instanceof Error ? error.message : 'ไม่สามารถโหลดการแจ้งเตือนได้') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  async function openRequest(request: Requisition) {
    if (!request.backendId) return
    try { props.onOpenDetail(await getPr(request.backendId)) }
    catch (error) { setError(error instanceof Error ? error.message : 'ไม่สามารถโหลดรายละเอียดคำขอได้') }
  }
  return <div className="requester-screen"><RequesterHeader {...props} /><main className="design-page"><NotificationsPage loading={loading} error={error} items={requests.map(request => {
    const kind = request.status || 'pending'
    const step = request.approval?.chain.find(step => step.status === 'pending')
    const rejected = request.approval?.chain.find(step => step.status === 'rejected')
    return { id: requesterNotificationId(request), kind, title: kind === 'approved' ? 'อนุมัติคำขอเรียบร้อยแล้ว' : kind === 'rejected' ? 'คำขอถูกปฏิเสธ' : 'ส่งคำขอสำเร็จ', reference: request.reference || '', subject: request.basic.job, detail: kind === 'approved' ? 'ผ่านการอนุมัติครบทุกลำดับแล้ว' : kind === 'rejected' ? `เหตุผล: ${rejected?.comment || '—'}` : `ส่งต่อให้ ${step?.level_name || 'ผู้อนุมัติ'} ตรวจสอบแล้ว`, date: request.createdAt, onOpen: () => void openRequest(request) }
  })} /></main></div>
}
