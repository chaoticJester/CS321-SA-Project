import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close() }, [])
  return <dialog ref={ref} className={wide ? 'modal modal-wide' : 'modal'} onCancel={e => { e.preventDefault(); onClose() }} aria-labelledby="modal-title"><header><h2 id="modal-title">{title}</h2><button type="button" className="text-button" aria-label="Close dialog" onClick={onClose}>Close</button></header>{children}</dialog>
}
