import { useEffect, useState } from 'react'

type LoadedPdf = { key: string; blob: Blob; url: string }

// Loads a PDF from the API and exposes it as an object URL for <iframe>.
// `key` identifies the document; the PDF is fetched again only when it changes.
export function usePrPdf(key: string | undefined, load: () => Promise<Blob>) {
  const [loaded, setLoaded] = useState<LoadedPdf | null>(null)
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null)
  useEffect(() => {
    if (!key) return
    let active = true
    let url = ''
    load().then(blob => {
      if (!active) return
      url = URL.createObjectURL(blob)
      setLoaded({ key, blob, url })
    }).catch(error => { if (active) setFailure({ key, message: error instanceof Error ? error.message : 'ไม่สามารถโหลดไฟล์ PDF ได้' }) })
    return () => { active = false; if (url) URL.revokeObjectURL(url) }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `load` is recreated every render; `key` decides when to refetch
  }, [key])
  return { pdf: loaded?.key === key ? loaded : null, error: failure && failure.key === key ? failure.message : '' }
}
