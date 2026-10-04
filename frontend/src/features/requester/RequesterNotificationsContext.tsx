import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { listMyPrSummaries } from '../../api'
import type { Requisition } from '../../model'

import { RequesterNotificationsContext } from './requesterNotifications'

export function RequesterNotificationsProvider({ refreshKey, children }: { refreshKey: string; children: ReactNode }) {
  const [requests, setRequests] = useState<Requisition[]>([])
  useEffect(() => {
    let active = true
    listMyPrSummaries().then(values => { if (active) setRequests(values) }).catch(() => { /* Keep the last known notifications on a temporary failure. */ })
    return () => { active = false }
  }, [refreshKey])
  return <RequesterNotificationsContext.Provider value={requests}>{children}</RequesterNotificationsContext.Provider>
}
