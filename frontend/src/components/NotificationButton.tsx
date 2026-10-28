import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'

// Shared across header remounts so moving between pages doesn't replay the ring.
let lastSeenCount = 0
// The first load after sign-in fills the count from 0; that isn't a "new" notification.
let ringArmedAt: number | null = null
const FIRST_LOAD_GRACE_MS = 3000

export function NotificationButton({ count, onClick }: { count: number; onClick?: () => void }) {
  const [ring, setRing] = useState(0)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    ringArmedAt ??= Date.now() + FIRST_LOAD_GRACE_MS
    if (count > lastSeenCount && Date.now() >= ringArmedAt) {
      setRing(value => value + 1)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setRing(0), 1200)
    }
    lastSeenCount = count
  }, [count])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return <button className={`notification-button ${ring ? 'is-ringing' : ''}`} type="button" aria-label={`${count} notifications`} onClick={onClick}>
    <Bell key={ring} className="notification-bell" size={20} strokeWidth={1.8} aria-hidden="true" />
    {count > 0 ? <span key={count} className="notification-count" aria-hidden="true">{count > 99 ? '99+' : count}</span> : null}
  </button>
}
