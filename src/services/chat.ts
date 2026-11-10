import type { Conversation, Profile, Snapshot } from '../types'
import { newId } from '../utils/format'
import { normalizeMemberText } from './memberDirectory'

export const MAX_MESSAGE_LENGTH = 2000
export function suggestedMessages(senderName: string, recipientName: string): string[] {
  const sender = senderName.trim(), first = recipientName.trim().split(/\s+/)[0] || 'there'
  return [
    sender ? `Hi, this is ${sender}. Would you be up for coffee tomorrow?` : 'Hi! Would you be up for coffee tomorrow?',
    sender ? `Hi ${first}, I'm ${sender}. I'd love to hear more about what you're working on!` : `Hi ${first}, I'd love to hear more about what you're working on!`,
    `Hey ${first}, are you going to the next community event? It would be great to meet!`,
  ]
}
/** Commit both sides together so navigation, reloads and reset cannot orphan a reply. */
export function sendDemoMessage(snapshot: Snapshot, recipient: Profile | null, text: string, now = new Date()): Snapshot {
  const body = text.trim()
  if (!recipient || recipient.id === 'me') throw new Error('Choose another community member to chat with.')
  if (!body) throw new Error('Write a message before sending.')
  if (body.length > MAX_MESSAGE_LENGTH) throw new Error(`Keep your message under ${MAX_MESSAGE_LENGTH + 1} characters.`)
  const conversations = snapshot.conversations ?? []
  const previous = conversations.find(conversation => conversation.personId === recipient.id)
  const conversation: Conversation = {
    personId: recipient.id,
    messages: [
      ...(previous?.messages ?? []),
      { id: newId(), sender: 'me', text: body, createdAt: now.toISOString() },
      { id: newId(), sender: 'them', text: `Hi, this is ${recipient.name}, how is it going?`, createdAt: now.toISOString(), automated: true },
    ],
  }
  return { ...snapshot, conversations: [conversation, ...conversations.filter(item => item.personId !== recipient.id)] }
}
export function searchChatMembers(profiles: Profile[], query: string): Profile[] {
  const words = normalizeMemberText(query).split(' ').filter(Boolean)
  return profiles.filter(person => person.id !== 'me' && words.every(word => normalizeMemberText(person.name).includes(word)))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
}
