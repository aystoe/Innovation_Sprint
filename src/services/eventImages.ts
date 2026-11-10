import type { CommunityEvent } from '../types'
import { isPhoto } from '../utils/avatar'
export const V3_IMAGES = {
  social: new URL('../assets/v3/social.jpg', import.meta.url).href,
  laugh: new URL('../assets/v3/laugh.jpg', import.meta.url).href,
  workshop: new URL('../assets/v3/workshop.jpg', import.meta.url).href,
  team: new URL('../assets/v3/team.jpg', import.meta.url).href,
  outdoor: new URL('../assets/v3/outdoor.jpg', import.meta.url).href,
  build: new URL('../assets/v3/build.jpg', import.meta.url).href,
  talk: new URL('../assets/v3/talk.jpg', import.meta.url).href,
  campus: new URL('../assets/v3/campus.jpg', import.meta.url).href,
  hall: new URL('../assets/v3/hall.jpg', import.meta.url).href,
}
export const DEFAULT_EVENT_IMAGE = V3_IMAGES.workshop
export function eventImage(event: Pick<CommunityEvent, 'id' | 'type' | 'image'>): string {
  if (event.image && isPhoto(event.image)) return event.image
  const samples: Record<string,string> = { 'social-1':V3_IMAGES.laugh, 'social-2':V3_IMAGES.outdoor, 'social-3':V3_IMAGES.social, 'official-1':V3_IMAGES.team, 'official-2':V3_IMAGES.team, 'official-3':V3_IMAGES.talk }
  return samples[event.id] ?? (event.type==='party' ? V3_IMAGES.social : event.type==='official' ? V3_IMAGES.talk : ['job','cofounder'].includes(event.type) ? V3_IMAGES.team : DEFAULT_EVENT_IMAGE)
}
