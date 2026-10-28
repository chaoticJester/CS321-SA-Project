import { useEffect, useState } from 'react'
import { Check, Download } from 'lucide-react'
import { getDraftPrPdf, getPrPdf, savePdf } from '../api'
import { usePrPdf } from './usePrPdf'
import type { Requisition } from '../model'
import { DesignDialog } from './DesignDialog'
import { Icon } from './Icon'

export function PdfToolbar({ reference, onDownload, zoom, onZoom, downloadDisabled = false }: { reference: string; onDownload: () => void; zoom: number; onZoom: (value: number) => void; downloadDisabled?: boolean }) {
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    if (!saved) return
    const timer = window.setTimeout(() => setSaved(false), 1600)
    return () => window.clearTimeout(timer)
  }, [saved])
  return <div className="pdf-toolbar"><strong><Icon name="file" />{reference}.pdf</strong><div className="pdf-zoom"><button type="button" aria-label="Zoom out" disabled={zoom <= 50} onClick={() => onZoom(zoom - 10)}>−</button><span>{zoom} %</span><button type="button" aria-label="Zoom in" disabled={zoom >= 150} onClick={() => onZoom(zoom + 10)}>+</button></div><button className={`pdf-download ${saved ? 'is-saved' : ''}`} type="button" disabled={downloadDisabled} onClick={() => { onDownload(); setSaved(true) }}><span key={String(saved)}>{saved ? <><Check size={16} />บันทึกแล้ว</> : <><Download size={16} />ดาวน์โหลด</>}</span></button></div>
}

// Placeholder shaped like page 1 of the real PDF, shown while the server renders it.
export function PdfSkeleton() {
  return <div className="pdf-skeleton" aria-hidden="true"><i className="sk-title" /><i className="sk-sub" /><i className="sk-band" /><div className="sk-cols"><i /><i /><i /><i /></div><i className="sk-band" /><div className="sk-cols"><i /><i /><i /><i /></div><i className="sk-table" /><i className="sk-total" /></div>
}

export function PdfFrame({ url, error, zoom, reference }: { url?: string; error: string; zoom: number; reference: string }) {
  if (error) return <p className="pdf-frame-state" role="alert">{error}</p>
  // Sized like the page in the browser's PDF viewer at this zoom so the swap does not jump.
  if (!url) return <div className="pdf-loading"><div className="pdf-sheet" style={{ width: `min(${zoom * 6.5}px, 100% - 32px)` }}><PdfSkeleton /></div><p role="status">กำลังสร้างไฟล์ PDF…</p></div>
  // The wrapper is keyed by document so the print-in reveal plays once per PDF;
  // the iframe remounts on zoom so the browser's PDF viewer picks up the new #zoom value.
  return <div className="pdf-reveal" key={url}><iframe key={zoom} className="pdf-frame" title={`${reference}.pdf`} src={`${url}#toolbar=0&navpanes=0&zoom=${zoom}`} /></div>
}

export function PdfPreview({ value, onClose, draft = false }: { value: Requisition; onClose: () => void; draft?: boolean }) {
  const [zoom, setZoom] = useState(100)
  // Saved PRs come from GET /api/pr/:id/pdf; drafts are rendered by POST /api/pr/pdf-preview.
  const saved = !draft && value.backendId
  const { pdf, error } = usePrPdf(saved || JSON.stringify([value.basic, value.items, value.purchaser]), () => saved ? getPrPdf(saved) : getDraftPrPdf(value))
  const reference = draft ? 'PR-Draft' : value.reference || 'PR'
  return <DesignDialog title="ตัวอย่างใบขอสั่งซื้อ" className={`pdf-preview ${draft ? 'draft-preview' : ''}`} onClose={onClose}>
    <header><h2>{draft ? 'ตัวอย่างใบขอสั่งซื้อ (PDF)' : 'ใบขอสั่งซื้อ (Purchase Requisition)'}</h2><p>{draft ? 'ตรวจสอบรูปแบบเอกสารก่อนส่งคำขอ' : `${value.reference} · ${value.basic.job}`}</p></header>
    <div className="pdf-preview-info">ⓘ <strong>{draft ? 'ฉบับร่าง' : 'Preview'}</strong> — {draft ? 'ยังไม่ส่งคำขอ และยังไม่มีการอนุมัติ' : 'กำลังดูตัวอย่างใบขอสั่งซื้อ'}</div>
    <PdfToolbar reference={reference} zoom={zoom} onZoom={setZoom} downloadDisabled={!pdf} onDownload={() => { if (pdf) savePdf(pdf.blob, reference) }} />
    <div className="pdf-preview-canvas"><PdfFrame url={pdf?.url} error={error} zoom={zoom} reference={reference} /></div>
    <footer>{draft ? <small>ปิดพรีวิวเพื่อกลับไปตรวจสอบคำขอ</small> : null}<button className="button primary" type="button" onClick={onClose}>{draft ? 'ปิดหน้าต่าง' : 'ปิดตัวอย่าง'}</button></footer>
  </DesignDialog>
}
