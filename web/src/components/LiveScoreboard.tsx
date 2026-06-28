import { useState } from 'react'
import s from './LiveScoreboard.module.css'
import type { LiveState } from '../types'

// Collapsible "On Now" group used in the sidebar.
function Group({
  color,
  name,
  defaultOpen = false,
  children,
}: {
  color: string
  name: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={s.lb}>
      <div className={s.lbH} onClick={() => setOpen((o) => !o)}>
        <div className={s.lbColor} style={{ background: color }}>
          <i className="ti ti-ball-football" />
        </div>
        <span className={s.lbName}>{name}</span>
        <i className={`ti ti-chevron-right ${s.lbChev} ${open ? s.open : ''}`} />
      </div>
      <div className={`${s.lbPlayers} ${open ? s.open : ''}`}>{children}</div>
    </div>
  )
}

function Row({
  done,
  name,
  match,
  pts,
}: {
  done?: boolean
  name: string
  match: React.ReactNode
  pts: number | string
}) {
  return (
    <div className={s.lp}>
      <div className={`${s.lpPip} ${done ? s.done : ''}`} />
      <div className={s.lpBody}>
        <div className={s.lpN}>{name}</div>
        <div className={s.lpMatch}>{match}</div>
      </div>
      <div className={s.lpPts}>{pts}</div>
    </div>
  )
}

// Live matchups from the sim, shown when in LIVE_ACTION.
export function LiveScoreboard({ live }: { live?: LiveState | null }) {
  if (live && live.matchups.length > 0) {
    const teamName = (id: string) => live.teams.find((t) => t.id === id)?.name ?? 'Team'
    return (
      <>
        <div className={s.onNowLabel}>Live Matchups — GW{live.gameweek?.number ?? ''}</div>
        <Group color="var(--epl)" name="Matchups" defaultOpen>
          {live.matchups.map((m) => {
            const home = teamName(m.home_team_id)
            const away = teamName(m.away_team_id)
            return (
              <Row
                key={m.id}
                done={m.status !== 'active'}
                name={`${home} vs ${away}`}
                match={
                  <>
                    {home} <span className={s.scoreEm}>{m.home_score}–{m.away_score}</span> {away} ·{' '}
                    {m.status === 'active' ? (
                      <span className={s.liveMin}>LIVE</span>
                    ) : (
                      <span className={s.doneLabel}>FT</span>
                    )}
                  </>
                }
                pts={Math.max(m.home_score, m.away_score)}
              />
            )
          })}
        </Group>
      </>
    )
  }

  // Static mockup (parity with the original "On Now" panel).
  return (
    <>
      <div className={s.onNowLabel}>On Now</div>
      <Group color="var(--epl)" name="Premier League" defaultOpen>
        <Row name="M. Salah" pts={18} match={<>LIV <span className={s.scoreEm}>2–1</span> MCI · <span className={s.liveMin}>67'</span></>} />
        <Row done name="T. Alexander-Arnold" pts={9} match={<>LIV <span className={s.scoreEm}>2–1</span> MCI · <span className={s.doneLabel}>FT</span></>} />
        <Row done name="R. Dias" pts={6} match={<>ARS <span className={s.scoreEm}>1–0</span> CHE · <span className={s.doneLabel}>FT</span></>} />
      </Group>
      <Group color="var(--ll)" name="La Liga">
        <Row name="Vinícius Jr." pts={14} match={<>RMA <span className={s.scoreEm}>3–0</span> BAR · <span className={s.liveMin}>52'</span></>} />
      </Group>
      <Group color="var(--sa)" name="Serie A">
        <Row done name="A. Onana" pts={11} match={<>INT <span className={s.scoreEm}>2–0</span> JUV · <span className={s.doneLabel}>FT</span></>} />
      </Group>
    </>
  )
}
