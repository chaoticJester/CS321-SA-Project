import { getSession } from '../../../api'
import type { Requisition } from '../../../model'
import { PrintableRequisition } from '../components/Review'
import { RequesterHeader } from '../components/RequesterHeader'
import type { PageActions } from '../types'
import { RequestSummary } from '../components/RequestSummary'

export function RequestDetailPage({ request, ...props }: PageActions & { request: Requisition }) {
  const employee = request.requester || getSession()?.employee
  const approval = request.approval?.chain || []
  const approvedCount = approval.filter(step => step.status === 'approved').length
  const statusLabel = request.status === 'approved' ? 'อนุมัติแล้ว' : request.status === 'rejected' ? 'ปฏิเสธ' : 'รออนุมัติ'
  const currentStep = approval.find(step => step.status === 'pending')
  const openAttachment = (file: File) => {
    const url = URL.createObjectURL(file)
    window.open(url, '_blank', 'noopener,noreferrer')
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return <><div data-node-id="442:3176" className="requester-screen requester-detail">
    <RequesterHeader active="requests" {...props} />
    <main className="mx-auto w-[min(1216px,calc(100%_-_48px))] pb-24 pt-11 max-[760px]:w-[calc(100%_-_32px)]">
      <button className="border-0 bg-transparent p-0 text-sm text-[#888]" type="button" onClick={props.onMyRequests}>คำขอของฉัน　/　{request.reference}</button>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-[28px] font-semibold text-[#31456c]">{request.reference || 'PR-DRAFT'}</h1><p className="text-base text-[#888]">{request.basic.job || 'Purchase Requisition'}</p></div><div className="flex gap-3"><span className="inline-flex h-[29px] items-center rounded-lg bg-[#e7ebef] px-3 text-sm text-[#5e6669]">◷ {statusLabel}</span><button className="h-[29px] rounded-lg border border-[#8884] bg-white px-4 text-sm" type="button" onClick={() => window.print()}>ดาวน์โหลด PR</button></div></div>
      <section className="mt-6 rounded-lg border-2 border-[#8885] p-7" aria-labelledby="approval-title"><div className="flex items-center justify-between gap-4"><h2 id="approval-title" className="text-[22px] font-semibold text-[#4f6fae]">สถานะการอนุมัติ</h2><span className="text-sm text-[#888]">อนุมัติแล้ว {approvedCount} จาก {approval.length} ลำดับ</span></div><ol className="approval-chain mt-7">{approval.map((step, index) => <li className="text-sm" key={`${step.sequence_order}-${step.approver_id}`}><div className="approval-step-content"><span className={`approval-step-circle ${step.status === 'approved' ? 'is-complete' : step === currentStep ? 'is-current' : ''}`}>{step.status === 'approved' ? '✓' : index + 1}</span><span className="min-w-0"><strong className="block truncate">{step.approver_name}</strong><small className="block text-[#5e6669]">{step.level_name}</small><small className={step === currentStep ? 'text-[#4f6fae]' : 'text-[#888]'}>{step.status === 'approved' ? 'อนุมัติแล้ว' : step.status === 'rejected' ? 'ปฏิเสธ' : step === currentStep ? 'รออนุมัติ' : 'รอลำดับ'}</small></span></div><span className={`approval-step-connector ${step.status === 'approved' ? 'is-complete' : ''}`} aria-hidden="true" /></li>)}</ol></section>
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_310px] gap-7 max-[850px]:grid-cols-1"><RequestSummary request={request} employee={employee} /><aside className="space-y-5"><section className="rounded-lg border-2 border-[#8885] p-5"><h2 className="text-[22px] font-semibold text-[#4f6fae]">เอกสารแนบ</h2><div className="mt-4 space-y-2">{request.attachments.length ? request.attachments.map(attachment => <div className="flex items-center justify-between gap-3 rounded-md border-2 border-[#8885] p-3 text-sm" key={attachment.id}><div className="min-w-0"><strong className="block truncate">{attachment.file.name}</strong><small className="text-[#888]">{Math.ceil(attachment.file.size / 1024)} KB</small></div><button className="border-0 bg-transparent text-[#4f6fae]" type="button" onClick={() => openAttachment(attachment.file)}>เปิดดู</button></div>) : <p className="rounded-md border border-dashed border-[#8885] p-5 text-center text-sm text-[#888]">ไม่มีเอกสารแนบ</p>}</div></section>{currentStep ? <div className="rounded-lg bg-[#e7ebef] p-5 text-sm text-[#17414d]"><strong>◷　รอ {currentStep.level_name} ตรวจสอบ</strong><small className="mt-1 block pl-7">{currentStep.approver_name}</small></div> : null}</aside></div>
    </main>
  </div><div className="print-only"><PrintableRequisition value={request} /></div></>
}
