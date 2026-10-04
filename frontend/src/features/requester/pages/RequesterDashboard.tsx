import { Eye } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getPr, listMyPrSummaries } from '../../../api'
import type { Requisition } from '../../../model'
import { RequesterHeader } from '../components/RequesterHeader'
import { requesterAsset } from '../utils'
import { PdfPreview } from '../../../components/PdfPreview'

type Props = {
  onCreate: () => void
  onMyRequests: () => void
  onSignOut: () => void
  onNotifications: () => void
}

export function RequesterDashboard({ onCreate, onMyRequests, onSignOut, onNotifications }: Props) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [requests, setRequests] = useState<Requisition[]>([])
  const [preview, setPreview] = useState<Requisition | null>(null)
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState('')
  useEffect(() => {
    let active = true
    listMyPrSummaries(['pending']).then(values => { if (active) setRequests(values) })
      .catch(error => { if (active) setError(error instanceof Error ? error.message : 'ไม่สามารถโหลดคำขอได้') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const normalized = query.trim().toLocaleLowerCase()
  const visible = requests.filter(request => request.status === 'pending' && (!normalized || `${request.reference} ${request.basic.job}`.toLocaleLowerCase().includes(normalized)))
  async function openPreview(request: Requisition) {
    if (!request.backendId || opening) return
    setOpening(request.backendId)
    setError('')
    try {
      setPreview(await getPr(request.backendId))
    } catch (error) {
      setError(error instanceof Error ? error.message : 'ไม่สามารถโหลดตัวอย่างคำขอได้')
    } finally {
      setOpening('')
    }
  }
  return <div className="requester-screen" data-node-id="419:1665">
    <RequesterHeader active="home" onHome={() => window.scrollTo({ top: 0 })} onMyRequests={onMyRequests} onSignOut={onSignOut} onNotifications={onNotifications} searchValue={query} onSearchChange={setQuery} searchLabel="Search your requests" />
    <main className="requester-home">
      <button className="create-request" type="button" onClick={onCreate}><img width="15" height="15" src={requesterAsset('requester-plus.svg')} alt="" />สร้างคำขอ</button>
      <section className="home-requests" aria-labelledby="requests-title">
        <header><h1 id="requests-title">Your Purchase Requisition</h1></header>
        <div className="home-request-grid">
          {visible.map(request => <article className="home-request-card" key={request.backendId || request.reference}>
            <div className="request-thumbnail" aria-hidden="true" />
            <h2>{request.reference}</h2>
            <p>{request.basic.job}</p>
            <button type="button" disabled={Boolean(opening)} onClick={() => void openPreview(request)}><Eye size={18} />{opening === request.backendId ? 'กำลังโหลด…' : 'ดูตัวอย่าง PDF'}</button>
          </article>)}
          {loading ? <p className="list-state" role="status">กำลังโหลดคำขอ…</p> : null}
          {error ? <p className="list-state" role="alert">{error}</p> : null}
          {!loading && !error && !visible.length ? <p className="list-state">{normalized ? 'ไม่พบคำขอที่ตรงกับการค้นหา' : 'ไม่มีคำขอที่กำลังดำเนินการ'}</p> : null}
        </div>
      </section>
    </main>
    {preview ? <PdfPreview value={preview} onClose={() => setPreview(null)} /> : null}
  </div>
}
