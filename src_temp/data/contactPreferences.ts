import type { ContactPreference } from '../types'

export const CONTACT_OPTIONS: {
  value: ContactPreference
  title: string
  description: string
}[] = [
  {
    value: 'gray',
    title: 'Not accepting messages',
    description: 'I’m not accepting messages.',
  },
  {
    value: 'yellow',
    title: 'Organizers & educators only',
    description: 'Messages from organizers and educators only.',
  },
  {
    value: 'green',
    title: 'Everyone welcome',
    description: 'Everyone is welcome to contact me.',
  },
]

export function getContactOption(value: unknown) {
  return (
    CONTACT_OPTIONS.find(option => option.value === value) ??
    CONTACT_OPTIONS[0]
  )
}