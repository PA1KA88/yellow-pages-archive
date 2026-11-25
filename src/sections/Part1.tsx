import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import * as Select from '@radix-ui/react-select'
import { RECORDS, dimValues } from '@/data/load'
import {
  DIMENSIONS, dimValue, COUNTRY_NAME, COUNTRY_TZ,
  type ArchiveRecord, type Dimension,
} from '@/types/archive'
import ExtractWall from './ExtractWall'
import ExtractGrid from './ExtractGrid'
import SlotSpin from './SlotSpin'
import ArchiveCardGrid from '@/components/ArchiveCardGrid'
import EditorialPage from './EditorialPages'

export type Selection = Partial<Record<Dimension, string>>
type Stage = 'home' | 'slot' | 'wall' | 'grid'
type DirectoryPage = 'website' | 'about' | 'derivatives'
type DisplayFilter = 'regular' | 'alternative' | null

const SNAP = { type: 'spring' as const, stiffness: 300, damping: 32 }
const GRID_EASE = [0.22, 1, 0.36, 1] as const

/** 词条浮签（卡片放大态，围绕卡片分布） */
const TAG_POS = [
  { left: '-3%', top: '-10%' }, { right: '-5%', top: '12%' },
  { left: '-6%', top: '32%' }, { right: '-3%', top: '48%' },
  { left: '-6%', bottom: '22%' }, { right: '-2%', bottom: '-6%' },
  { left: '26%', top: '-12%' },
]

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <Select.Root value={value || 'all'} onValueChange={(next) => onChange(next === 'all' ? '' : next)}>
      <Select.Trigger
        aria-label={`${label}分类`}
        title={value || '全部'}
        className={`flex min-w-[120px] flex-1 flex-col justify-center border-r border-neutral-300 px-[20px] text-left outline-none transition-colors ${
          value ? 'bg-[#FFD200]/80' : 'hover:bg-neutral-200 focus:bg-neutral-200'
        }`}
      >
        <span className="text-[10px] leading-[20px] text-neutral-500">{label}</span>
        <span className={`block max-w-[140px] truncate text-[12px] font-semibold leading-[20px] ${value ? 'text-[hsl(var(--yp-red))]' : 'text-neutral-400'}`}>
          <Select.Value placeholder="全部" />
        </span>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          side="top"
          align="start"
          sideOffset={0}
          collisionPadding={8}
          className="z-[100] max-h-[320px] w-[240px] max-w-[80vw] overflow-y-auto border border-black bg-[#f6f2e7] shadow-none"
        >
          <Select.Viewport>
            <Select.Item value="all" className="cursor-pointer px-[20px] text-[12px] leading-[40px] outline-none data-[highlighted]:bg-[#FFD200] data-[state=checked]:bg-[#FFD200]">
              <Select.ItemText>全部</Select.ItemText>
            </Select.Item>
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="cursor-pointer px-[20px] text-[12px] leading-[40px] outline-none data-[highlighted]:bg-[#FFD200] data-[state=checked]:bg-[#FFD200]"
              >
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

