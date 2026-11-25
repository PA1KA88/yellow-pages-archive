import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { byCountry } from '@/data/load'
import { ORIENTATION } from '@/data/orientation'
import {
  COUNTRIES, COUNTRY_NAME, COUNTRY_TZ, dimValue, DIMENSIONS,
  type ArchiveRecord,
} from '@/types/archive'
import { FingerLogo } from '@/components/CustomCursor'
import GoogleArchiveMap from '@/components/GoogleArchiveMap'

const COUNTRY_EN: Record<string, string> = {
  china: 'CHINA', usa: 'AMERICA', uk: 'BRITAIN', france: 'FRANCE', japan: 'JAPAN', italy: 'ITALY',
  sweden: 'SWEDEN', russia: 'RUSSIA', belgium: 'BELGIUM', netherlands: 'NETHERLANDS',
  germany: 'GERMANY', lebanon: 'LEBANON', canada: 'CANADA', southafrica: 'SOUTH AFRICA', international: 'INTERNATIONAL',
}

function ImgModule({ r, onPick }: { r: ArchiveRecord; onPick: (r: ArchiveRecord) => void }) {
  return (
    <button onClick={() => onPick(r)} className="group flex h-full w-full flex-col bg-[#efeeeb] text-left hover:bg-[#FFD200]/40">
      <img src={r.image} alt={r.title} draggable={false} loading="lazy" className="yp-img min-h-0 w-full flex-1 border-b border-black/40 object-cover" />
      <div className="shrink-0 p-1.5">
        <div className="line-clamp-2 text-[11px] font-bold leading-tight group-hover:underline">{r.title}</div>
        <div className="mt-0.5 flex items-baseline justify-between gap-1 font-en text-[8.5px] leading-tight text-black/60">
          <span className="truncate">{r.id} · {r.city} · {r.era}</span>
          <span className="shrink-0 text-[hsl(var(--yp-red))]">{r.status}</span>
        </div>
      </div>
    </button>
  )
}

function IndexModule({ index, count, country }: { index: number; count: number; country: string }) {
  return (
    <div className="flex h-full w-full flex-col justify-between bg-[#efeeeb] p-2">
      <span className="font-en text-[8px] tracking-widest text-black/45">INDEX / {String(index + 1).padStart(2, '0')}</span>
      <div>
        <div className="font-en text-[11px] font-bold">{COUNTRY_EN[country] ?? country}</div>
        <div className="mt-1 font-en text-[8px] text-black/50">{count} UNIQUE RECORDS · NO IMAGE REUSE</div>
      </div>
    </div>
  )
}

const MODULES: { col: string; row: string }[] = [
  { col: '1 / 3', row: '1 / 3' }, { col: '3 / 6', row: '1 / 3' },
  { col: '6 / 10', row: '1 / 3' }, { col: '10 / 13', row: '1 / 3' },
  { col: '1 / 3', row: '3 / 7' }, { col: '1 / 3', row: '7 / 9' },
  { col: '11 / 13', row: '3 / 6' }, { col: '11 / 13', row: '6 / 9' },
  { col: '1 / 4', row: '9 / 11' }, { col: '4 / 6', row: '9 / 11' },
  { col: '6 / 9', row: '9 / 11' }, { col: '9 / 11', row: '9 / 11' },
  { col: '11 / 13', row: '9 / 11' },
]

const MODULE_WANT: ('h' | 'v' | 's')[] = MODULES.map((m) => {
  const span = (s: string) => { const [a, b] = s.split('/').map((x) => parseInt(x)); return b - a }
  const ratio = (span(m.col) / span(m.row)) * 1.5
  return ratio > 1.15 ? 'h' : ratio < 0.87 ? 'v' : 's'
})

