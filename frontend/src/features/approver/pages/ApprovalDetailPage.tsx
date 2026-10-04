import { useState } from 'react'
import type { Employee, PendingApproval } from '../../../api'
import type { Requisition } from '../../../model'
import { BUDGET, grandTotal, money } from '../../../model'
import { DesignDialog } from '../../../components/DesignDialog'
import { PdfToolbar } from '../../../components/PdfPreview'
import { PrintableRequisition } from '../../requester/components/Review'
import { Icon } from '../../../components/Icon'
import { Eye, FileText, Paperclip, PenTool, ShieldCheck, ShoppingCart } from 'lucide-react'
import { Status } from '../components/Status'

type Props = {
  employee: Employee
  selected: PendingApproval | null
  requisition: Requisition | null
  passcode: string
  reason: string
  error: string
  busy: boolean
  readOnly?: boolean
  signedAt: string | null
  onBack: () => void
  onPasscode: (value: string) => void
  onReason: (value: string) => void
  onDecision: (action: 'approve' | 'reject') => Promise<void>
}

export function ApprovalDetailPage({ employee, selected, requisition, passcode, reason, error, busy, readOnly = false, signedAt, onBack, onPasscode, onReason, onDecision }: Props) {
  const [signing, setSigning] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [zoom, setZoom] = useState(100)
  async function sign() {
    await onDecision('approve')
  }
  const currentStep = requisition?.approval?.chain.find(step => step.status === 'pending')
  const tone = requisition?.status || 'pending'
  return <section className={readOnly ? 'approver-view-detail' : 'approver-review'} data-node-id={readOnly ? '514:5982' : signing ? '514:4821' : signedAt ? '514:5085' : '491:3677'}>
    <button className="mb-2 border-0 bg-transparent p-0 text-sm font-medium text-[#4f6fae]" type="button" onClick={onBack}>{readOnly ? 'ประวัติการอนุมัติ' : 'รายการที่รออนุมัติ'} / {selected?.pr_no}</button>
    <h1 className="text-[36px] font-bold leading-[54px] text-[#31456c] max-[760px]:text-[28px]">{readOnly ? 'คำขอ' : 'พิจารณาคำขอ'} {selected?.pr_no}</h1>
    <div className="mt-2 flex gap-4"><Status tone={tone}>{tone === 'approved' ? 'อนุมัติแล้ว' : tone === 'rejected' ? 'ปฏิเสธ' : 'รอการอนุมัติจากคุณ'}</Status><span className="rounded-md bg-[#e7ebef] px-4 py-1.5 text-sm text-[#5e6669]">ระดับ {currentStep?.sequence_order || requisition?.approval?.chain.length || 1} จาก {requisition?.approval?.chain.length || '—'}</span></div>
    {error && !signing ? <p className="form-error mt-5" role="alert">{error}</p> : null}
    {!requisition && !error ? <p className="list-state" role="status">กำลังโหลดคำขอ…</p> : null}
    {requisition ? <div className="approver-detail-grid">
      <div>{readOnly ? <><RequestInfo employee={employee} selected={selected} requisition={requisition} /><article className="approval-panel mt-8"><h2 className="flex items-center gap-3"><ShoppingCart size={22} />รายการสั่งซื้อ</h2><div className="p-7 overflow-x-auto"><table className="w-full min-w-[560px] border-collapse text-sm"><thead className="bg-[#859ecb] text-white"><tr><th className="p-2">รายการ</th><th>รายละเอียด</th><th>จำนวน</th><th>ราคาต่อหน่วย</th><th>รวม</th></tr></thead><tbody>{requisition.items.map(item => <tr key={item.id}><td className="border border-[#ddd] p-3">{item.name}</td><td className="border border-[#ddd] p-3">{item.detail || item.model}</td><td className="border border-[#ddd] p-3">{item.quantity} {item.unit}</td><td className="border border-[#ddd] p-3">{money(Number(item.price))}</td><td className="border border-[#ddd] p-3">{money(Number(item.quantity) * Number(item.price))} THB</td></tr>)}</tbody></table></div></article></> :
      <article className="approval-panel"><h2>เอกสารใบขอสั่งซื้อ (PDF)</h2><PdfToolbar reference={selected?.pr_no || 'PR'} zoom={zoom} onZoom={setZoom} onDownload={() => window.print()} /><div className="approval-pdf-canvas" style={{ minHeight: 655 * zoom / 100 }} /></article>}
      <AttachmentsPanel requisition={requisition} />
      </div>
      <aside><RequestSummary selected={selected} requisition={requisition} budgetOnly={readOnly} /><ApprovalChain requisition={requisition} />
        {!readOnly ? <article className="approval-panel decision-panel"><h2 className="flex items-center gap-3"><PenTool size={24} />บันทึกการพิจารณา</h2><div><textarea aria-label="หมายเหตุการพิจารณา" maxLength={500} value={reason} onChange={event => onReason(event.target.value)} disabled={busy || Boolean(signedAt)} placeholder="เพิ่มหมายเหตุ (ไม่บังคับสำหรับการอนุมัติ)" /><div className="decision-counter">{reason.length}/500</div><div className="decision-actions"><button type="button" disabled={busy || Boolean(signedAt)} onClick={() => void onDecision('reject')}>ปฏิเสธ</button><button type="button" disabled={busy || Boolean(signedAt)} onClick={() => setSigning(true)}>อนุมัติ</button></div><p>***หากปฏิเสธ กรุณาระบุเหตุผล</p></div></article> : null}
      </aside>
    </div> : null}
    {signing && !signedAt ? <DesignDialog title="ลงลายเซ็นอิเล็กทรอนิก" className="signature-dialog" onClose={() => { if (!busy) setSigning(false) }}>
      <h2>ลงลายเซ็นอิเล็กทรอนิก</h2><p className="signature-subtitle">ยืนยันตัวตนเพื่ออนุมัติคำขอ {selected?.pr_no}</p><div className="signature-account"><span>{employee.full_name.charAt(0)}</span><strong>{employee.full_name} · {employee.position}</strong></div>
      <form onSubmit={event => { event.preventDefault(); void sign() }}><label className="signature-password"><span>รหัสผ่าน</span><div><input aria-label="Approval passcode" type={showPassword ? 'text' : 'password'} inputMode="numeric" autoComplete="off" maxLength={6} value={passcode} onChange={event => onPasscode(event.target.value.replace(/\D/g, ''))} disabled={busy} autoFocus /><button aria-label={showPassword ? 'Hide passcode' : 'Show passcode'} type="button" onClick={() => setShowPassword(value => !value)}><Eye size={18} /></button></div></label><p className="signature-note flex items-center gap-2"><ShieldCheck size={22} />ลายเซ็นจะถูกบันทึกพร้อมชื่อผู้อนุมัติ วันที่ และเวลา</p>{error ? <p className="form-error" role="alert">{error}</p> : null}<div className="signature-actions"><button className="button secondary" type="button" disabled={busy} onClick={() => setSigning(false)}>ยกเลิก</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'กำลังลงลายเซ็น…' : 'ติดตามและลงลายเซ็น'}</button></div></form>
    </DesignDialog> : null}
    {signedAt ? <div className="signature-success" role="status"><span>✓</span><div><strong>ลงลายเซ็นเรียบร้อยแล้ว</strong><small>บันทึกเมื่อ {new Date(signedAt).toLocaleString('th-TH')}</small></div></div> : null}
    {requisition ? <div className="print-only"><PrintableRequisition value={requisition} /></div> : null}
  </section>
}

