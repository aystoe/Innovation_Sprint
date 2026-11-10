import { useEffect, useRef } from 'react'
export function ResetDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const panel = useRef<HTMLElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const buttons = panel.current?.querySelectorAll<HTMLButtonElement>('button')
    buttons?.[0]?.focus()
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); onCancel() }
      if (event.key === 'Tab' && buttons?.length) {
        const first = buttons[0], last = buttons[buttons.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.removeEventListener('keydown', keydown); previous?.focus() }
  }, [onCancel])
  return <div className="reset-backdrop" onClick={event => { if (event.target === event.currentTarget) onCancel() }}><section ref={panel} className="reset-dialog" role="dialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-description"><h2 id="reset-title">Reset this demo?</h2><p id="reset-description">Your profile, custom events, participation history, reviews and chats on this device will be removed.</p><button className="primary" type="button" onClick={onConfirm}>Reset demo data</button><button className="secondary" type="button" onClick={onCancel}>Cancel</button></section></div>
}
