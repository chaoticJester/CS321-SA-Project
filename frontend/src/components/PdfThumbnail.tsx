import { useEffect, useRef, useState } from 'react'
import { getPrPdf } from '../api'
import { PdfSkeleton } from './PdfPreview'

// Draws page 1 of the PR's PDF (GET /api/pr/:id/pdf) into a canvas.
// pdf.js is imported on demand so it only loads on pages that show thumbnails.
export function PdfThumbnail({ prId }: { prId: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  useEffect(() => {
    let active = true
    let cancel = () => {}
    void (async () => {
      try {
        const [pdfjs, worker, blob] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url'), getPrPdf(prId)])
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default
        if (!active) return
        const loading = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) })
        cancel = () => void loading.destroy()
        try {
          const page = await (await loading.promise).getPage(1)
          const target = canvas.current
          if (!active || !target) return
          // Render at the box's pixel width so the text stays sharp.
          const scale = target.clientWidth * window.devicePixelRatio / page.getViewport({ scale: 1 }).width
          const viewport = page.getViewport({ scale })
          target.width = viewport.width
          target.height = viewport.height
          const task = page.render({ canvas: target, viewport })
          cancel = () => { task.cancel(); void loading.destroy() }
          await task.promise
          if (active) setState('ready')
        } finally {
          void loading.destroy()
        }
      } catch {
        if (active) setState('error')
      }
    })()
    return () => { active = false; cancel() }
  }, [prId])
  return <div className={`pdf-thumbnail is-${state}`}>
    <PdfSkeleton />
    <canvas ref={canvas} aria-hidden="true" />
    {state === 'loading' ? <span className="sr-only" role="status">กำลังโหลดตัวอย่าง…</span> : state === 'error' ? <span>ไม่สามารถแสดงตัวอย่างได้</span> : null}
  </div>
}
