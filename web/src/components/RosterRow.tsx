import s from './RosterRow.module.css'

export type LeagueClass = 'epl' | 'la' | 'sa' | 'bl' | 'l1'

export function RosterRow({
  league,
  badge,
  badgeBg,
  badgeColor,
  name,
  meta,
  detail,
  tag,
  gw,
  total,
  onClick,
}: {
  league?: LeagueClass
  badge: string
  badgeBg: string
  badgeColor?: string
  name: string
  meta: string
  detail?: string
  tag?: 's' | 'b'
  gw: React.ReactNode
  total?: string
  onClick?: () => void
}) {
  return (
    <div className={`${s.rr} ${league ? s[league] : ''}`} onClick={onClick}>
      <div className={s.rrBadge} style={{ background: badgeBg, color: badgeColor }}>{badge}</div>
      <div className={s.rrInfo}>
        <div className={s.rrName}>{name}</div>
        <div className={s.rrMeta}>{meta}</div>
        {detail && <div className={s.rrDetail}>{detail}</div>}
      </div>
      {tag && <span className={`${s.rrTag} ${s[tag]}`}>{tag === 's' ? 'Starter' : 'Bench'}</span>}
      <div className={s.rrPts}>
        <div className={s.rrGw}>{gw}</div>
        {total && <div className={s.rrTot}>{total}</div>}
      </div>
    </div>
  )
}
