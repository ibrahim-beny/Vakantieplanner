import { useEffect, useState } from 'react'
import { getStoredProfileId, subscribeIdentity } from '../../lib/identity'

/** Geen login: dit volgt alleen welk profiel lokaal gekozen is. */
export function useIdentity() {
  const [profileId, setProfileId] = useState(getStoredProfileId)

  useEffect(() => subscribeIdentity(() => setProfileId(getStoredProfileId())), [])

  return profileId
}
