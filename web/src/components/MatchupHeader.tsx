import s from './MatchupHeader.module.css'

export interface MatchupTeam {
  crest: string
  crestBg: string
  name: string
  label: string
}

export function MatchupHeader({
  home,
  away,
  homeScore,
  awayScore,
  tag,
}: {
  home: MatchupTeam
  away: MatchupTeam
  homeScore: number
  awayScore: number
  tag?: React.ReactNode
}) {
  const homeLosing = awayScore > homeScore
  const awayLosing = homeScore > awayScore
  return (
    <div className={s.mh}>
      <div className={s.mhInner}>
        <div className={`${s.mhTeam} ${s.l}`}>
          <div className={s.mhCrest} style={{ background: home.crestBg }}>{home.crest}</div>
          <div className={s.mhTname}>{home.name}</div>
          <div className={s.mhTlbl}>{home.label}</div>
        </div>
        <div className={s.mhCenter}>
          <div className={s.mhNums}>
            <div className={`${s.mhScore} ${homeLosing ? s.losing : ''}`}>{homeScore}</div>
            <div className={s.mhDash}>–</div>
            <div className={`${s.mhScore} ${awayLosing ? s.losing : ''}`}>{awayScore}</div>
          </div>
          {tag && <div className={s.mhTag}>{tag}</div>}
        </div>
        <div className={`${s.mhTeam} ${s.r}`}>
          <div className={s.mhCrest} style={{ background: away.crestBg }}>{away.crest}</div>
          <div className={s.mhTname}>{away.name}</div>
          <div className={s.mhTlbl}>{away.label}</div>
        </div>
      </div>
    </div>
  )
}
