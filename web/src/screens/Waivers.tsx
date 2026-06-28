import s from './Waivers.module.css'
import { FilterPills } from '../components/FilterPills'

interface WaRow { badge: string; badgeBg: string; badgeColor?: string; name: string; meta: string; avg: string; injured?: boolean }

const ROWS: WaRow[] = [
  { badge: 'CHE', badgeBg: '#034694', name: 'N. Jackson', meta: 'FWD · Chelsea', avg: '8.4' },
  { badge: 'RMA', badgeBg: '#FEBE10', badgeColor: '#00529F', name: 'J. Bellingham', meta: 'MID · Real Madrid', avg: '9.1' },
  { badge: 'LIV', badgeBg: '#C8102E', name: 'A. Robertson', meta: 'DEF · Liverpool', avg: '6.8' },
  { badge: 'ACM', badgeBg: '#FB090B', name: 'R. Leão', meta: 'FWD · AC Milan', avg: '7.2' },
  { badge: 'BAY', badgeBg: '#DC052D', name: 'L. Hernandez', meta: 'MID · Bayern', avg: '5.4', injured: true },
]

export function Waivers() {
  return (
    <>
      <div className={s.hdr}>
        <div>
          <div className={s.hdrTitle}>Waivers &amp; Free Agents</div>
          <div className={s.hdrSub}>Priority: <strong style={{ color: 'var(--t1)' }}>#3 of 8</strong> · Processes Tue</div>
        </div>
        <div className={s.hdrPending}>Pending: N. Jackson</div>
      </div>
      <FilterPills options={['All Leagues', 'EPL', 'La Liga', 'Serie A', 'Bundesliga']} />
      {ROWS.map((r, i) => (
        <div key={i} className={s.waRow} style={r.injured ? { opacity: 0.5 } : undefined}>
          <div className={s.badge} style={{ background: r.badgeBg, color: r.badgeColor }}>{r.badge}</div>
          <div className={s.waInfo}>
            <div className={s.waName}>{r.name}</div>
            <div className={s.waMeta}>{r.meta}</div>
          </div>
          <div className={s.waAvg}>
            <div className={s.waAvgVal}>{r.avg}</div>
            <div className={s.waAvgLbl}>avg/GW</div>
          </div>
          <button className={s.btnClaim} disabled={r.injured}>{r.injured ? 'Injured' : 'Claim'}</button>
        </div>
      ))}
    </>
  )
}
