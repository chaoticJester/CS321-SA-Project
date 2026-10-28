import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { listMyPrSummaries } from '../../api'
import type { Requisition } from '../../model'

import { RequesterNotificationsContext } from './requesterNotifications'

const NOTIFICATION_POLL_MS = 30_000

export function RequesterNotificationsProvider({ refreshKey, children }: { refreshKey: string; children: ReactNode }) {
  const [requests, setRequests] = useState<Requisition[]>([])
  useEffect(() => {
    let active = true
    const load = () => listMyPrSummaries().then(values => { if (active) setRequests(values) }).catch(() => { /* Keep the last known notifications on a temporary failure. */ })
    void load()
    // Poll so new approvals/rejections show up (and ring the bell) without a page reload.
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load() }, NOTIFICATION_POLL_MS)
    return () => { active = false; window.clearInterval(timer) }
  }, [refreshKey])
  return <RequesterNotificationsContext.Provider value={requests}>{children}</RequesterNotificationsContext.Provider>
}
