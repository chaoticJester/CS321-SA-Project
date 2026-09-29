import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type SelectOption = string | { value: string; label: string }

type PolishedSelectProps = {
  value: string
  options: readonly SelectOption[]
  onChange: (value: string) => void
  ariaLabel: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  numbered?: boolean
  compact?: boolean
  wide?: boolean
  id?: string
}

type MenuPosition = { top?: number; bottom?: number; left: number; width: number; maxHeight: number }

export function PolishedSelect({ value, options, onChange, ariaLabel, placeholder = '<กรุณาเลือก / Please select>', disabled = false, required = false, numbered = false, compact = false, wide = false, id }: PolishedSelectProps) {
  const [open, setOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const generatedId = useId()
  const triggerId = id || `polished-select-${generatedId}`
  const menuId = `${triggerId}-menu`
  const normalized = options.map(option => typeof option === 'string' ? { value: option, label: option } : option)
  const selectedIndex = normalized.findIndex(option => option.value === value)
  const selectedLabel = selectedIndex >= 0 ? normalized[selectedIndex].label : ''

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [open])

  const isOpen = open && !disabled
  const positionMenu = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const viewportPadding = 12
    const preferredWidth = wide || numbered ? 460 : rect.width
    const width = Math.min(Math.max(rect.width, preferredWidth), window.innerWidth - viewportPadding * 2)
    const left = Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - width - viewportPadding)
    const roomBelow = window.innerHeight - rect.bottom - viewportPadding
    const roomAbove = rect.top - viewportPadding
    if (roomBelow < 180 && roomAbove > roomBelow) setMenuPosition({ bottom: window.innerHeight - rect.top + 8, left, width, maxHeight: Math.min(324, roomAbove - 8) })
    else setMenuPosition({ top: rect.bottom + 8, left, width, maxHeight: Math.min(324, roomBelow - 8) })
  }, [numbered, wide])

  useEffect(() => {
    if (!isOpen) return
    window.addEventListener('resize', positionMenu)
    window.addEventListener('scroll', positionMenu, true)
    return () => {
      window.removeEventListener('resize', positionMenu)
      window.removeEventListener('scroll', positionMenu, true)
    }
  }, [isOpen, positionMenu])
  const focusOption = (index: number) => {
    const next = Math.max(0, Math.min(normalized.length - 1, index))
    optionRefs.current[next]?.focus()
  }

  const openAndFocus = (index: number) => {
    if (disabled || !normalized.length) return
    positionMenu()
    setOpen(true)
    window.requestAnimationFrame(() => focusOption(index))
  }

  return <div className={`polished-select${compact ? ' is-compact' : ''}${numbered ? ' is-numbered' : ''}`} ref={rootRef} onKeyDown={event => {
    if (event.key === 'Escape' && isOpen) { event.preventDefault(); setOpen(false); triggerRef.current?.focus() }
  }}>
    <button ref={triggerRef} id={triggerId} className="polished-select-trigger" type="button" aria-label={ariaLabel} aria-haspopup="listbox" aria-controls={menuId} aria-expanded={isOpen} aria-required={required} disabled={disabled} onClick={() => { if (isOpen) setOpen(false); else { positionMenu(); setOpen(true) } }} onKeyDown={event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); openAndFocus(selectedIndex >= 0 ? selectedIndex : event.key === 'ArrowDown' ? 0 : normalized.length - 1) }
    }}>
      <span className={selectedLabel ? '' : 'placeholder'}>{selectedLabel || placeholder}</span><span className="select-chevron" aria-hidden="true" />
    </button>
    {isOpen && menuPosition ? createPortal(<ul ref={menuRef} id={menuId} className="polished-select-menu" role="listbox" aria-label={ariaLabel} style={menuPosition}>
      {normalized.map((option, index) => { const selected = value === option.value; const numberedLabel = numbered ? option.label.replace(/^\d+\.\s*/, '') : option.label; return <li key={option.value} role="presentation"><button ref={node => { optionRefs.current[index] = node }} type="button" role="option" aria-selected={selected} className={selected ? 'selected' : ''} onClick={() => { onChange(option.value); setOpen(false); triggerRef.current?.focus() }} onKeyDown={event => {
        if (event.key === 'ArrowDown') { event.preventDefault(); focusOption((index + 1) % normalized.length) }
        if (event.key === 'ArrowUp') { event.preventDefault(); focusOption((index - 1 + normalized.length) % normalized.length) }
        if (event.key === 'Home') { event.preventDefault(); focusOption(0) }
        if (event.key === 'End') { event.preventDefault(); focusOption(normalized.length - 1) }
      }}>{numbered ? <span className="option-number">{index + 1}</span> : null}<span className="option-label">{numberedLabel}</span>{selected ? <span className="option-check" aria-hidden="true">✓</span> : null}</button></li> })}
    </ul>, document.body) : null}
  </div>
}