function AttachmentsPanel({ requisition }: { requisition: Requisition }) {
  function open(file: File) {
    const url = URL.createObjectURL(file)
    window.open(url, '_blank', 'noopener,noreferrer')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }
  return <article className="approval-panel approval-attachments"><h2 className="flex items-center gap-3"><Paperclip size={22} />เอกสารแนบ ({requisition.attachments.length} ไฟล์)</h2><div className="approval-file-list">{requisition.attachments.map(attachment => <button className="approval-file" type="button" key={attachment.id} onClick={() => open(attachment.file)}><Icon name="file" /><span>{attachment.file.name}<small>ขนาด {Math.ceil(attachment.file.size / 1024)} KB</small></span></button>)}</div></article>
}

function RequestInfo({ employee, selected, requisition }: { employee: Employee; selected: PendingApproval | null; requisition: Requisition }) {
  return <article className="approval-panel"><h2 className="flex items-center gap-3"><FileText size={24} />ข้อมูลคำขอ</h2><div className="request-info-grid"><dt>ผู้ขอ</dt><dd>{selected?.requester_name}</dd><dt>ตำแหน่ง</dt><dd>{requisition.requester?.position || '—'}</dd><dt>หน่วยงาน</dt><dd>{selected?.requester_department || '—'}</dd><dt>วันที่ส่ง</dt><dd>{new Date(requisition.createdAt).toLocaleString('th-TH')}</dd><dt>กำหนดใช้</dt><dd>{requisition.basic.requiredDate}</dd><dt>Purpose</dt><dd>{requisition.basic.purpose}</dd><dt>Vendor</dt><dd>{requisition.purchaser}</dd></div><span className="sr-only">{employee.full_name}</span></article>
}

