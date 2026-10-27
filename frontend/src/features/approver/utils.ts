export function daysWaiting(createdAt: string, now: number) {
  const created = Date.parse(createdAt)
  if (!Number.isFinite(created)) return 0
  return Math.max(0, Math.ceil((now - created) / 86_400_000))
}

