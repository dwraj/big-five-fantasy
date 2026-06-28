import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import s from './Layout.module.css'
import { Sidebar } from './Sidebar'
import { DevPanel } from '../../sim/DevPanel'
import { DEV, useSim } from '../../sim/SimContext'
import { useLiveState } from '../../sim/useLiveState'
import type { Phase } from '../../types'

const TABS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/myteam', label: 'My Team' },
  { to: '/standings', label: 'Standings' },
  { to: '/matchup', label: 'Matchup' },
  { to: '/waivers', label: 'Waivers' },
  { to: '/trades', label: 'Trades' },
  { to: '/draft', label: 'Draft' },
]

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/myteam': 'My Team',
  '/standings': 'Standings',
  '/matchup': 'Matchup',
  '/waivers': 'Waivers',
  '/trades': 'Trades',
  '/draft': 'Draft Room',
}

// Where each phase lands on first load (mirrors old routeForPhase).
const PHASE_ROUTE: Partial<Record<Phase, string>> = {
  DRAFTING: '/draft',
  LIVE_ACTION: '/dashboard',
  POST_SEASON: '/standings',
}

export function AppLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { sim } = useSim()
  const live = useLiveState(sim?.phase === 'LIVE_ACTION')
  const routedRef = useRef(false)

  // Route to the phase's screen once, when sim state first loads.
  useEffect(() => {
    if (!DEV || routedRef.current || !sim) return
    routedRef.current = true
    const dest = PHASE_ROUTE[sim.phase]
    if (dest && pathname === '/dashboard') navigate(dest)
  }, [sim, pathname, navigate])

  return (
    <>
      <div className={s.outerTabs}>
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) => `${s.otab} ${isActive ? s.on : ''}`}
          >
            {t.label}
          </NavLink>
        ))}
      </div>

      <div className={s.shell}>
        <Sidebar live={live.data} />
        <div className={s.main}>
          <div className={s.topbar}>
            <span className={s.topbarTitle}>{TITLES[pathname] ?? 'Big Five Fantasy'}</span>
            <div className={s.liveChip}>
              <div className={s.liveDot} /> Live
            </div>
            <div className={s.gwChip}>GW {sim?.activeGameweek?.number ?? 28}</div>
          </div>
          <div className={s.content}>
            <div className={s.screen} key={pathname}>
              <Outlet context={{ live }} />
            </div>
          </div>
        </div>
      </div>

      {DEV && <DevPanel />}
    </>
  )
}
