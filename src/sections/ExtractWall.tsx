import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RECORDS } from '@/data/load'
import { matchScore, type ArchiveRecord } from '@/types/archive'
import type { Selection } from './Part1'

const GRID_EASE = [0.22, 1, 0.36, 1] as const
const COLS = 12
const ROWS = 8

interface Rect { c: number; r: number; w: number; h: number }
type Kind = 'best' | 'img' | 'text' | 'tag'
interface Mod {
  key: string
  kind: Kind
  rec?: ArchiveRecord
  label?: string
  sub?: string
  rect: Rect
  movable: boolean
  /** true = 瞬时硬切；false = 快速滑动 */
  hard: boolean
  z: number
}

/* —— 黄金螺旋布局：12×8 网格的黄金分割焦点 + 黄金角（137.5°）螺旋扫描 —— */
const FOCAL = { c: 12 * 0.382, r: 8 * 0.382 } // ≈(4.58, 3.06) 视觉焦点
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)) // 137.5°
/** 黄金比例尺寸档：宽高比贴近 φ 或 1/φ，从大到小分级 */
const IMG_SIZES: [number, number][] = [[5, 3], [3, 2], [4, 3], [3, 4], [2, 3], [3, 1], [2, 2], [2, 1], [1, 2]]
const FILL_SIZES: [number, number][] = [[2, 2], [3, 1], [2, 1], [1, 2], [1, 1]]

/** 所有格点按「离黄金焦点距离」排序，等距时按黄金角螺旋次序推进 —— 大模块近心、小模块远心 */
const SPIRAL_CELLS: [number, number][] = (() => {
  const cells: { c: number; r: number; d: number; sweep: number }[] = []
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const dx = c + 0.5 - FOCAL.c
      const dy = (r + 0.5 - FOCAL.r) * (COLS / ROWS) // 修正网格宽高比，让螺旋近似圆形展开
      const ang = Math.atan2(dy, dx)
      cells.push({
        c, r,
        d: Math.hypot(dx, dy),
        sweep: ((ang / GOLDEN_ANGLE) % 1 + 1) % 1,
      })
    }
  return cells.sort((a, b) => a.d - b.d || a.sweep - b.sweep).map(({ c, r }) => [c, r])
})()

/* —— 网格占位：按黄金螺旋次序找空白区 —— */
function makePlacer() {
  const occ: boolean[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(false))
  const free = (c: number, r: number, w: number, h: number) => {
    if (c + w > COLS || r + h > ROWS) return false
    for (let y = r; y < r + h; y++)
      for (let x = c; x < c + w; x++) if (occ[y][x]) return false
    return true
  }
  const mark = (c: number, r: number, w: number, h: number, v: boolean) => {
    for (let y = r; y < r + h; y++)
      for (let x = c; x < c + w; x++) occ[y][x] = v
  }
  return {
    occupy: (rc: Rect) => mark(rc.c, rc.r, rc.w, rc.h, true),
    release: (rc: Rect) => mark(rc.c, rc.r, rc.w, rc.h, false),
    /** 螺旋扫描：沿黄金角螺旋从焦点向外找第一个能放下的锚点 */
    place: (w: number, h: number): Rect | null => {
      for (const [c, r] of SPIRAL_CELLS) {
        if (free(c, r, w, h)) { mark(c, r, w, h, true); return { c, r, w, h } }
      }
      return null
    },
  }
}

