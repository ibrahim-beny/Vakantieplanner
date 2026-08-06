/**
 * Er is geen login: dit onthoudt per browser welk profiel "jij" bent
 * (puur om bij te houden wie een dag bewerkte), niet wie er toegang heeft.
 */
const KEY = 'vakantieplanner:profileId'

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((cb) => cb())

export function getStoredProfileId(): string | null {
  return localStorage.getItem(KEY)
}

export function setStoredProfileId(id: string) {
  localStorage.setItem(KEY, id)
  notify()
}

export function clearStoredProfileId() {
  localStorage.removeItem(KEY)
  notify()
}

export function subscribeIdentity(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
