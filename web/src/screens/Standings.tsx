import { useQuery } from '@tanstack/react-query'
import s from './Standings.module.css'
import { useSim } from '../sim/SimContext'
import { apiGet } from '../lib/api'
import type { Team } from '../types'

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

export function Standings() {
  const { sim } = useSim()
  const leagueId = sim?.leagueId
  const { data: teams } = useQuery({
    queryKey: ['standings', leagueId],
    queryFn: () => apiGet<Team[]>(`/leagues/${leagueId}/standings`),
    enabled: !!leagueId,
  })

  return (
    <div className={s.stWrap}>
      <div className={s.stHead}>
        <div className={`${s.stHc} ${s.rank}`}>#</div>
        <div className={`${s.stHc} ${s.name}`}>Team</div>
        <div className={`${s.stHc} ${s.num}`}>W–L</div>
        <div className={`${s.stHc} ${s.num}`}>GW</div>
        <div className={`${s.stHc} ${s.num}`}>Total</div>
      </div>
      {(teams ?? []).map((t, i) => {
        const me = t.id === sim?.humanTeamId
        return (
          <div key={t.id} className={`${s.sr} ${me ? s.me : ''}`}>
            <div className={`${s.srRank} ${i < 3 ? s.top : ''}`}>{i + 1}</div>
            <div className={s.srAvatar} style={{ background: 'linear-gradient(135deg, var(--epl), #2563EB)' }}>
              {initials(t.name)}
            </div>
            <div className={s.srInfo}>
              <div className={s.srName} style={me ? { color: 'var(--epl)' } : undefined}>{t.name}</div>
              <div className={s.srSub}>{me ? 'You' : ''}</div>
            </div>
            <div className={s.srGw}>{t.gameweek_points ?? 0} pts</div>
            <div className={s.srRec}>{t.wins ?? 0}–{t.losses ?? 0}</div>
            <div className={s.srPts}>{t.total_points ?? 0}</div>
          </div>
        )
      })}
    </div>
  )
}
