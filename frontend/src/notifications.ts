import { useMemo, useSyncExternalStore } from 'react'
import type { Requisition } from './model'

const changedEvent = 'sa-pr-notifications-read'
const memory = new Map<string, string>()

export function requesterNotificationId(request: Requisition) {
  return `${request.backendId}:${request.status || 'pending'}`
}

export function isNotificationRead(read: string[], id: string) {
  // Preserve requester read markers saved with the old approval-step suffix.
  return read.includes(id) || (id.split(':').length === 2 && read.some(value => value.startsWith(`${id}:`)))
}

function parseRead(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch { return [] }
}

export function useReadNotifications(employeeId: string) {
  const storageKey = `sa-pr-read-notifications:${employeeId}`
  function snapshot() {
    if (memory.has(storageKey)) return memory.get(storageKey)!
    try { return localStorage.getItem(storageKey) || '[]' } catch { return '[]' }
  }
  function subscribe(onChange: () => void) {
    function onStorage(event: StorageEvent) {
      if (event.key === storageKey || event.key === null) { memory.delete(storageKey); onChange() }
    }
    window.addEventListener(changedEvent, onChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(changedEvent, onChange)
      window.removeEventListener('storage', onStorage)
    }
  }
  const raw = useSyncExternalStore(subscribe, snapshot, () => '[]')
  const read = useMemo(() => parseRead(raw), [raw])
  function markRead(ids: string[]) {
    const next = JSON.stringify([...new Set([...parseRead(snapshot()), ...ids])])
    try { localStorage.setItem(storageKey, next); memory.delete(storageKey) }
    catch { memory.set(storageKey, next) }
    window.dispatchEvent(new Event(changedEvent))
  }
  return { read, markRead }
}
