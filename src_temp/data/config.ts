import type { EventType, FeedId, IconName } from '../types'
export const EVENT_TYPES: Record<EventType, { label: string; feed: FeedId; icon: IconName }> = {
  job: { label: 'Job advertisement', feed: 'official', icon: 'bag' },
  cofounder: { label: 'Co-founder search', feed: 'official', icon: 'people' },
  official: { label: 'Official event', feed: 'official', icon: 'bag' },
  hobby: { label: 'Hobby meetup', feed: 'social', icon: 'leaf' },
  alumni: { label: 'Alumni meetup', feed: 'social', icon: 'people' },
  party: { label: 'Party', feed: 'social', icon: 'people' },
  announcement: { label: 'Organizer announcement', feed: 'notices', icon: 'notice' },
}
export const FEEDS: Record<FeedId, { title: string; intro: string; label: string; eyebrow: string; hero: string; sub: string; icon: IconName }> = {
  official: { title: 'Ideas meet opportunity.', intro: 'Find your next role, your co-founder or your next big step.', label: 'Opportunities', eyebrow: 'Build something together', hero: 'Your next chapter\nstarts with a hello.', sub: 'Jobs, co-founder searches and official community events.', icon: 'bag' },
  social: { title: 'Good people.\nReal connections.', intro: 'Make room for shared hobbies, familiar faces and a little fun.', label: 'Social Events', eyebrow: 'A community beyond the programme', hero: 'Less scrolling.\nMore showing up.', sub: 'Find your people, one shared moment at a time.', icon: 'people' },
  notices: { title: 'The organizer room.', intro: 'A dedicated space for organizers to share updates and coordinate.', label: 'Announcements', eyebrow: 'Keep everyone on the same page', hero: 'Well organized.\nWell connected.', sub: 'Internal announcements, reminders and programme updates.', icon: 'notice' },
}
export const TOPICS = ['Workshop', 'Aerospace', 'Robotics', 'Party', 'Entrepreneurship', 'AI & Technology', 'Sustainability', 'Networking', 'Hobby Meetups', 'Internships', 'Co-founder Search', 'Sports & Outdoors']
export const TRAIT_LABELS = { interests: 'Interests', courses: 'Courses taken', profession: 'Profession', major: 'Major / Field of study' }
