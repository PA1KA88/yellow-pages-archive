import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { dimValue, type ArchiveRecord, type Dimension } from '@/types/archive'
import { RECORDS } from '@/data/load'
import type { Selection } from './Part1'

const ITEM = 100 // 每个候选项占 5 个小网格，图片与两行标题均有独立网格区域
const GRID = 20 // 背景网格单元 px，栏宽严格为其整数倍

/**
 * 抽取过渡：词条消失 → 屏幕按抽选数量分栏，老虎机式转动
 * 栏宽严格对齐背景网格（20px 整数倍）；
 * 每栏条带前后都用档案卡片填满整屏，滚动穿过中线的过程中画面无空白；
 * 逐个减速定格在与该词条匹配的记录卡片上；栏宽同时按网格档位收缩/展开。
 */
export default function SlotSpin({
  selection,
  onDone,
}: {
  selection: Selection
  onDone: () => void
}) {
  const entries = useMemo(
    () => (Object.entries(selection).filter(([, v]) => v) as [Dimension, string][]),
    [selection],
  )
  const n = entries.length
  const BASE = 1.5 // 第一栏转动秒数，之后每栏递增

  const vh = typeof window === 'undefined' ? 800 : window.innerHeight
  const vw = typeof window === 'undefined' ? 1200 : window.innerWidth
  /** 栏宽对齐网格：基准宽 = 20 的整数倍，余量居中留白 */
  const colW = Math.max(Math.floor(vw / n / GRID) * GRID, GRID * 4)
  const sidePad = Math.floor((vw - colW * n) / 2 / GRID) * GRID

  /** 每栏的滚动条带：前置填充 + 滚动卡片 + 定格卡 + 后置填充，整屏无空白 */
  const strips = useMemo(() => {
    const pre = Math.ceil(vh / 2 / ITEM) + 3
    const tail = pre
    const rng = (k: number) =>
      Array.from({ length: k }, () => RECORDS[Math.floor(Math.random() * RECORDS.length)])
    return entries.map(([d, v]) => {
      // 定格卡：随机取一条匹配该维度值的记录（每次抽取结果不同）
      const matches = RECORDS.filter((r) => dimValue(r, d) === v)
      const finalRec =
        matches[Math.floor(Math.random() * matches.length)] ??
        RECORDS[Math.floor(Math.random() * RECORDS.length)]
      const items: ArchiveRecord[] = [...rng(pre), ...rng(16), finalRec, ...rng(tail)]
      const finalIdx = pre + 16
      return { d, v, items, finalIdx, pre }
    })
  }, [entries, vh])

  const totalMs = (BASE + (n - 1) * 0.4) * 1000 + 700
  useEffect(() => {
    const timer = setTimeout(onDone, totalMs)
    return () => clearTimeout(timer)
  }, [onDone, totalMs])

  const centerY = vh / 2 - ITEM / 2
  /** 起始位置：让 pre 填充卡先铺满中线上方，滚动全程屏幕无空白 */
  const startY = (pre: number) => centerY - pre * ITEM

  return (
    <div className="light-grid fixed inset-0 flex flex-col">
      {/* 栏目严格落在背景网格上（宽 = 20px 整数倍，左边距也对齐网格） */}
      <div className="flex min-h-0 flex-1" style={{ paddingLeft: sidePad }}>
        {strips.map(({ d, v, items, finalIdx, pre }, i) => {
          const spinDur = BASE + i * 0.4
          /* 栏宽收放也按网格档位（±40px） */
          const w2 = colW + ((i % 3) - 1) * 40
          const w3 = colW + ((i % 2) ? -40 : 40)
          return (
            <motion.div
              key={d + v}
              className="relative min-h-0 shrink-0 overflow-hidden border-r border-black first:border-l last:border-r"
              initial={{ width: colW }}
              animate={{ width: [colW, w2, w3, colW] }}
              transition={{ duration: spinDur, times: [0, 0.35, 0.7, 1], ease: 'easeInOut' }}
            >
              {/* 维度名：20px 文本基线 */}
              <div className="absolute left-0 right-0 top-0 z-10 h-[20px] truncate border-b border-black bg-[#efeeeb] px-[20px] text-[10px] leading-[20px] text-neutral-600">
                {d}
              </div>
              {/* 滚动条带：图片 3 格宽、间距 1 格、文字行高 1 格 */}
              <motion.div
                className="absolute left-0 right-0 top-0 will-change-transform"
                initial={{ y: startY(pre) }}
                animate={{ y: centerY - finalIdx * ITEM }}
                transition={{ duration: spinDur, ease: [0.15, 0.9, 0.2, 1] }}
              >
                {items.map((rec, k) => {
                  const last = k === finalIdx
                  return (
                    <div
                      key={k}
                      className={`grid grid-cols-[60px_minmax(0,1fr)] items-center gap-[20px] overflow-hidden border-b border-black/10 px-[20px] ${
                        last ? 'bg-[#FFD200]' : ''
                      }`}
                      style={{ height: ITEM }}
                    >
                      {rec.image ? (
                        <img
                          src={rec.image}
                          alt=""
                          className={`yp-img h-[60px] w-[60px] shrink-0 border object-cover ${
                            last ? 'border-black' : 'border-black/20'
                          }`}
                        />
                      ) : (
                        <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center border border-black/20 bg-[#FFD200]/60 font-en text-[8px] font-bold">
                          YP
                        </div>
                      )}
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className={`line-clamp-2 text-[10px] leading-[20px] ${last ? 'font-bold' : 'text-neutral-500'}`}>
                          {rec.title}
                        </div>
                        <div className="truncate font-en text-[8px] leading-[20px] text-neutral-500">{rec.id}</div>
                        {last && (
                          <div className="inline-block max-w-full truncate bg-[hsl(var(--yp-red))] px-1 font-en text-[8px] font-bold leading-[20px] text-white">
                            {v}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </motion.div>
              {/* 中奖线 */}
              <div className="pointer-events-none absolute left-0 right-0 top-1/2 z-10 -translate-y-1/2">
                <div className="border-t border-[hsl(var(--yp-red))]" />
                <div style={{ height: ITEM - 2 }} />
                <div className="border-t border-[hsl(var(--yp-red))]" />
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