export default function Part2({ initial, onBack }: { initial: ArchiveRecord | null; onBack: () => void }) {
  const [country, setCountry] = useState(initial?.country ?? 'usa')
  const pool = useMemo(() => byCountry(country), [country])
  const [center, setCenter] = useState<ArchiveRecord | null>(initial)
  const cur = center && center.country === country ? center : pool[0] ?? null
  const ads = pool.filter((r) => r.id !== cur?.id)

  const pools = useMemo(() => {
    const by = { h: [] as ArchiveRecord[], v: [] as ArchiveRecord[], s: [] as ArchiveRecord[] }
    for (const r of ads) by[ORIENTATION[r.id] ?? 's'].push(r)
    return by
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, cur?.id])

  const used = new Set<string>()
  const at = (i: number) => {
    const want = MODULE_WANT[i]
    const r = pools[want].find((x) => !used.has(x.id)) ?? ads.find((x) => !used.has(x.id))
    if (r) used.add(r.id)
    return r ?? null
  }

  const pick = (r: ArchiveRecord) => setCenter(r)
  const colorImage = (r: ArchiveRecord) => r.image.startsWith('img/') ? r.image.replace('img/', 'img_color/') : r.image

  return (
    <div className="yellow-grid flex h-screen flex-col overflow-hidden">
      <header className="grid shrink-0 grid-cols-12 items-stretch border-b border-black bg-[#efeeeb]">
        <div className="col-span-3 flex items-center border-r border-black/40 px-4 py-2">
          <button onClick={onBack} className="border border-black px-3 py-1 font-en text-xs hover:bg-[#FFD200]">← WHAT</button>
        </div>
        <h1 className="mega-type col-span-6 self-center text-center text-xl md:text-3xl">WHERE DO YOU WANT TO GO?</h1>
        <div className="col-span-3 flex items-center justify-end gap-1 border-l border-black/40 px-4 py-2 font-en text-[10px]">
          <FingerLogo size={20} /> WALKING FINGERS
        </div>
      </header>

      <nav aria-label="按东西半球时区排列的国家" className="flex shrink-0 overflow-x-auto border-b border-black/60 bg-[#efeeeb]">
        {[...COUNTRIES].sort((a, b) => {
          if (a === 'international') return 1
          if (b === 'international') return -1
          return Number(COUNTRY_TZ[a].replace('UTC', '')) - Number(COUNTRY_TZ[b].replace('UTC', ''))
        }).map((c) => (
          <button key={c} onClick={() => { setCountry(c); setCenter(null) }}
            className={`shrink-0 border-r border-black/40 px-4 py-1.5 text-[11px] transition-colors ${c === country ? 'bg-[#FFD200] font-semibold text-black' : 'hover:bg-black/10'}`}>
            <span className="font-semibold">{COUNTRY_NAME[c]}</span>
            <span className="ml-1.5 font-en text-[9px] opacity-60">{COUNTRY_EN[c]} · {COUNTRY_TZ[c]}</span>
          </button>
        ))}
        <span className="ml-auto hidden shrink-0 self-center px-4 font-en text-[9px] tracking-[0.25em] text-black/50 md:block">
          GOOGLE MAPS · 点击模块换入中心
        </span>
      </nav>

      {pool.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="border border-black bg-[#f6f2e7] p-10 text-center">
            <div className="mega-type text-5xl">COMING SOON</div>
            <p className="mt-3 text-sm">{COUNTRY_NAME[country]} · 黄页档案采集中</p>
          </div>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-12 gap-px bg-black/60 [grid-template-rows:repeat(10,minmax(0,1fr))]">
          {MODULES.map((m, i) => {
            const r = at(i)
            return (
              <div key={`${m.col}-${m.row}`} style={{ gridColumn: m.col, gridRow: m.row }} className="min-h-0 min-w-0">
                {r ? <ImgModule r={r} onPick={pick} /> : <IndexModule index={i} count={pool.length} country={country} />}
              </div>
            )
          })}

          <div className="min-h-0 min-w-0 bg-[#efeeeb] p-2.5" style={{ gridColumn: '3 / 11', gridRow: '3 / 9' }}>
            <div className="flex h-full min-h-0 min-w-0 border border-black">
              <div className="relative min-w-0 flex-[7] overflow-hidden bg-[#e5e7eb]">
                <AnimatePresence initial={false} mode="popLayout">
                  {cur && (
                    <motion.div key={cur.id} className="absolute inset-0"
                      initial={{ clipPath: 'inset(0 100% 0 0)' }} animate={{ clipPath: 'inset(0 0% 0 0)' }}
                      exit={{ clipPath: 'inset(0 0 0 100%)' }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
                      <GoogleArchiveMap rec={cur} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex min-h-0 flex-[3] flex-col overflow-y-auto border-l border-black bg-[#f6f2e7]">
                {cur && (
                  <>
                    <img src={colorImage(cur)} alt={cur.title} draggable={false} className="h-[38%] min-h-0 w-full border-b border-black object-cover" />
                    <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
                      <div className="font-en text-[9px] tracking-widest text-black/50">{cur.id} · {cur.city} · {cur.era}</div>
                      <h2 className="text-sm font-bold leading-snug">{cur.title}</h2>
                      <div className="border border-black/50 bg-white px-2 py-1.5">
                        <div className="font-en text-[8px] font-bold tracking-widest text-black/45">ADDRESS / 地图地址</div>
                        <div className="mt-1 text-[10px] leading-relaxed">{cur.address || '原始资料未标注具体地址'}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {DIMENSIONS.map((d) => (
                          <span key={d} className="truncate border border-black/50 bg-[#FFD200] px-1.5 py-0.5 text-[9px]">
                            {d} <b className="text-[hsl(var(--yp-red))]">{dimValue(cur, d)}</b>
                          </span>
                        ))}
                      </div>
                      {cur.note && <p className="text-[10px] leading-relaxed text-black/60">{cur.note}</p>}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
