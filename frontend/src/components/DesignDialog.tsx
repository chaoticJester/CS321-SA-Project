import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

export function DesignDialog({ title, className = '', onClose, children }: { title: string; className?: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    window.scrollTo({ top: 0, behavior: 'instant' })
    return () => dialog?.close()
  }, [])
  return <dialog ref={ref} className={`design-dialog ${className}`} aria-label={title} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose() }}>
    <span id={titleId} className="sr-only">{title}</span>{children}
  </dialog>
}
