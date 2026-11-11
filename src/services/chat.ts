export const MAX_MESSAGE_LENGTH = 2000
export function suggestedMessages(senderName: string, recipientName: string): string[] {
  const sender = senderName.trim(), first = recipientName.trim().split(/\s+/)[0] || 'there'
  return [
    sender ? `Hi, this is ${sender}. Would you be up for coffee tomorrow?` : 'Hi! Would you be up for coffee tomorrow?',
    sender ? `Hi ${first}, I'm ${sender}. I'd love to hear more about what you're working on!` : `Hi ${first}, I'd love to hear more about what you're working on!`,
    `Hey ${first}, are you going to the next community event? It would be great to meet!`,
  ]
}
