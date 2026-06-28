import L from '../components/layout/Layout.module.css'
import { MatchupHeader } from '../components/MatchupHeader'
import { RosterRow, type LeagueClass } from '../components/RosterRow'

interface Row { league: LeagueClass; badge: string; badgeBg: string; badgeColor?: string; name: string; meta: string; gw: React.ReactNode }

const MINE: Row[] = [
  { league: 'epl', badge: 'LIV', badgeBg: '#C8102E', name: 'M. Salah', meta: 'FWD · EPL', gw: '18' },
  { league: 'la', badge: 'RMA', badgeBg: '#FEBE10', badgeColor: '#00529F', name: 'Vinícius Jr.', meta: 'FWD · La Liga', gw: '14' },
  { league: 'sa', badge: 'INT', badgeBg: '#0068A8', name: 'A. Onana', meta: 'GK · Serie A', gw: '11' },
  { league: 'epl', badge: 'LIV', badgeBg: '#C8102E', name: 'T. Alexander-Arnold', meta: 'DEF · EPL', gw: '9' },
  { league: 'la', badge: 'RMA', badgeBg: '#FEBE10', badgeColor: '#00529F', name: 'K. Mbappé', meta: 'FWD · La Liga', gw: '7' },
  { league: 'bl', badge: 'BAY', badgeBg: '#DC052D', name: 'L. Goretzka', meta: 'MID · Bundesliga', gw: '3' },
]

const THEIRS: Row[] = [
  { league: 'epl', badge: 'MCI', badgeBg: '#6CABDD', name: 'E. Haaland', meta: 'FWD · EPL', gw: '21' },
  { league: 'la', badge: 'RMA', badgeBg: '#FEBE10', badgeColor: '#00529F', name: 'L. Messi', meta: 'FWD · La Liga', gw: '12' },
  { league: 'epl', badge: 'ARS', badgeBg: '#EF0107', name: 'W. Saliba', meta: 'DEF · EPL', gw: '10' },
  { league: 'epl', badge: 'LIV', badgeBg: '#C8102E', name: 'B. Diaz', meta: 'MID · EPL', gw: '8' },
  { league: 'sa', badge: 'FIO', badgeBg: '#9400D3', name: 'A. Di Maria', meta: 'MID · Serie A', gw: '7' },
  { league: 'sa', badge: 'ACM', badgeBg: '#FB090B', name: 'M. Maignan', meta: 'GK · Serie A', gw: <span style={{ color: 'var(--t3)' }}>0*</span> },
]

export function Matchup() {
  return (
    <>
      <MatchupHeader
        home={{ crest: 'TF', crestBg: 'linear-gradient(135deg, var(--epl), #2563EB)', name: 'Trident FC', label: 'You' }}
        away={{ crest: 'GX', crestBg: 'linear-gradient(135deg, var(--l1), #065f46)', name: 'Galaxy XI', label: 'Sam R.' }}
        homeScore={62}
        awayScore={58}
        tag={<><span style={{ color: '#16a34a' }}>⚡ Live</span> · GW28 · 72% complete</>}
      />
      <div className={L.row2}>
        <div>
          <div className={L.sectionHd} style={{ marginBottom: 6 }}><span className={L.sectionHdLbl}>Your Starters</span><span className={L.sectionHdCt}>62 pts</span></div>
          {MINE.map((r, i) => <RosterRow key={i} {...r} />)}
        </div>
        <div>
          <div className={L.sectionHd} style={{ marginBottom: 6 }}><span className={L.sectionHdLbl}>Galaxy XI</span><span className={L.sectionHdCt}>58 pts</span></div>
          {THEIRS.map((r, i) => <RosterRow key={i} {...r} />)}
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--t3)', textAlign: 'right' }}>* AC Milan match not yet played</div>
    </>
  )
}
