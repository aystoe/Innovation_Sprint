import { useCommunity } from '../context/CommunityContext'
import { LiveRequests } from './LiveRequests'
export function MemberRequests() {
  const { userId } = useCommunity()
  return <LiveRequests key={userId} direction="received" />
}
