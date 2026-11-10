import type { Profile } from '../types'
import { DEMO_MEMBERS } from './demoMembers'
import { avatarImage } from '../utils/avatar'

const rawProfiles = {
maya:{name:'Maya Chen',occupation:'Co-founder · RePack Studio',bio:'I turn circular economy ideas into practical products. Always happy to exchange ideas over coffee and help early-stage teams find their next experiment.',interests:'Sustainability, Entrepreneurship, Robotics',major:'Industrial Engineering',courses:'Innovation Sprint 26w, Manage and More 25s',photo:avatarImage(),attendedEventIds:['social-3','official-3','social-1']},
jonas:{name:'Jonas Weber',occupation:'Product Manager',bio:'Building climate tech products and making time for the outdoors. Let’s talk about product discovery, aerospace or the next community hike.',interests:'Aerospace, Workshop, Sports & Outdoors',major:'Mechanical Engineering',courses:'Innovation Sprint 26w, Tech Challenge 25w',photo:avatarImage('#e9d9cb','#9c7b65'),attendedEventIds:['social-3','official-3']},
alex:{name:'Alex Morgan',occupation:'Software Engineer',bio:'I enjoy robotics, prototyping and meeting people who like making things. Looking for new collaborators and a good workshop.',interests:'Robotics, AI & Technology, Workshop, Party',major:'Computer Science',courses:'Tech Challenge 26w, Innovation Sprint 25w',photo:avatarImage('#e2ddef','#7d7197'),attendedEventIds:['social-3','official-3','social-2','social-1']},
organizer:{name:'Sam Taylor',occupation:'Programme Coordinator',bio:'Helping our community learn, build and stay connected. I organize programme sessions, alumni meetups and opportunities to share experience.',interests:'Networking, Workshop, Entrepreneurship',major:'Management',courses:'Innovation Sprint 26w',photo:avatarImage('#d8e5e9','#60848c'),attendedEventIds:['social-3','official-3']}
}

export const SAMPLE_PROFILES: Record<string, Profile> = Object.fromEntries([...Object.entries(rawProfiles).map(([id, value]) => [id, { ...value, id, social: '', socialOther: '', topics: [] }] as const), ...DEMO_MEMBERS.map(profile => [profile.id, profile] as const)])

export const emptyProfile = (): Profile => ({ id: 'me', name: '', occupation: '', bio: '', major: '', interests: '', courses: '', photo: '', social: '', socialOther: '', topics: [], attendedEventIds: [] })
