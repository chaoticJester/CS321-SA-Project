import { useRef, useState } from 'react'
import { fileError } from '../model'
import type { Attachment } from '../model'

export function Attachments({ attachments, purchaser, onAttachments, onPurchaser, onError }: { attachments: Attachment[]; purchaser: string; onAttachments: (files: Attachment[]) => void; onPurchaser: (value: string) => void; onError: (text: string) => void }) {
  const picker = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  function accept(files: File[]) {
    const errors = files.map(fileError).filter(Boolean)
    if (errors.length) { onError(errors.join(' ')); return }
    const unique = files.filter(file => !attachments.some(a => a.file.name === file.name && a.file.size === file.size && a.file.lastModified === file.lastModified))
    onAttachments([...attachments, ...unique.map(file => ({ id: crypto.randomUUID(), file }))]); onError('')
  }
  function download(attachment: Attachment) {
    const url = URL.createObjectURL(attachment.file), link = document.createElement('a')
    link.href = url; link.download = attachment.file.name; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <section className="attachment-panel bordered-panel"><div className="attachment-content"><h2>Attachment / เอกสารแนบ</h2>
    <div className={`dropzone ${dragging ? 'dragging' : ''}`} onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); accept(Array.from(e.dataTransfer.files)) }}><span>Drag &amp; drop<br />files here</span><span className="muted">or</span><div><button type="button" className="upload-button" onClick={() => picker.current?.click()}>Upload File</button><small>*JPG, PNG, PDF<br />(ขนาดไม่เกิน 5 MB)</small></div><input ref={picker} aria-label="Upload attachments" type="file" accept=".jpg,.jpeg,.png,.pdf" multiple hidden onChange={e => { accept(Array.from(e.target.files || [])); e.target.value = '' }} /></div>
    {attachments.length > 0 && <ul className="attachment-list">{attachments.map(attachment => <li key={attachment.id}><button type="button" className="text-button filename" onClick={() => download(attachment)}>{attachment.file.name}<small>{(attachment.file.size / 1024).toFixed(1)} KB</small></button><button type="button" className="text-button danger-text" aria-label={`Remove ${attachment.file.name}`} onClick={() => onAttachments(attachments.filter(a => a.id !== attachment.id))}>Remove</button></li>)}</ul>}
    <h2 className="purchaser-heading">Purchase In-Charge / ผู้รับผิดชอบในการจัดซื้อ</h2><div className="purchaser-card"><div className="avatar" aria-hidden="true" /><label className="pr-field"><span><b className="required">*</b> Purchaser Section / ส่วนการจัดซื้อ</span><select aria-label="Purchaser Section" required value={purchaser} onChange={e => onPurchaser(e.target.value)}><option value=""></option><option>IT Procurement</option><option>General Procurement</option><option>Services Procurement</option></select></label></div>
  </div></section>
}
