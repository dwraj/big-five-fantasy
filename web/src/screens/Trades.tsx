import s from './Trades.module.css'

interface Trade {
  from: React.ReactNode
  theySend: { name: string; meta: string }
  youSend: { name: string; meta: string }
}

const TRADES: Trade[] = [
  {
    from: <>From <strong>Galaxy XI</strong> · Sam R.</>,
    theySend: { name: 'E. Haaland', meta: 'FWD · Man City · 21 pts' },
    youSend: { name: 'M. Salah', meta: 'FWD · Liverpool · 18 pts' },
  },
  {
    from: <>From <strong>Phoenix United</strong> · Alex T.</>,
    theySend: { name: 'L. Modric', meta: 'MID · Real Madrid · 6 pts' },
    youSend: { name: 'L. Goretzka', meta: 'MID · Bayern Munich · 3 pts' },
  },
]

export function Trades() {
  return (
    <>
      <div className={s.hdr}>
        <div className={s.hdrTitle}>Trade Inbox</div>
        <div className={s.hdrCount}>2 pending</div>
      </div>
      {TRADES.map((t, i) => (
        <div key={i} className={s.tradeC}>
          <div className={s.tradeHd}>
            <div className={s.tradeFrom}>{t.from}</div>
            <div className={`${s.tradeTag} ${s.pending}`}>Pending</div>
          </div>
          <div className={s.tradeBody}>
            <div className={s.tradeSide}>
              <div className={s.tradeSideLbl}>They send you</div>
              <div className={s.tradePname}>{t.theySend.name}</div>
              <div className={s.tradePmeta}>{t.theySend.meta}</div>
            </div>
            <div className={s.tradeArrow}>⇄</div>
            <div className={s.tradeSide}>
              <div className={s.tradeSideLbl}>You send them</div>
              <div className={s.tradePname}>{t.youSend.name}</div>
              <div className={s.tradePmeta}>{t.youSend.meta}</div>
            </div>
          </div>
          <div className={s.tradeActs}>
            <button className={s.btnReject}>Reject</button>
            <button className={s.btnAccept}>Accept</button>
          </div>
        </div>
      ))}
      <div className={s.stWrap}>
        <div className={s.pastHd}>Past Trades</div>
        <div className={s.pastTrade}><span style={{ color: '#16a34a', fontWeight: 700 }}>Accepted</span> · GW22 · You got R. Dias, sent P. Gavi to Storm City.</div>
        <div className={s.pastTrade}><span style={{ color: '#DC2626', fontWeight: 700 }}>Rejected</span> · GW18 · Offered O. Dembélé for E. Haaland — Galaxy XI declined.</div>
      </div>
    </>
  )
}
