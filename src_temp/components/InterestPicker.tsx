export function InterestPicker({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return <div className="interest-picker" role="group" aria-label="Choose interests">{options.map(interest => {
    const checked = selected.includes(interest)
    return <button key={interest} type="button" className={`interest-choice ${checked ? 'selected' : ''}`} aria-pressed={checked} onClick={() => onToggle(interest)}><span className="interest-check" aria-hidden="true">{checked ? '✓' : '+'}</span>{interest}</button>
  })}</div>
}
