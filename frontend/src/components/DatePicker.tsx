import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

function dateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function parseDate(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? new Date() : date
}
function monthStart(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1, 12) }

export function DatePicker({ value, onChange, ariaLabel, required = false }: { value: string; onChange: (value: string) => void; ariaLabel: string; required?: boolean }) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => monthStart(parseDate(value)))
  const [focusedDate, setFocusedDate] = useState(() => dateValue(parseDate(value)))
  const [position, setPosition] = useState({ top: 0, left: 0, width: 320 })
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dayRefs = useRef(new Map<string, HTMLButtonElement>())
  const id = useId()
  const today = dateValue(new Date())
  const monthLabel = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const positionPanel = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = Math.min(320, window.innerWidth - 24)
    const height = panelRef.current?.offsetHeight || 390
    const below = rect.bottom + 8
    const top = below + height <= window.innerHeight - 12 ? below : Math.max(12, rect.top - height - 8)
    setPosition({ top, left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), width })
  }, [])
  function close(restoreFocus = false) {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true })
  }
  function show() {
    const date = parseDate(value)
    setMonth(monthStart(date))
    setFocusedDate(dateValue(date))
    positionPanel()
    setOpen(true)
  }
  function select(next: string) { onChange(next); close(true) }
  useEffect(() => {
    if (!open) return
    positionPanel()
    const focusFrame = requestAnimationFrame(() => dayRefs.current.get(focusedDate)?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(focusFrame)
  }, [open, focusedDate, positionPanel])
  useEffect(() => {
    if (!open) return
    function outside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node) && !panelRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', positionPanel)
    window.addEventListener('scroll', positionPanel, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', positionPanel)
      window.removeEventListener('scroll', positionPanel, true)
    }
  }, [open, positionPanel])
  function navigateMonth(offset: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1, 12)
    setMonth(next)
    setFocusedDate(dateValue(next))
  }
  function navigateDay(event: KeyboardEvent<HTMLButtonElement>, date: Date) {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -date.getDay(), End: 6 - date.getDay() }
    const next = new Date(date)
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      const offset = event.key === 'PageUp' ? -1 : 1
      const last = new Date(date.getFullYear(), date.getMonth() + offset + 1, 0).getDate()
      next.setDate(1)
      next.setMonth(date.getMonth() + offset)
      next.setDate(Math.min(date.getDate(), last))
    } else if (event.key in offsets) next.setDate(date.getDate() + offsets[event.key])
    else return
    event.preventDefault()
    setMonth(monthStart(next))
    setFocusedDate(dateValue(next))
  }
  const gridStart = new Date(month)
  gridStart.setDate(1 - month.getDay())
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return date
  })

  return <div className={`date-picker ${open ? 'is-open' : ''}`} ref={rootRef}>
    <input type="date" value={value} onChange={event => onChange(event.target.value)} aria-label={ariaLabel} required={required} onKeyDown={event => {
      if (event.altKey && event.key === 'ArrowDown') { event.preventDefault(); show() }
    }} />
    <button ref={triggerRef} className="date-picker-trigger" type="button" aria-label="Choose required date" aria-haspopup="dialog" aria-expanded={open} aria-controls={`${id}-calendar`} onClick={() => open ? close() : show()}><CalendarDays size={18} aria-hidden="true" /></button>
    {open ? createPortal(<div ref={panelRef} id={`${id}-calendar`} className="date-picker-panel" style={position} role="dialog" aria-label="Choose required date" onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true) }
    }} onBlur={event => {
      const next = event.relatedTarget as Node | null
      if (next && !panelRef.current?.contains(next) && !rootRef.current?.contains(next)) close()
    }}>
      <header className="date-picker-heading"><div><span>เลือกวันที่ต้องการใช้</span><strong id={`${id}-month`} aria-live="polite">{monthLabel}</strong></div><div>
        <button type="button" aria-label="Previous month" onClick={() => navigateMonth(-1)}><ChevronLeft size={18} /></button>
        <button type="button" aria-label="Next month" onClick={() => navigateMonth(1)}><ChevronRight size={18} /></button>
      </div></header>
      <div className="date-picker-weekdays" aria-hidden="true">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => <span key={day}>{day}</span>)}</div>
      <div className="date-picker-days" role="group" aria-labelledby={`${id}-month`}>{days.map(date => {
        const iso = dateValue(date)
        return <button key={iso} ref={node => { if (node) dayRefs.current.set(iso, node); else dayRefs.current.delete(iso) }} type="button" tabIndex={iso === focusedDate ? 0 : -1} className={`${date.getMonth() !== month.getMonth() ? 'is-outside' : ''} ${iso === value ? 'is-selected' : ''}`} aria-label={date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} aria-pressed={iso === value} aria-current={iso === today ? 'date' : undefined} onClick={() => select(iso)} onKeyDown={event => navigateDay(event, date)}>{date.getDate()}</button>
      })}</div>
      <footer className="date-picker-footer"><button type="button" onClick={() => select('')}>Clear / ล้าง</button><button type="button" onClick={() => select(today)}>Today / วันนี้</button></footer>
    </div>, document.body) : null}
  </div>
}
