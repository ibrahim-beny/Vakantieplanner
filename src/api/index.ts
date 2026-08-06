import type { TripApi } from './tripApi'

/**
 * De mock is dubbel afgegrendeld: `import.meta.env.DEV` is in een
 * productie-build statisch `false` (de mock-tak wordt dan weggecompileerd)
 * én er is een expliciete opt-in via VITE_USE_MOCK=1 nodig.
 */
const useMock = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === '1'

export const api: TripApi = useMock
  ? (await import('./mockApi')).mockApi
  : (await import('./supabaseApi')).supabaseApi