/** 初始布局：最佳匹配落在黄金焦点；词条环列焦点旁；图像按匹配度沿螺旋由近及远、由大到小 */
function buildMods(selection: Selection): Mod[] {
  const scored = RECORDS.map((r) => ({ r, s: matchScore(r, selection) }))
    .sort((a, b) => b.s - a.s || Math.random() - 0.5)
  const best = scored[0]?.r
  const withImg = scored.slice(1).filter((x) => x.r.image).map((x) => x.r)
  // 匹配结果不够铺满时，从全库补图像记录，保证画面尽量被图片占满
  if (withImg.length < 18)
    for (const r of RECORDS) {
      if (withImg.length >= 18) break
      if (r.image && r.id !== best?.id && !withImg.includes(r)) withImg.push(r)
    }

  const p = makePlacer()
  const mods: Mod[] = []

  // 最佳匹配：5×4 大窗，中心对准黄金焦点，长期静止
  const bestRect = {
    c: Math.min(Math.max(Math.round(FOCAL.c - 2.5), 0), COLS - 5),
    r: Math.min(Math.max(Math.round(FOCAL.r - 2), 0), ROWS - 4),
    w: 5, h: 4,
  }
  p.occupy(bestRect)
  if (best) mods.push({ key: 'best', kind: 'best', rec: best, rect: bestRect, movable: false, hard: false, z: 20 })

  // 勾选词条：黄色信息小块，沿螺旋放在焦点内环，和卡片一起运动
  Object.entries(selection).filter(([, v]) => v).forEach(([d, v], i) => {
    const rect = p.place(3, 1) ?? p.place(2, 1)
    if (rect) mods.push({ key: `tag-${d}`, kind: 'tag', label: d, sub: v as string, rect, movable: true, hard: i % 2 === 0, z: 15 })
  })

  // 移动图像窗：按匹配度排序，尺寸沿黄金比例档递减，位置沿螺旋由内向外
  withImg.slice(0, 18).forEach((r, i) => {
    const [w, h] = IMG_SIZES[i % IMG_SIZES.length]
    const rect = p.place(w, h) ?? p.place(2, 2) ?? p.place(2, 1) ?? p.place(1, 1)
    if (rect) mods.push({ key: `img-${r.id}`, kind: 'img', rec: r, rect, movable: true, hard: i % 3 === 0, z: 10 })
  })

  // 填充 pass：用小尺寸图像块把剩余网格空隙铺满（螺旋末端的边角）
  const fillers = RECORDS.filter((r) => r.image && r.id !== best?.id && !withImg.includes(r))
  let fi = 0
  let guard = 300
  while (fi < fillers.length && guard-- > 0) {
    let placed = false
    for (const [w, h] of FILL_SIZES) {
      const rect = p.place(w, h)
      if (rect) {
        const r = fillers[fi++ % fillers.length]
        mods.push({ key: `fill-${rect.c}-${rect.r}-${fi}`, kind: 'img', rec: r, rect, movable: true, hard: fi % 3 === 0, z: 5 })
        placed = true
        break
      }
    }
    if (!placed) break
  }

  return mods
}

/** 每拍重排：不动的模块留在原地，移动的模块沿黄金螺旋重新归位（大近心、小远心） */
function reshuffle(mods: Mod[]): Mod[] {
  const p = makePlacer()
  // 先占住静止模块与本轮不动的模块
  const stay = mods.filter((m) => !m.movable || Math.random() < 0.35)
  stay.forEach((m) => p.occupy(m.rect))
  // 移动的模块按尺寸从大到小重排，保证大模块仍靠近焦点
  const moving = mods
    .filter((m) => !stay.includes(m))
    .map((m) => {
      // 尺寸突变：图像窗 40% 概率换一档黄金比例宽高（突然变窄 / 变宽）
      let { w, h } = m.rect
      if (m.kind === 'img' && Math.random() < 0.4) {
        const [nw, nh] = IMG_SIZES[Math.floor(Math.random() * IMG_SIZES.length)]
        w = nw; h = nh
      }
      return { m, w, h }
    })
    .sort((a, b) => b.w * b.h - a.w * a.h)
  const placed = new Map<Mod, Rect>()
  for (const { m, w, h } of moving) {
    const rect = p.place(w, h) ?? p.place(2, 1) ?? p.place(1, 1) ?? m.rect
    placed.set(m, rect)
  }
  return mods.map((m) => (placed.has(m) ? { ...m, rect: placed.get(m)! } : m))
}

/**
 * S4a 未全选抽取 —— 矩形拼贴硬切（视频1 HORIZON 动效语言）
 * 浅灰模块网格底；矩形内容块移动 / 收缩 / 展开 / 错位切换；
 * 遮罩裁切图片；大面积留白 vs 小面积信息块；无淡入淡出。
 */
