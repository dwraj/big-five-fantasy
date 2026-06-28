import s from './PlayerCard.module.css'

export interface RevealStat {
  val: React.ReactNode
  lbl: string
}

export interface PlayerCardData {
  badge: string
  badgeBg: string
  badgeColor?: string
  pts: React.ReactNode
  ptsColor: string
  league: string
  leagueBg: string
  leagueColor: string
  topBg: string
  name: string
  meta: string
  total: string
  reveal: RevealStat[]
  bonus: string
  image?: string
}

export function PlayerCard({ data }: { data: PlayerCardData }) {
  return (
    <div className={s.tc}>
      {data.image ? <img className={s.tcImage} src={data.image} alt={data.name} /> : null}
      <div className={s.tcTop} style={{ background: data.topBg }}>
        <div className={s.tcBadge} style={{ background: data.badgeBg, color: data.badgeColor }}>
          {data.badge}
        </div>
        <div className={s.tcPts} style={{ color: data.ptsColor }}>
          {data.pts}
          <span className={s.tcPtsLabel}>pts</span>
        </div>
        <div className={s.tcLeague} style={{ background: data.leagueBg, color: data.leagueColor }}>
          {data.league}
        </div>
      </div>
      <div className={s.tcBot}>
        <div className={s.tcName}>{data.name}</div>
        <div className={s.tcMeta}>{data.meta}</div>
        <div className={s.tcTotal}>{data.total}</div>
      </div>
      <div className={s.tcReveal}>
        <div className={s.revealTitle}>This gameweek</div>
        <div className={s.revealStats}>
          {data.reveal.map((r, i) => (
            <div className={s.rv} key={i}>
              <div className={s.rvVal}>{r.val}</div>
              <div className={s.rvLbl}>{r.lbl}</div>
            </div>
          ))}
        </div>
        <div className={s.revealBonus}>{data.bonus}</div>
      </div>
    </div>
  )
}

export function PlayerCardRow({ children }: { children: React.ReactNode }) {
  return <div className={s.tcRow}>{children}</div>
}
