import type { CommunityEvent } from '../types'
import { isPhoto } from '../utils/avatar'
export const DEFAULT_EVENT_IMAGE = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#e3ebd9"/><rect x="65" y="80" width="270" height="240" rx="25" fill="#fafbf5"/><circle cx="140" cy="155" r="30" fill="#bdce9f"/><path d="m85 290 90-100 55 60 45-45 40 85" fill="#7e9b6a"/></svg>')
const samples: Record<string,string> = {
  'social-1': 'https://images.unsplash.com/photo-1773123441735-36080bb7d4d8?w=640&q=80&fit=crop',
  'social-2': 'https://images.unsplash.com/photo-1718660333972-41e6731ce1ba?w=640&q=80&fit=crop',
  'social-3': 'https://assets.simpleviewinc.com/simpleview/image/upload/crm/traversecity/patrons_69E8E5A3-5056-BF65-D6A28F153FED6769-69e8e46c5056bf6_69e93082-5056-bf65-d69f54fde923ba5c.jpg',
}
export function eventImage(event: Pick<CommunityEvent, 'id' | 'type' | 'image'>): string {
  if (event.image && isPhoto(event.image)) return event.image
  if (samples[event.id]) return samples[event.id]
  if (['job','cofounder','official'].includes(event.type)) return 'https://media.firstbusiness.com/image/upload/v1708040120/new-site/header_1800pix_SuccessionPlanning.jpg'
  return DEFAULT_EVENT_IMAGE
}