export default function ExtractWall({
  selection,
  onBack,
  onEnterCard,
}: {
  selection: Selection
  onBack: () => void
  onEnterCard: (r: ArchiveRecord) => void
}) {
  const [mods, setMods] = useState<Mod[]>(() => buildMods(selection))

  useEffect(() => {
    const t = setInterval(() => setMods((ms) => reshuffle(ms)), 2600) // 节奏放慢，从容机械
    return () => clearInterval(t)
  }, [])

  const pct = (n: number, total: number) => `${(n / total) * 100}%`

  return (
    <div
      className="light-grid fixed inset-0 overflow-hidden text-[#1a1a1a]"
      style={{
        // 背景网格与 12×8 模块网格严格对齐：模块边永远落在网格线上
        backgroundSize: `${100 / (COLS * 5)}% ${100 / (ROWS * 5)}%, ${100 / (COLS * 5)}% ${100 / (ROWS * 5)}%`,
      }}
    >
      {/* 顶栏：仅保留返回操作（说明性文字全部移除） */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-end p-5">
        <button
          onClick={onBack}
          className="pointer-events-auto border border-black bg-white px-3 py-1.5 font-en text-xs hover:bg-black hover:text-white"
        >
          ← BACK 返回首页
        </button>
      </header>

      {/* ——— 矩形拼贴：模块在 12×8 网格上移动 / 变宽变窄 / 硬切 ——— */}
      {mods.map((m) => {
        const style = {
          left: pct(m.rect.c, COLS),
          top: pct(m.rect.r, ROWS),
          width: pct(m.rect.w, COLS),
          height: pct(m.rect.h, ROWS),
          zIndex: m.z,
        }
        const transition = m.hard
          ? { duration: 0.45, ease: 'easeInOut' as const } // 缓动硬切（不瞬跳、不淡出）
          : { duration: 1.5, ease: GRID_EASE } // 更慢的丝滑机械滑移
        return (
          <motion.div
            key={m.key}
            className="absolute overflow-hidden border border-black will-change-[left,top,width,height]"
            initial={false}
            animate={style}
            transition={transition}
          >
            {m.kind === 'best' && m.rec && (
              <button className="relative flex h-full w-full flex-col bg-white text-left" onClick={() => onEnterCard(m.rec!)}>
                {m.rec.image ? (
                  /* 铺满窗口，无白边 */
                  <img src={m.rec.image} alt={m.rec.title} draggable={false} className="yp-img min-h-0 w-full flex-1 object-cover" />
                ) : (
                  <div className="flex min-h-0 w-full flex-1 items-center justify-center bg-[#FFD200] p-4">
                    <span className="font-en text-center text-xl font-bold leading-tight">{m.rec.title}</span>
                  </div>
                )}
                <span className="absolute left-0 top-0 bg-[#FFD200] px-2 py-0.5 font-en text-[10px] font-bold">BEST MATCH</span>
                <div className="flex items-center justify-between gap-2 border-t border-black px-2 py-1.5">
                  <span className="truncate text-[11px] font-semibold">{m.rec.title}</span>
                  <span className="font-en shrink-0 text-[9px] text-neutral-500">进入地图 →</span>
                </div>
              </button>
            )}
            {m.kind === 'img' && m.rec && (
              <button className="relative h-full w-full bg-white" onClick={() => onEnterCard(m.rec!)}>
                {/* 铺满窗口，无白边 */}
                <img src={m.rec.image!} alt={m.rec.title} draggable={false} className="yp-img h-full w-full object-cover" />
                <span className="absolute bottom-0 left-0 bg-black/80 px-1.5 py-0.5 font-en text-[9px] text-white">{m.rec.id}</span>
              </button>
            )}
            {m.kind === 'tag' && (
              <div className="flex h-full w-full items-center gap-2 bg-[#FFD200] px-2">
                <span className="shrink-0 text-[10px] text-black/60">{m.label}</span>
                <span className="truncate text-[12px] font-bold text-black">{m.sub}</span>
              </div>
            )}
            {m.kind === 'text' && (
              <button
                className="flex h-full w-full items-center justify-between gap-2 bg-white px-2 text-left"
                onClick={() => m.rec && onEnterCard(m.rec)}
              >
                <span className="truncate text-[10px]">{m.label}</span>
                <span className="font-en shrink-0 text-[8px] text-neutral-400">{m.sub}</span>
              </button>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
