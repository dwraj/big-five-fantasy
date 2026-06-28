import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import s from './DevPanel.module.css'
import { useSim } from './SimContext'
import { useSimActions } from './useSimActions'
import type { Phase } from '../types'

const PHASES: Phase[] = ['PRE_SEASON', 'DRAFTING', 'LIVE_ACTION', 'MID_WEEK', 'POST_SEASON']

const PHASE_ROUTE: Partial<Record<Phase, string>> = {
  DRAFTING: '/draft',
  LIVE_ACTION: '/dashboard',
  POST_SEASON: '/standings',
}

export function DevPanel() {
  const { sim } = useSim()
  const actions = useSimActions()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const run = (fn: () => Promise<unknown>) => async () => {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  const onPhase = (phase: Phase) =>
    run(async () => {
      await actions.setPhase(phase)
      navigate(PHASE_ROUTE[phase] ?? '/dashboard')
    })()

  const status =
    sim &&
    `phase=${sim.phase} · live=${sim.liveSimRunning}` +
      (sim.draft
        ? ` · draft R${sim.draft.round}/P${sim.draft.pick}${sim.draft.isMyTurn ? ' (YOUR TURN)' : ''}`
        : '')

  return (
    <div className={s.panel}>
      <div className={s.title}>🧪 SIM</div>
      <div className={s.row}>
        {PHASES.map((p) => (
          <button key={p} disabled={busy} onClick={() => onPhase(p)}>
            {p.replace('_', ' ')}
          </button>
        ))}
      </div>
      <div className={s.row}>
        <button disabled={busy} onClick={run(actions.liveStart)}>▶ Live</button>
        <button disabled={busy} onClick={run(actions.liveStop)}>⏸ Live</button>
        <button disabled={busy} onClick={run(actions.advance)}>⏭ Mid-Week</button>
      </div>
      <div className={s.row}>
        <button disabled={busy} onClick={run(() => actions.fireRandom('goal'))}>
          ⚽ Fire goal (random starter)
        </button>
      </div>
      <div className={s.status}>{status}</div>
    </div>
  )
}
