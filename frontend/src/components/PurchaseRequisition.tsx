import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { activeItems, basicError, BUDGET, grandTotal, itemError, newRequisition, persistRequisition, readDraft } from '../model'
import type { Requisition } from '../model'
import { BasicInfo } from './BasicInfo'
import { Items } from './Items'
import { Attachments } from './Attachments'
import { PrintableRequisition, Review } from './Review'
import { Modal } from './Modal'
import { Icon } from './Icon'

const steps = [['Basic Info', 'ข้อมูลทั่วไป'], ['Items', 'รายการสินค้า'], ['Attachment', 'เอกสารแนบ'], ['Review & Submit', 'ตรวจสอบและส่ง']]
export function PurchaseRequisition({ onClose, onSignOut, onSubmitted, onViewRequests }: { onClose: () => void; onSignOut: () => void; onSubmitted: (value: Requisition) => void; onViewRequests: () => void }) {
  const [value, setValue] = useState<Requisition>(newRequisition)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [modal, setModal] = useState<'cancel' | 'signout' | 'pdf' | 'success' | null>(null)
  useEffect(() => {
    let mounted = true
    readDraft().then(draft => { if (mounted && draft) { setValue(draft); setNotice('Saved draft restored / โหลดฉบับร่างแล้ว') } }).catch(() => { if (mounted) setNotice('Browser storage is unavailable. You can complete the form, but draft saving may fail.') }).finally(() => { if (mounted) setReady(true) })
    return () => { mounted = false }
  }, [])
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])
  function update(patch: Partial<Requisition>) { setValue(current => ({ ...current, ...patch })); setDirty(true); setNotice(''); setError('') }
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
    const submitted = { ...value, items: activeItems(value.items), reference: `PR-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}` }
    try { await persistRequisition(submitted, true); setValue(submitted); setDirty(false); onSubmitted(submitted); setModal('success') }
    catch { setError('Could not save the submission. Your request has not been submitted; please try again.') }
    finally { setBusy(false) }
  }
  function startNew() { setValue(newRequisition()); setModal(null); setNotice(''); setDirty(false) }
  if (!ready) return <main className="loading-page" role="status">Loading your requisition…</main>
  return <><main className="pr-page"><header className="pr-header"><div className="pr-heading"><div><h1>Create Purchase Requisition (PR)</h1><p>สร้างใบขอสั่งซื้อ (PR)</p></div><div className="header-actions"><button className="button cancel" type="button" disabled={busy} onClick={() => setModal('cancel')}>Cancel</button><button className="button save" type="button" disabled={busy} onClick={save}><Icon name="save" />{busy ? 'Saving…' : 'Save Draft'}</button></div></div>
    <dl className="requester-meta"><div><dt>Name/ชื่อ :</dt><dd>Worawut Jintasri</dd></div><div><dt>PR No./เลขที่ :</dt><dd>{value.reference || '—'}</dd></div><div><dt>Site/สาขา :</dt><dd>Head Office</dd></div><div><dt>Position/ตำแหน่ง :</dt><dd>Requester</dd></div><div><dt>PR Date/วันที่ :</dt><dd>{new Date(value.createdAt).toLocaleDateString('en-GB')}</dd></div><div><dt>Section/แผนก :</dt><dd>Technology Development</dd></div></dl>
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
    <footer className="prototype-footer">Local prototype · Drafts are stored on this device.<button type="button" className="text-button" onClick={() => dirty ? setModal('signout') : onSignOut()}>Sign out</button></footer>
  </main>
  <div className="print-only"><PrintableRequisition value={value} /></div>
  {(modal === 'cancel' || modal === 'signout') && <Modal title={modal === 'cancel' ? 'Close this requisition?' : 'Sign out?'} onClose={() => setModal(null)}><p>Unsaved changes will be discarded. Your last saved draft will still be available.</p><div className="modal-actions"><button className="button secondary" onClick={() => setModal(null)}>Keep editing</button><button className="button cancel" onClick={modal === 'cancel' ? onClose : onSignOut}>{modal === 'cancel' ? 'Discard changes & go to home' : 'Discard changes & sign out'}</button></div></Modal>}
  {modal === 'pdf' && <Modal title="Purchase requisition preview" onClose={() => setModal(null)} wide><p className="muted">Choose Print, then “Save as PDF” in your browser.</p><button className="button primary" onClick={() => window.print()}>Print / Save as PDF</button><PrintableRequisition value={value} /></Modal>}
  {modal === 'success' && <Modal title="ส่งคำขอเรียบร้อย / Request submitted" onClose={onViewRequests}><p className="success-reference">{value.reference}</p><p>คำขอนี้ถูกบันทึกแล้วและพร้อมดูในคำขอของฉัน / Your request is now available in My PR.</p><div className="modal-actions"><button className="button secondary" onClick={() => window.print()}>Print / Save as PDF</button><button className="button secondary" onClick={startNew}>Create another PR</button><button className="button primary" onClick={onViewRequests}>Go to My PR</button></div></Modal>}
  </>
}