function RequestSummary({ selected, requisition, budgetOnly }: { selected: PendingApproval | null; requisition: Requisition; budgetOnly: boolean }) {
  const total = grandTotal(requisition.items)
  return <article className="approval-panel"><h2>{budgetOnly ? 'สรุปงบประมาณ' : 'สรุปข้อมูลคำขอ'}</h2>{!budgetOnly ? <dl><dt>PR No.</dt><dd>{selected?.pr_no}</dd><dt>Require Date</dt><dd>{requisition.basic.requiredDate.split('-').reverse().join('/')}</dd><dt>Purpose</dt><dd>{requisition.basic.purpose || '—'}</dd><dt>Cost Center</dt><dd>{selected?.requester_department || '—'}</dd><dt>Requester</dt><dd>{selected?.requester_name}</dd></dl> : null}<div className="approval-total"><div><small>Grand Total / ยอดรวมสุทธิ</small><strong>{money(total)} THB</strong></div><span className="rounded-md border border-[#8ba69a] bg-[#dce7e1] px-3 py-1 text-xs text-[#315d4b]">{total <= BUDGET ? '✓ อยู่ในงบประมาณ' : 'เกินงบประมาณ'}</span></div>{budgetOnly ? <dl><dt>รหัสงบประมาณ</dt><dd>{requisition.basic.budgetCode || '—'}</dd><dt>งบประมาณคงเหลือ</dt><dd>{money(BUDGET - total)} THB</dd></dl> : null}</article>
}

function ApprovalChain({ requisition }: { requisition: Requisition }) {
  return <article className="approval-panel"><h2 className="flex items-center gap-3"><FileText size={24} />ลำดับการอนุมัติ</h2><ol className="approval-chain-vertical">{requisition.approval?.chain.map((step, index) => <li key={`${step.sequence_order}-${step.approver_id}`}><span className={step.status === 'approved' ? 'is-complete' : ''}>{step.status === 'approved' ? '✓' : index + 1}</span><div><strong>{index + 1}. {step.level_name}</strong><small>{step.approver_name}</small>{step.approved_at ? <small>{step.status === 'rejected' ? 'ปฏิเสธ' : 'อนุมัติแล้ว'} {new Date(step.approved_at).toLocaleString('th-TH')}</small> : null}</div></li>)}</ol></article>
}
