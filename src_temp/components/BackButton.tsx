import { Icon } from './Icon'
export function BackButton({ onClick, children = 'Back to feed', sticky = false }: { onClick: () => void; children?: string; sticky?: boolean }) {
  const button = <button type="button" className="back" onClick={onClick}><Icon name="back" />{children}</button>
  return sticky ? <div className="sticky-back">{button}</div> : button
}
