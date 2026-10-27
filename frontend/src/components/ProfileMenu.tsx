import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'

type ProfileMenuProps = {
  children: ReactNode
  className: string
  onSignOut: () => void
}

export function ProfileMenu({ children, className, onSignOut }: ProfileMenuProps) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return <div ref={containerRef} className="relative" onBlur={event => {
    // Some browsers do not focus a clicked button, leaving relatedTarget null.
    // Outside pointer presses are handled separately so logout can receive its click.
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }}>
    <button ref={triggerRef} className={className} type="button" aria-label="Profile" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      {children}
    </button>
    {open && <div id={id} className="absolute right-0 top-full z-50 mt-2 w-44 rounded-xl border border-[#dde2e8] bg-white p-1.5 shadow-lg">
      <button className="flex min-h-10 w-full items-center gap-2 rounded-lg border-0 bg-transparent px-3 py-2 text-left text-sm font-medium text-[#5e6669] hover:bg-[#e7ebef] focus-visible:outline-2 focus-visible:outline-[#4f6fae]" type="button" onClick={() => {
        setOpen(false)
        onSignOut()
      }}>
        <img className="h-[18px] w-[18px]" src={`${import.meta.env.BASE_URL}figma/requester-logout.svg`} alt="" />Log out
      </button>
    </div>}
  </div>
}
