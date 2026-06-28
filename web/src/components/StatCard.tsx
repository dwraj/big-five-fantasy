import type { CSSProperties } from 'react'
import s from './StatCard.module.css'

export function StatCard({
  label,
  value,
  change,
  changeType = 'nu',
  bgColor,
  valueStyle,
}: {
  label: string
  value: React.ReactNode
  change?: string
  changeType?: 'up' | 'dn' | 'nu'
  bgColor?: string
  valueStyle?: CSSProperties
}) {
  return (
    <div className={s.statC}>
      {bgColor && <div className={s.statBg} style={{ background: bgColor }} />}
      <div className={s.statLbl}>{label}</div>
      <div className={s.statVal} style={valueStyle}>{value}</div>
      {change && <div className={`${s.statChg} ${s[changeType]}`}>{change}</div>}
    </div>
  )
}
