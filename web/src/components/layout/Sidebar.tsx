import { NavLink } from 'react-router-dom'
import s from './Sidebar.module.css'
import { LiveScoreboard } from '../LiveScoreboard'
import type { LiveState } from '../../types'

const NAV = [
  { to: '/dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard' },
  { to: '/myteam', icon: 'ti-shirt', label: 'My Team' },
  { to: '/standings', icon: 'ti-trophy', label: 'Standings' },
  { to: '/matchup', icon: 'ti-arrows-exchange', label: 'Matchup' },
  { to: '/waivers', icon: 'ti-user-search', label: 'Waivers' },
  { to: '/trades', icon: 'ti-list-check', label: 'Trades' },
  { to: '/draft', icon: 'ti-ball-football', label: 'Draft' },
]

export function Sidebar({ live }: { live?: LiveState | null }) {
  return (
    <div className={s.sb}>
      <div className={s.sbTop}>
        <div className={s.sbLogo}>Big Five Fantasy</div>
        <div className={s.sbSub}>Trident FC · 2025–26</div>
      </div>

      <div className={s.nav}>
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) => `${s.ni} ${isActive ? s.active : ''}`}
          >
            <i className={`ti ${n.icon}`} /> {n.label}
          </NavLink>
        ))}
      </div>

      <div className={s.onNow}>
        <LiveScoreboard live={live} />
      </div>

      <div className={s.sbFoot}>
        <div className={s.sbAvatar}>D</div>
        <div className={s.sbUser}>
          <div className={s.sbName}>Dhinesh</div>
          <div className={s.sbTeam}>3rd place</div>
        </div>
        <i className={`ti ti-settings ${s.sbGear}`} />
      </div>
    </div>
  )
}
