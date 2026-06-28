import { useState } from 'react'
import s from './FilterPills.module.css'

// Presentational filter pills (UI-only toggle, mirrors the old static pills).
export function FilterPills({ options, initial = 0 }: { options: string[]; initial?: number }) {
  const [active, setActive] = useState(initial)
  return (
    <div className={s.filterRow}>
      {options.map((opt, i) => (
        <div
          key={opt}
          className={`${s.fp} ${i === active ? s.on : ''}`}
          onClick={() => setActive(i)}
        >
          {opt}
        </div>
      ))}
    </div>
  )
}
