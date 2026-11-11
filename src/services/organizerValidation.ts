export function escapeSearch(value: string) { return value.replace(/[\\%_]/g, '\\$&') }
export function validateRequest(senderId: string, recipientId: string, title: string, body: string) {
  if (!senderId || !recipientId || senderId === recipientId) throw new Error('Choose another member to contact.')
  if (!title.trim() || title.trim().length > 150) throw new Error('Add a title of 1–150 characters.')
  if (!body.trim() || body.trim().length > 2000) throw new Error('Add a message of 1–2,000 characters.')
}