export default function Part1({ onEnterPart2 }: { onEnterPart2: (r: ArchiveRecord) => void }) {
  const [stage, setStage] = useState<Stage>('home')
  const [page, setPage] = useState<DirectoryPage>('website')
  const [zoom, setZoom] = useState<ArchiveRecord | null>(null)
  const [sel, setSel] = useState<Selection>({})
  const [displayFilter, setDisplayFilter] = useState<DisplayFilter>(null)
  const [showTop, setShowTop] = useState(false)
  const visibleRecords = useMemo(
    () => displayFilter ? RECORDS.filter((r) => r.directoryClass === displayFilter) : RECORDS,
    [displayFilter],
  )
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 640)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /** 每个维度的候选值（年代候选太多时抽样） */
  const candidates = useMemo(() => {
    const m = {} as Record<Dimension, string[]>
    for (const d of DIMENSIONS) {
      if (d === '时区') m[d] = [...new Set(RECORDS.map((r) => COUNTRY_TZ[r.country]))]
      else if (d === '国家') m[d] = [...new Set(RECORDS.map((r) => COUNTRY_NAME[r.country]))]
      else {
        let vs = dimValues(d)
        if (vs.length > 30) vs = vs.filter((_, i) => i % Math.ceil(vs.length / 30) === 0)
        m[d] = vs
      }
    }
    return m
  }, [])

  const setDimension = (d: Dimension, value: string) => {
    setSel((current) => {
      const next = { ...current }
      if (value) next[d] = value
      else delete next[d]
      return next
    })
  }

  const randomCombo = () => {
    const ds = [...DIMENSIONS].sort(() => Math.random() - 0.5).slice(0, 3)
    const n: Selection = {}
    for (const d of ds) {
      const vs = candidates[d]
      n[d] = vs[Math.floor(Math.random() * vs.length)]
    }
    setSel(n)
  }

  /** 全部勾选：以一条随机“命运记录”的词条填满 7 维，保证层层筛选有结果 */
  const selectAll = () => {
    const r = RECORDS[Math.floor(Math.random() * RECORDS.length)]
    const n: Selection = {}
    for (const d of DIMENSIONS) n[d] = dimValue(r, d)
    setSel(n)
  }

  const changePage = (next: DirectoryPage) => {
    setPage(next)
    setZoom(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const selCount = Object.values(sel).filter(Boolean).length
  const extract = () => {
    if (selCount === 0) return
    setStage('slot') // 先进入老虎机转栏，词条原地消失
  }
  if (stage === 'slot')
    return (
      <SlotSpin
        selection={sel}
        onDone={() => setStage(selCount >= 7 ? 'grid' : 'wall')}
      />
    )
  if (stage === 'wall')
    return <ExtractWall selection={sel} onBack={() => setStage('home')} onEnterCard={onEnterPart2} />
  if (stage === 'grid')
    return <ExtractGrid selection={sel as Record<Dimension, string>} onBack={() => setStage('home')} onEnterCard={onEnterPart2} />

  const directory = (
    <nav aria-label="网站目录" className="flex h-[40px] items-stretch overflow-x-auto border-t border-neutral-300">
      {([
        ['about', 'ABOUT US'],
        ['website', 'WEBSITE'],
        ['derivatives', 'DERIVATIVES'],
      ] as const).map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-current={page === value ? 'page' : undefined}
          onClick={() => changePage(value)}
          className={`h-[40px] shrink-0 border-r border-neutral-300 px-[20px] font-en text-[18px] font-bold leading-[40px] tracking-[0.08em] transition-colors ${
            page === value ? 'bg-[#FFD200] text-black' : 'bg-transparent text-black hover:bg-neutral-200'
          }`}
        >
          {label}
        </button>
      ))}
    </nav>
  )

  /* ———————— 标题目录 + 档案页／待完成的空白页 ———————— */
  return (
    <div className="blueprint-grid relative flex min-h-screen flex-col pb-[60px]">
      <header className="h-[360px] shrink-0 md:h-[400px] xl:h-[460px] 2xl:h-[520px]">
        <div className="h-full overflow-hidden px-[20px] py-[60px]">
          <motion.h1
            className="mega-type archive-mega-title"
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.55, ease: GRID_EASE }}
          >
            WHAT ARE YOU
          </motion.h1>
          <motion.h1
            className="mega-type archive-mega-title text-[#FFD200]"
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.55, delay: 0.06, ease: GRID_EASE }}
          >
            LOOKING FOR?
          </motion.h1>
          {directory}
        </div>
      </header>

      {page !== 'website' ? (
        <EditorialPage page={page} />
      ) : (
        <>
          <ArchiveCardGrid key={displayFilter ?? 'all'} records={visibleRecords} onZoom={setZoom} />

          <AnimatePresence>
            {showTop && (
              <motion.button
                type="button"
                aria-label="一键回到顶端"
                className="fixed bottom-[80px] right-[20px] z-50 border border-black bg-[#FFD200] px-4 py-2 text-[11px] font-semibold text-black"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                回到顶端 ↑
              </motion.button>
            )}
          </AnimatePresence>

          {/* 所有维度均为可展开的分类；展示筛选不改变抽卡数据池。 */}
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[hsl(var(--ink))] bg-[hsl(var(--paper))]">
            <div className="flex h-[60px] items-stretch overflow-x-auto">
              <div className="flex shrink-0 items-center border-r border-black bg-[#FFD200] px-[20px] font-en text-[11px] font-bold leading-[20px] tracking-widest text-black">
                词条抽取<br />EXTRACT
              </div>
              <FilterSelect
                label="黄页"
                value={displayFilter ?? ''}
                options={[
                  { value: 'regular', label: '常规黄页' },
                  { value: 'alternative', label: '非常规黄页' },
                ]}
                onChange={(value) => setDisplayFilter(value ? value as DisplayFilter : null)}
              />
              {DIMENSIONS.map((d) => (
                <FilterSelect
                  key={d}
                  label={d}
                  value={sel[d] ?? ''}
                  options={candidates[d].map((value) => ({ value, label: value }))}
                  onChange={(value) => setDimension(d, value)}
                />
              ))}
              <button onClick={randomCombo} className="shrink-0 border-r border-neutral-300 px-[20px] text-[12px] leading-[20px] hover:bg-neutral-200">
                随机<br />组合
              </button>
              <button onClick={selectAll} className="shrink-0 border-r border-neutral-300 px-[20px] text-[12px] leading-[20px] hover:bg-neutral-200">
                全部<br />勾选
              </button>
              <button
                onClick={extract}
                disabled={selCount === 0}
                className={`shrink-0 rounded-none px-[20px] font-en text-sm font-bold leading-[20px] tracking-widest transition-colors ${
                  selCount > 0 ? 'bg-[#FFD200] text-black hover:bg-[#e6bd00]' : 'bg-neutral-300 text-neutral-500'
                }`}
              >
                抽取 →<br />
                <span className="text-[10px] font-normal">{selCount}/7 词条</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ——— 卡片放大态（锚点 + 词条浮签，普通 modal，无共享布局动画） ——— */}
      <AnimatePresence>
        {zoom && (
          <motion.div
            className="blueprint-grid fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoom(null)}
          >
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <motion.div
                initial={{ scale: 0.92, y: 16 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 8 }}
                transition={SNAP}
                className="relative"
              >
                <div className="flex max-h-[74vh] border-[3px] border-[#FFD200] bg-white">
                  {zoom.image && (
                    <img src={zoom.image} alt={zoom.title} className="yp-img max-h-[74vh] max-w-[46vw] object-contain" />
                  )}
                  <div className="flex w-64 flex-col justify-between border-l border-neutral-300 p-4">
                    <div>
                      <div className="font-en text-[10px] tracking-widest text-neutral-400">{zoom.id}</div>
                      <h2 className="mt-1 text-lg font-bold leading-snug">{zoom.title}</h2>
                      <p className="mt-3 text-[11px] leading-relaxed text-neutral-600">
                        {zoom.note || '黄页档案条目。'}
                      </p>
                    </div>
                    <div className="font-en text-[10px] text-neutral-500">
                      {COUNTRY_NAME[zoom.country]} / {zoom.city} / {zoom.era}
                    </div>
                  </div>
                </div>
                {[
                  { left: -5, top: -5 }, { right: -5, top: -5 },
                  { left: -5, bottom: -5 }, { right: -5, bottom: -5 },
                ].map((p, i) => (
                  <motion.span
                    key={i}
                    className="anchor-dot"
                    style={p}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.25 + i * 0.06, ...SNAP }}
                  />
                ))}
              </motion.div>

              {DIMENSIONS.map((d, i) => (
                <motion.div
                  key={d}
                  className="tag-float absolute z-30"
                  style={TAG_POS[i] as React.CSSProperties}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.3 + i * 0.07, ...SNAP }}
                >
                  {d} <b>{dimValue(zoom, d)}</b>
                </motion.div>
              ))}

              <motion.button
                className="absolute -top-12 right-0 border border-[hsl(var(--ink))] bg-[hsl(var(--paper))] px-3 py-1 font-en text-xs"
                onClick={() => setZoom(null)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                CLOSE ×
              </motion.button>
              <motion.button
                className="absolute -bottom-12 left-0 rounded-none bg-[#FFD200] px-4 py-2 font-en text-xs font-bold tracking-widest text-black hover:bg-[#e6bd00]"
                onClick={() => {
                  const r = zoom
                  setZoom(null)
                  setTimeout(() => onEnterPart2(r), 260)
                }}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                WHERE DO YOU WANT TO GO? →
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
