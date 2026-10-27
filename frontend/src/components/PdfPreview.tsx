import { useState } from 'react'
import type { Requisition } from '../model'
import { DesignDialog } from './DesignDialog'
import { PrintableRequisition } from '../features/requester/components/Review'
import { Icon } from './Icon'

export function PdfToolbar({ reference, onDownload, zoom, onZoom }: { reference: string; onDownload: () => void; zoom: number; onZoom: (value: number) => void }) {
  return <div className="pdf-toolbar"><strong><Icon name="file" />{reference}.pdf</strong><div className="pdf-zoom"><span>หน้า 1 / 1</span><button type="button" aria-label="Zoom out" disabled={zoom <= 50} onClick={() => onZoom(zoom - 10)}>−</button><span>{zoom} %</span><button type="button" aria-label="Zoom in" disabled={zoom >= 150} onClick={() => onZoom(zoom + 10)}>+</button></div><button className="pdf-download" type="button" onClick={onDownload}>⇩ ดาวน์โหลด</button></div>
}

export function PdfPreview({ value, onClose, draft = false }: { value: Requisition; onClose: () => void; draft?: boolean }) {
  const [zoom, setZoom] = useState(100)
  return <><DesignDialog title="ตัวอย่างใบขอสั่งซื้อ" className={`pdf-preview ${draft ? 'draft-preview' : ''}`} onClose={onClose}>
    <header><h2>{draft ? 'ตัวอย่างใบขอสั่งซื้อ (PDF)' : 'ใบขอสั่งซื้อ (Purchase Requisition)'}</h2><p>{draft ? 'ตรวจสอบรูปแบบเอกสารก่อนส่งคำขอ' : `${value.reference} · ${value.basic.job}`}</p></header>
    <div className="pdf-preview-info">ⓘ <strong>{draft ? 'ฉบับร่าง' : 'Preview'}</strong> — {draft ? 'ยังไม่ส่งคำขอ และยังไม่มีการอนุมัติ' : 'กำลังดูตัวอย่างใบขอสั่งซื้อ'}</div>
    <PdfToolbar reference={draft ? 'PR-Draft-Preview' : `${value.reference}-Preview`} zoom={zoom} onZoom={setZoom} onDownload={() => window.print()} />
    <div className="pdf-preview-canvas"><div className="pdf-blank-page" style={{ width: `${422 * zoom / 100}px`, minHeight: `${602 * zoom / 100}px` }} aria-label="Purchase requisition PDF preview" /></div>
    <footer>{draft ? <small>ปิดพรีวิวเพื่อกลับไปตรวจสอบคำขอ</small> : null}<button className="button primary" type="button" onClick={onClose}>{draft ? 'ปิดหน้าต่าง' : 'ปิดตัวอย่าง'}</button></footer>
  </DesignDialog><div className="print-only"><PrintableRequisition value={value} /></div></>
}
