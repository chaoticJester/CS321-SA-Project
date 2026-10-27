import { Bell } from 'lucide-react'

export function NotificationButton({ count, onClick }: { count: number; onClick?: () => void }) {
  return <button className="notification-button" type="button" aria-label={`${count} notifications`} onClick={onClick}>
    <Bell className="notification-bell" size={20} strokeWidth={1.8} aria-hidden="true" />
    {count > 0 ? <span key={count} className="notification-count" aria-hidden="true">{count > 99 ? '99+' : count}</span> : null}
  </button>
}
