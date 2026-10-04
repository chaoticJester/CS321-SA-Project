import { createContext, useContext } from 'react'
import type { Requisition } from '../../model'

export const RequesterNotificationsContext = createContext<Requisition[]>([])

export function useRequesterNotifications() {
  return useContext(RequesterNotificationsContext)
}
