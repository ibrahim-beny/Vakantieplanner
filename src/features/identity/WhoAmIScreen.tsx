import { setStoredProfileId } from '../../lib/identity'
import type { Profile } from '../../lib/types'

/**
 * Geen login: gewoon kiezen wie je bent, puur om bij te houden wie een dag
 * bewerkte. Iedereen met de link kan hier elk profiel kiezen.
 */
export function WhoAmIScreen({ members }: { members: Profile[] }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-cream p-4">
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

        <div className="mt-7 animate-fade">
          <p className="field-label">Wie ben jij?</p>
          <div className="mt-3 flex flex-col gap-2.5">
            {members.map((member) => (
              <button
                key={member.id}
                type="button"
                className="flex items-center gap-3 border-[1.5px] border-edge bg-transparent px-3.5 py-3 text-left hover:border-diesel"
                onClick={() => setStoredProfileId(member.id)}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-[15px] font-bold text-card"
                  style={{ background: member.color }}
                >
                  {member.display_name.charAt(0).toUpperCase()}
                </span>
                <span className="text-[16px] text-ink">Ik ben {member.display_name}</span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-[13px] text-muted">
            Geen wachtwoord nodig — dit onthoudt alleen wie iets bewerkt, iedereen met deze link
            kan de planning zien en aanpassen.
          </p>
        </div>
      </div>
    </div>
  )
}
