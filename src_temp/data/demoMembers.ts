import type { Profile } from '../types'
import { avatarImage } from '../utils/avatar'

// Fixed identities: these members stay stable across reloads and demo resets.
const NAMES = [
  'Emma Fischer', 'Liam Müller', 'Sofia Rossi', 'Noah Schmidt', 'Amelia Brown', 'Oliver Wilson',
  'Isabella Garcia', 'Lucas Martin', 'Mia Schneider', 'Ethan Williams', 'Charlotte Dubois', 'James Anderson',
  'Harper Lee', 'Benjamin Clark', 'Evelyn Nguyen', 'Henry Thomas', 'Aria Patel', 'Theodore Davis',
  'Chloe Laurent', 'Felix Wagner', 'Nora Hoffmann', 'Leo Becker', 'Hannah Kim', 'Oscar Lindberg',
  'Freya Jensen', 'Arthur Silva', 'Layla Hassan', 'Hugo Moreau', 'Zoe Papadopoulos', 'Matteo Ricci',
  'Aisha Khan', 'Daniel Park', 'Yuna Choi', 'Gabriel Santos', 'Elena Petrova', 'David Okafor',
  'Anika Sharma', 'Louis Bernard', 'Clara Neumann', 'Maximilian Wolf', '김민준', '이서연',
  '박지우', '정수빈', 'Sakura Tanaka', 'Wei Zhang',
]
const PROFESSIONS = ['Student', 'Alumni', 'Founder', 'Educator', 'Organizer']
const MAJORS = ['Computer Science', 'Mechanical Engineering', 'Management', 'Industrial Engineering', 'Design', 'Environmental Science', 'Aerospace Engineering', 'Economics']
const INTERESTS = ['Robotics', 'AI & Technology', 'Sustainability', 'Entrepreneurship', 'Sports & Outdoors', 'Networking', 'Workshop', 'Aerospace', 'Hobby Meetups', 'Party', 'Internships', 'Co-founder Search']
const COURSES = ['Innovation Sprint 26w', 'Innovation Sprint 25w', 'Tech Challenge 26w', 'Tech Challenge 25w', 'Manage and More 25s', 'Manage and More 26s']
const COLORS = [['#e2e9d5', '#73815f'], ['#e9d9cb', '#9c7b65'], ['#e2ddef', '#7d7197'], ['#d8e5e9', '#60848c'], ['#f1dce0', '#a1717a']]

export const DEMO_MEMBERS: Profile[] = NAMES.map((name, i) => {
  const interests = [INTERESTS[i % INTERESTS.length], INTERESTS[(i + 3) % INTERESTS.length], INTERESTS[(i + 7) % INTERESTS.length]]
  const [background, foreground] = COLORS[i % COLORS.length]
  return {
    id: `member-${String(i + 1).padStart(2, '0')}`, name,
    occupation: PROFESSIONS[i % PROFESSIONS.length], major: MAJORS[i % MAJORS.length],
    bio: `I enjoy ${interests[0].toLowerCase()} and ${interests[1].toLowerCase()}. Happy to exchange ideas, learn with the community and meet new people.`,
    interests: interests.join(', '), topics: [interests[0], interests[2]],
    courses: [COURSES[i % COURSES.length], COURSES[(i + 2) % COURSES.length]].join(', '),
    photo: avatarImage(background, foreground), social: '', socialOther: '',
    contactPreference: (['green', 'yellow', 'gray'] as const)[i % 3],
    attendedEventIds: i % 4 === 0 ? ['social-3', 'official-3'] : i % 4 === 1 ? ['social-3'] : i % 4 === 2 ? ['official-3'] : [],
  }
})
