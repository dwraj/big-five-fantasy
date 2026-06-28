import { useQuery, useQueryClient } from '@tanstack/react-query'
import L from '../components/layout/Layout.module.css'
import s from './Draft.module.css'
import { StatCard } from '../components/StatCard'
import { RosterRow } from '../components/RosterRow'
import { useSim } from '../sim/SimContext'
import { useSimActions } from '../sim/useSimActions'
import { apiGet, ApiError } from '../lib/api'
import type { DraftSession, Player } from '../types'

const POS_LABEL: Record<string, string> = { G: 'GK', D: 'DEF', M: 'MID', F: 'FWD' }

function slotForPick(round: number, pickNumber: number, numTeams: number) {
  return round % 2 === 1
    ? ((pickNumber - 1) % numTeams) + 1
    : numTeams - ((pickNumber - 1) % numTeams)
}

export function Draft() {
  const { sim } = useSim()
  const leagueId = sim?.leagueId
  const qc = useQueryClient()
  const actions = useSimActions()

  const { data: draft } = useQuery({
    queryKey: ['draft', leagueId],
    queryFn: async () => {
      try {
        return await apiGet<DraftSession>(`/drafts/${leagueId}`)
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null
        throw e
      }
    },
    enabled: !!leagueId,
  })
  const { data: players } = useQuery({ queryKey: ['players'], queryFn: () => apiGet<Player[]>('/players') })

  const playerMap = new Map((players ?? []).map((p) => [p.id, p]))
  const teamMap = new Map((sim?.teams ?? []).map((t) => [t.id, t]))
  const order = draft?.draft_order ?? []
  const picks = draft?.draft_picks ?? []
  const numTeams = order.length || 8
  const maxRound = picks.length
    ? Math.max(draft?.current_round ?? 1, ...picks.map((p) => p.round))
    : draft?.current_round ?? 1

  // grid[round][slot] = pick
  const grid: Record<number, Record<number, (typeof picks)[number]>> = {}
  for (const pick of picks) {
    const slot = slotForPick(pick.round, pick.pick_number, numTeams)
    ;(grid[pick.round] ??= {})[slot] = pick
  }

  const taken = new Set(picks.map((p) => p.player_id))
  const available = (players ?? []).filter((p) => !taken.has(p.id))
  const isMyTurn = !!sim?.draft?.isMyTurn && !sim?.draft?.complete

  async function pick(playerId: string) {
    if (!isMyTurn) return
    const res = await actions.draftPick(playerId)
    if (res && !res.ok) {
      alert(res.error || 'Draft pick failed')
      return
    }
    await qc.invalidateQueries({ queryKey: ['draft', leagueId] })
  }

  const orderedSlots = [...order].sort((a, b) => a.slot - b.slot)

  return (
    <>
      <div className={L.row3}>
        <StatCard
          label="Draft status"
          value={sim?.draft?.complete ? 'Complete' : sim?.draft ? 'Active' : 'Pending'}
          valueStyle={{ fontSize: 18, letterSpacing: 0, color: '#16a34a', marginTop: 3 }}
          change="Season 2025–26"
        />
        <StatCard label="Your pick order" value="3rd" change="of 8 teams" />
        <StatCard
          label="Round / Pick"
          value={sim?.draft ? `R${sim.draft.round}` : '—'}
          change={sim?.draft ? `pick ${sim.draft.pick}` : ''}
        />
      </div>

      <div className={s.draftWrap}>
        <div className={s.draftHd}>
          <div className={s.draftHdTitle}>Draft Board</div>
          <div className={s.draftLegend}>
            <span><span className={s.dlSwatch} style={{ background: '#f0ecff', border: '1px solid var(--epl)' }} />Your pick</span>
            <span><span className={s.dlSwatch} style={{ background: '#FEF3C7' }} />Auto-pick</span>
          </div>
        </div>
        <div className={s.scroll}>
          <table className={s.draftTbl}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', paddingLeft: 12 }}>Round</th>
                {orderedSlots.map((o) => {
                  const t = teamMap.get(o.team_id)
                  const me = o.team_id === sim?.humanTeamId
                  return <th key={o.id} className={me ? s.themeCol : ''}>{t?.name ?? `Team ${o.slot}`}{me ? ' ★' : ''}</th>
                })}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxRound }, (_, r) => r + 1).map((round) => (
                <tr key={round}>
                  <td className={s.rl}>R{round} {round % 2 === 1 ? '→' : '←'}</td>
                  {Array.from({ length: numTeams }, (_, i) => i + 1).map((slot) => {
                    const p = grid[round]?.[slot]
                    if (!p) return <td key={slot}>—</td>
                    const pl = playerMap.get(p.player_id)
                    const mine = p.team_id === sim?.humanTeamId
                    const cls = mine ? s.mine : p.is_auto ? s.auto : ''
                    return (
                      <td key={slot} className={cls}>
                        {pl?.name ?? '?'}<br />{pl ? POS_LABEL[pl.position] : ''}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={s.footnote}>Snake reversal each round</div>
      </div>

      <div className={s.available}>
        {isMyTurn ? (
          <>
            <div className={s.availableTitle}>Your turn — pick a player</div>
            <div className={s.availList}>
              {available.slice(0, 30).map((p) => (
                <RosterRow
                  key={p.id}
                  badge={POS_LABEL[p.position] ?? p.position}
                  badgeBg="var(--epl)"
                  name={p.name}
                  meta={`${POS_LABEL[p.position] ?? p.position} · ${p.club ?? ''}`}
                  gw={p.season_points ?? 0}
                  onClick={() => pick(p.id)}
                />
              ))}
            </div>
          </>
        ) : (
          <div className={s.waiting}>{sim?.draft?.complete ? 'Draft complete.' : sim?.draft ? 'Waiting for bots…' : 'No active draft. Switch to DRAFTING in the dev panel.'}</div>
        )}
      </div>
    </>
  )
}
