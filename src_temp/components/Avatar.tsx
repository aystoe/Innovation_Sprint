import type { Profile } from '../types'
import { photoSource } from '../utils/avatar'
export function Avatar({ person, onClick, label }: { person: Profile | null; onClick: () => void; label?: string }) {
  return <button type="button" className="avatar-button" onClick={onClick} aria-label={label ?? `View ${person?.name ?? 'your'} profile`}><img src={photoSource(person?.photo)} alt="" /></button>
}
