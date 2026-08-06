import { useState, type FormEvent } from 'react'
import { api } from '../../api'

/**
 * Magic-link login. Geen wachtwoordveld, geen registratie en (in productie)
 * geen bypass-knop: de gebruiker moet echt op de gemailde link klikken.
 */
export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<'form' | 'sent'>('form')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.signInWithMagicLink(email)
      setStep('sent')
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      setError(
        /signup|not allowed|not found/i.test(message)
          ? 'Dit e-mailadres heeft geen toegang tot deze planner.'
          : `Versturen mislukt: ${message}`,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-cream p-4">
      {/* Signature contourlijn als achtergronddecoratie */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <path
          d="M -60 560 C 140 480, 200 640, 340 560 S 520 380, 400 320 S 120 300, 240 200"
          fill="none"
          stroke="#2C3B4A"
          strokeWidth="2.5"
          strokeDasharray="10 14"
          opacity="0.16"
        />
        <path
          d="M 1500 120 C 1340 180, 1300 80, 1160 140 S 1000 260, 1080 330"
          fill="none"
          stroke="#2C3B4A"
          strokeWidth="2.5"
          strokeDasharray="10 14"
          opacity="0.16"
        />
      </svg>

      <div
        className="relative w-full max-w-[420px] border-[1.5px] border-edge bg-card"
        style={{ padding: 'clamp(28px, 5vw, 44px)' }}
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-sage-btn">
          Trip planner · Westelijke VS
        </p>
        <h1
          className="mt-3 font-display font-extrabold leading-[1.05] text-ink"
          style={{ fontSize: 'clamp(30px, 6vw, 40px)' }}
        >
          USA Roadtrip september 2026
        </h1>
        <p className="mt-2 text-[15px] text-inkbody">Plan samen. Onderweg bijhouden.</p>

        {step === 'form' ? (
          <form onSubmit={submit} className="mt-7 animate-fade">
            <label htmlFor="login-email" className="field-label">
              E-mailadres
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              className="field-input px-3.5 py-3 text-[16px]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && (
              <p className="mt-3 border border-canyon bg-[#E8C4B4] px-3 py-2 font-mono text-[13px] text-canyon-dark">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy} className="btn-primary mt-5 w-full text-[16px]">
              {busy ? 'Versturen…' : 'Verstuur magic link'}
            </button>
            <p className="mt-4 text-[13px] text-muted">
              Geen wachtwoord nodig — je ontvangt een inloglink per e-mail.
            </p>
          </form>
        ) : (
          <div className="mt-7 animate-fade">
            <p className="border border-sage bg-[#DCE3D3] px-3.5 py-3 font-mono text-[13px] text-[#43503A]">
              Check je mail — we stuurden een link naar {email}
            </p>
            <button
              type="button"
              className="mt-4 w-full border-[1.5px] border-edge bg-transparent px-4 py-2.5 font-mono text-[13px] text-inkbody hover:border-diesel"
              onClick={() => setStep('form')}
            >
              Ander e-mailadres gebruiken
            </button>
            {api.devLogin && (
              <button
                type="button"
                className="btn-outline mt-3 w-full"
                onClick={() => void api.devLogin?.()}
              >
                [dev] Doorgaan als Ibrahim
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
