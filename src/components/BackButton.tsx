import { Icon } from './Icon'
export function BackButton({ onClick, children = 'Back to feed' }: { onClick: () => void; children?: string }) {
  return <button type="button" className="back" onClick={onClick}><Icon name="back" />{children}</button>
}
