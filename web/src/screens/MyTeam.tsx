import L from '../components/layout/Layout.module.css'
import { FilterPills } from '../components/FilterPills'
import { RosterRow, type LeagueClass } from '../components/RosterRow'

interface Row {
  league: LeagueClass
  badge: string
  badgeBg: string
  badgeColor?: string
  name: string
  meta: string
  detail: string
  gw: string
  total: string
}

const STARTERS: Row[] = [
  { league: 'epl', badge: 'LIV', badgeBg: '#C8102E', name: 'M. Salah', meta: 'FWD · Liverpool', detail: '1 goal · 2 assists · 90 mins', gw: '18', total: '187 total' },
  { league: 'la', badge: 'RMA', badgeBg: '#FEBE10', badgeColor: '#00529F', name: 'Vinícius Jr.', meta: 'FWD · Real Madrid', detail: '1 goal · 1 assist · 85 mins', gw: '14', total: '162 total' },
  { league: 'sa', badge: 'INT', badgeBg: '#0068A8', name: 'A. Onana', meta: 'GK · Inter Milan', detail: '5 saves · clean sheet · 90 mins', gw: '11', total: '134 total' },
  { league: 'epl', badge: 'LIV', badgeBg: '#C8102E', name: 'T. Alexander-Arnold', meta: 'DEF · Liverpool', detail: '1 assist · clean sheet · 90 mins', gw: '9', total: '121 total' },
  { league: 'la', badge: 'RMA', badgeBg: '#FEBE10', badgeColor: '#00529F', name: 'K. Mbappé', meta: 'FWD · Real Madrid', detail: '1 goal · 85 mins played', gw: '7', total: '118 total' },
  { league: 'bl', badge: 'BAY', badgeBg: '#DC052D', name: 'L. Goretzka', meta: 'MID · Bayern Munich', detail: 'Bayern match completed · 3 pts', gw: '3', total: '102 total' },
]

const BENCH: Row[] = [
  { league: 'epl', badge: 'MCI', badgeBg: '#6CABDD', name: 'R. Dias', meta: 'DEF · Man City', detail: 'Clean sheet · 90 mins played', gw: '—', total: '98 total' },
  { league: 'epl', badge: 'MUN', badgeBg: '#DA291C', name: 'B. Fernandes', meta: 'MID · Man Utd', detail: '1 assist · 90 mins played', gw: '—', total: '91 total' },
  { league: 'l1', badge: 'PSG', badgeBg: '#004170', name: 'O. Dembélé', meta: 'FWD · PSG', detail: '1 goal · 78 mins played', gw: '—', total: '88 total' },
]

export function MyTeam() {
  return (
    <>
      <FilterPills options={['All', 'Starters', 'Bench', 'By League']} />
      <div className={L.sectionHd}><span className={L.sectionHdLbl}>Starters</span><span className={L.sectionHdCt}>6 / 6</span></div>
      {STARTERS.map((r, i) => <RosterRow key={i} {...r} tag="s" />)}
      <div className={L.sectionHd} style={{ marginTop: 6 }}><span className={L.sectionHdLbl}>Bench</span><span className={L.sectionHdCt}>Score 0 this GW</span></div>
      {BENCH.map((r, i) => <RosterRow key={i} {...r} tag="b" />)}
    </>
  )
}
