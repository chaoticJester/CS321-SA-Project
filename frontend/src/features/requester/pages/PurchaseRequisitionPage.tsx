import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { activeItems, basicError, BUDGET, grandTotal, itemError, newRequisition, persistRequisition, readDraft } from '../../../model'
import type { Requisition } from '../../../model'
import { Icon } from '../../../components/Icon'
import { createPr } from '../../../api'
import type { Employee } from '../../../api'
import { Attachments } from '../components/Attachments'
import { BasicInfo } from '../components/BasicInfo'
import { Items } from '../components/Items'
import { RequesterHeader } from '../components/RequesterHeader'
import { DesignDialog } from '../../../components/DesignDialog'
import { PdfPreview } from '../../../components/PdfPreview'
import { PrintableRequisition, Review } from '../components/Review'

const steps = [['Basic Info', 'ข้อมูลทั่วไป'], ['Items', 'รายการสินค้า'], ['Attachment', 'เอกสารแนบ'], ['Review & Submit', 'ตรวจสอบและส่ง']]
const stepNodeIds = ['384:6213', '384:6385', '384:7471', '384:6925']
function syncItemBudgetCodes(value: Requisition): Requisition {
  return { ...value, items: value.items.map(item => ({ ...item, budgetCode: value.basic.budgetCode })) }
}
export function PurchaseRequisitionPage({ employee, onClose, onSignOut, onSubmitted, onViewRequests, onTrackRequest, onNotifications }: { employee: Employee; onClose: () => void; onSignOut: () => void; onSubmitted: (value: Requisition) => void; onViewRequests: () => void; onTrackRequest: (value: Requisition) => void; onNotifications: () => void }) {
  const [value, setValue] = useState<Requisition>(newRequisition)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [modal, setModal] = useState<'pdf' | 'success' | null>(null)
  useEffect(() => {
    let mounted = true
    readDraft().then(draft => { if (mounted && draft) { setValue(syncItemBudgetCodes(draft)); setNotice('Saved draft restored / โหลดฉบับร่างแล้ว') } }).catch(() => { if (mounted) setNotice('Browser storage is unavailable. You can complete the form, but draft saving may fail.') }).finally(() => { if (mounted) setReady(true) })
    return () => { mounted = false }
  }, [])
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])
  function update(patch: Partial<Requisition>) { setValue(current => syncItemBudgetCodes({ ...current, ...patch })); setDirty(true); setNotice(''); setError('') }
  function move(step: number) { update({ step }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function validate(step: number) {
    if (step === 1) return basicError(value.basic)
    if (step === 2) {
      const items = activeItems(value.items)
      return !items.length ? 'Add at least one item / กรุณาเพิ่มรายการสินค้า' : items.map(itemError).find(Boolean) || ''
    }
    if (step === 3 && !value.purchaser) return 'Select a purchaser section / กรุณาเลือกส่วนการจัดซื้อ'
    return ''
  }
  function next(event: FormEvent) { event.preventDefault(); const message = validate(value.step); if (message) setError(message); else move(value.step + 1) }
  async function save() {
    setBusy(true); setError('')
    try { await persistRequisition(value); setDirty(false); setNotice('Draft saved on this device, including attachments / บันทึกฉบับร่างแล้ว') }
    catch { setError('Could not save the draft. Check browser storage space and try again. Your form is still open.') }
    finally { setBusy(false) }
  }
  async function submit() {
    const message = [1, 2, 3].map(validate).find(Boolean)
    if (message) { setError(message); return }
    if (grandTotal(value.items) > BUDGET) { setError('This request exceeds the available budget. Reduce the order amount before submitting.'); return }
    setBusy(true); setError('')
    const submitted = { ...value, items: activeItems(value.items) }
    try {
      const saved = syncItemBudgetCodes(await createPr(submitted))
      await persistRequisition(saved, true)
      setValue(saved); setDirty(false); onSubmitted(saved); setModal('success')
    }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not submit the request. Please try again.') }
    finally { setBusy(false) }
  }
  if (!ready) return <main className="loading-page" role="status">Loading your requisition…</main>
  return <><div className="min-h-svh bg-white"><RequesterHeader onNotifications={onNotifications} onHome={onClose} onMyRequests={onViewRequests} onSignOut={onSignOut} /><main className="pr-page" data-node-id={stepNodeIds[value.step - 1]}><header className="pr-header"><div className="pr-heading"><div><h1>Create Purchase Requisition (PR)</h1><p>สร้างใบขอสั่งซื้อ (PR)</p></div><div className="header-actions"><button className="button cancel" type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="button save" type="button" disabled={busy} onClick={save}><Icon name="save" />{busy ? 'Saving…' : 'Save Draft'}</button></div></div>
    <dl className="requester-meta"><div><dt>Name/ชื่อ :</dt><dd>{employee.full_name}</dd></div><div><dt>PR No./เลขที่ :</dt><dd>{value.reference || '—'}</dd></div><div><dt>Site/สาขา :</dt><dd>Head Office</dd></div><div><dt>Position/ตำแหน่ง :</dt><dd>{employee.position || 'Requester'}</dd></div><div><dt>PR Date/วันที่ :</dt><dd>{new Date(value.createdAt).toLocaleDateString('en-GB')}</dd></div><div><dt>Section/แผนก :</dt><dd>{employee.department || '—'}</dd></div></dl>
  </header><nav aria-label="Purchase requisition steps"><ol className="stepper">{steps.map(([en, th], index) => <li key={en} className={index + 1 === value.step ? 'current' : ''}><button type="button" disabled={index + 1 > value.step || busy} aria-current={index + 1 === value.step ? 'step' : undefined} onClick={() => move(index + 1)}><span className="step-number">{index + 1}</span><span>{en}<small>{th}</small></span></button></li>)}</ol></nav>
    {notice && <div className="notice" role="status">{notice}<button type="button" className="text-button" aria-label="Dismiss notification" onClick={() => setNotice('')}>Dismiss</button></div>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <form onSubmit={next}>
      <fieldset className="flow-fields" disabled={busy}>
      {value.step === 1 && <BasicInfo value={value.basic} onChange={basic => update({ basic })} />}
      {value.step === 2 && <Items items={value.items} onChange={items => update({ items })} remark={value.remark} onRemark={remark => update({ remark })} onError={setError} />}
      {value.step === 3 && <Attachments attachments={value.attachments} purchaser={value.purchaser} onAttachments={attachments => update({ attachments })} onPurchaser={purchaser => update({ purchaser })} onError={setError} />}
      {value.step === 4 && <Review value={value} onRemark={remark => update({ remark })} onBack={() => move(3)} onSubmit={submit} onPreview={() => setModal('pdf')} busy={busy} />}
      {value.step < 4 && <div className="step-actions">{value.step > 1 && <button type="button" className="button secondary" onClick={() => move(value.step - 1)}>Back</button>}<button className="button primary" type="submit">Next</button></div>}
      </fieldset>
    </form>
  </main></div>
  <div className="print-only"><PrintableRequisition value={value} /></div>
  {modal === 'pdf' && <PdfPreview value={value} draft onClose={() => setModal(null)} />}
  {modal === 'success' && <DesignDialog title="ส่งคำขอสำเร็จ" className="submission-dialog" onClose={onViewRequests}>
    <img className="submission-check" src={`${import.meta.env.BASE_URL}figma/submission-check.svg`} width="55" height="55" alt="" />
    <h2>ส่งคำขอสำเร็จ</h2><p>คำขอของคุณเข้าสู่กระบวนการอนุมัติแล้ว</p>
    <dl><div><dt>เลขที่ใบขอสั่งซื้อ</dt><dd>{value.reference}</dd></div><div><dt>ส่งเมื่อ</dt><dd>{new Date(value.createdAt).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</dd></div><div><dt>สถานะ</dt><dd><span className="rounded-lg bg-[#e7ebef] px-3 py-1 text-sm text-[#17414d]">◷ รออนุมัติ</span></dd></div></dl>
    <small>ผู้รับผิดชอบลำดับถัดไป</small><p className="next-approver">{value.approval?.chain.find(step => step.status === 'pending')?.approver_name || '—'}</p><small>{value.approval?.chain.find(step => step.status === 'pending')?.level_name} · {value.approval?.chain.find(step => step.status === 'pending')?.department}</small>
    <div className="submission-actions"><button className="button secondary" type="button" onClick={onViewRequests}>← กลับคำขอของฉัน</button><button className="button primary" type="button" onClick={() => onTrackRequest(value)}>→ ติดตามคำขอ</button></div>
  </DesignDialog>}
  </>
}
