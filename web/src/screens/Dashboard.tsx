import { useQuery } from '@tanstack/react-query'
import L from '../components/layout/Layout.module.css'
import { StatCard } from '../components/StatCard'
import { MatchupHeader } from '../components/MatchupHeader'
import { PlayerCard, PlayerCardRow, type PlayerCardData } from '../components/PlayerCard'
import { apiGet } from '../lib/api'
import type { Player } from '../types'

const POS_LABEL: Record<string, string> = { G: 'GK', D: 'DEF', M: 'MID', F: 'FWD' }

// Static top-starter card templates; name/meta are overlaid with real players
// (matches the old populatePlayerCards behavior).
const CARD_TEMPLATES: PlayerCardData[] = [
  {
    badge: 'LIV', badgeBg: '#C8102E', pts: 18, ptsColor: 'var(--epl)',
    league: 'Premier League', leagueBg: 'rgba(109,40,217,0.12)', leagueColor: 'var(--epl)',
    topBg: 'rgba(109,40,217,0.07)', name: 'M. Salah', meta: 'FWD · Liverpool', total: '187 pts total',
    reveal: [{ val: 1, lbl: 'Goal' }, { val: 2, lbl: 'Assists' }, { val: 90, lbl: 'Mins' }], bonus: '+3 bonus pts',
  },
  {
    badge: 'RMA', badgeBg: '#FEBE10', badgeColor: '#00529F', pts: 14, ptsColor: 'var(--ll)',
    league: 'La Liga', leagueBg: 'rgba(220,38,38,0.12)', leagueColor: 'var(--ll)',
    topBg: 'rgba(220,38,38,0.07)', name: 'Vinícius Jr.', meta: 'FWD · Real Madrid', total: '162 pts total',
    reveal: [{ val: 1, lbl: 'Goal' }, { val: 1, lbl: 'Assist' }, { val: 85, lbl: 'Mins' }], bonus: '+2 bonus pts',
  },
  {
    badge: 'INT', badgeBg: '#0068A8', pts: 11, ptsColor: 'var(--sa)',
    league: 'Serie A', leagueBg: 'rgba(29,78,216,0.12)', leagueColor: 'var(--sa)',
    topBg: 'rgba(29,78,216,0.07)', name: 'A. Onana', meta: 'GK · Inter Milan', total: '134 pts total',
    reveal: [{ val: 5, lbl: 'Saves' }, { val: 1, lbl: 'CS' }, { val: 90, lbl: 'Mins' }], bonus: '+1 bonus pt',
  },
]

export function Dashboard() {
  const { data: players } = useQuery({ queryKey: ['players'], queryFn: () => apiGet<Player[]>('/players') })

  const cards = CARD_TEMPLATES.map((tpl, i) => {
    const p = players?.[i]
    if (!p) return tpl
    return {
      ...tpl,
      name: p.name,
      meta: `${POS_LABEL[p.position] ?? p.position} · ${p.club ?? 'Club'}`,
      image: p.image_url ?? undefined,
    }
  })

  return (
    <>
      <div className={L.row3}>
        <StatCard label="Gameweek pts" value={62} change="↑ 12 vs last week" changeType="up" bgColor="var(--epl)" />
        <StatCard
          label="Season record"
          value="16W–11L"
          valueStyle={{ fontSize: 22, letterSpacing: '-1px', marginTop: 2 }}
          change="3rd of 8 teams"
        />
        <StatCard label="Season total" value={1763} change="↑ 79 ahead of 4th" changeType="up" bgColor="#16a34a" />
      </div>

      <MatchupHeader
        home={{ crest: 'TF', crestBg: 'linear-gradient(135deg, var(--epl), #2563EB)', name: 'Trident FC', label: 'You' }}
        away={{ crest: 'GX', crestBg: 'linear-gradient(135deg, var(--ll), #991b1b)', name: 'Galaxy XI', label: 'Sam R.' }}
        homeScore={62}
        awayScore={58}
        tag={<><span style={{ color: '#16a34a' }}>⚡ Live</span> · GW28 · +4 lead</>}
      />

      <div className={L.sectionHd}>
        <span className={L.sectionHdLbl}>Top Starters</span>
        <span className={L.sectionHdCt}>GW28 · hover for stats</span>
      </div>
      <PlayerCardRow>
        {cards.map((c, i) => <PlayerCard key={i} data={c} />)}
      </PlayerCardRow>
    </>
  )
}
