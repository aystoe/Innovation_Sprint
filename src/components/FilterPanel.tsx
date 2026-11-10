import { useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
export interface ActiveFilter { id: string; label: string; onRemove: () => void }
export function FilterPanel({ children, active, onClear, label = 'Filters' }: { children: ReactNode; active: ActiveFilter[]; onClear: () => void; label?: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  return <section className="filter-panel" aria-label={label}>
    <div className="filter-toolbar"><button ref={trigger} type="button" className={`filter-toggle ${open ? 'selected' : ''}`} aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}><Icon name="filter" />{label}{active.length > 0 && <span className="filter-count">{active.length}</span>}<span aria-hidden="true">{open ? '−' : '+'}</span></button>{active.length > 0 && <button type="button" className="clear-filters" onClick={onClear}>Clear all</button>}</div>
    {active.length > 0 && <div className="active-filters" aria-label="Selected filters">{active.map(filter => <button type="button" key={filter.id} className="active-filter" onClick={filter.onRemove} aria-label={`Remove ${filter.label} filter`}>{filter.label}<span aria-hidden="true">×</span></button>)}</div>}
    <div id={id} hidden={!open} className="filter-panel-body">{children}<button type="button" className="primary filter-done" onClick={() => { setOpen(false); trigger.current?.focus() }}>Show results</button></div>
  </section>
}
