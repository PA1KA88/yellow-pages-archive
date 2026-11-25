import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { RECORDS } from '@/data/load'
import { DIMENSIONS, matchScore, type ArchiveRecord, type Dimension } from '@/types/archive'

const GRID_EASE = [0.22, 1, 0.36, 1] as const
const SOFT_EASE = [0.16, 1, 0.3, 1] as const // 更长的缓出，标题入场不生硬
const COLS = 12
const ROWS = 8
const WORDS = ['CLASSIFY', 'INDEX', 'SEARCH', 'FIND', 'NAME', 'ADDRESS']
const RED = '#c22e1f'

interface Cell { c: number; r: number; w: number; h: number }
/** 规划好的网格落位（12×8）：7 个词条块各有固定格子，绝不重叠 */
const TAG_CELLS: Cell[] = [
  { c: 8, r: 0, w: 4, h: 1 },
  { c: 9, r: 1, w: 3, h: 1 },
  { c: 0, r: 2, w: 3, h: 1 },
  { c: 9, r: 2, w: 3, h: 1 },
  { c: 0, r: 6, w: 3, h: 1 },
  { c: 9, r: 6, w: 3, h: 1 },
  { c: 3, r: 7, w: 4, h: 1 },
]
const WORD_BAND: Cell = { c: 0, r: 0, w: 8, h: 2 }       // 超大裁切红字横向移动带
const BEST_CELL: Cell = { c: 3, r: 2, w: 5, h: 4 }       // 最佳匹配大窗（长期静止）
const IMG_CELLS: Cell[] = [                               // 次级图像窗（持续重组、轮换位置）
  { c: 0, r: 3, w: 3, h: 3 },
  { c: 8, r: 3, w: 4, h: 3 },
  { c: 7, r: 6, w: 2, h: 2 },
]
const TEXT_CELL: Cell = { c: 3, r: 6, w: 4, h: 1 }       // 说明文字块
const TICKER_CELL: Cell = { c: 0, r: 7, w: 3, h: 1 }     // 小字横向跑马灯

const pct = (n: number, total: number) => `${(n / total) * 100}%`
const cellStyle = (cell: Cell) => ({
  left: pct(cell.c, COLS),
  top: pct(cell.r, ROWS),
  width: pct(cell.w, COLS),
  height: pct(cell.h, ROWS),
})

/** 图像窗位置轮换表：每拍硬切 / 快速滑移到下一格子（持续重组构图） */
const IMG_ROTATION: Cell[][] = [
  [{ c: 0, r: 3, w: 3, h: 3 }, { c: 8, r: 3, w: 4, h: 3 }, { c: 7, r: 6, w: 2, h: 2 }],
  [{ c: 8, r: 4, w: 4, h: 2 }, { c: 0, r: 3, w: 3, h: 2 }, { c: 0, r: 4, w: 3, h: 2 }],
  [{ c: 0, r: 3, w: 2, h: 3 }, { c: 9, r: 3, w: 3, h: 3 }, { c: 8, r: 7, w: 4, h: 1 }],
]

/**
 * 全部抽取（7/7）—— 参考视频运动语言的深化版：
 * 模块化红网格 + 红色圆形索引点（脉冲）；
 * 超大裁切红字在横向带内持续平移，词与词之间硬切、黑白构成翻转；
 * 矩形图像窗遮罩裁切，内部图片纵向缓慢滑动，窗口之间持续换位重组；
 * BEST 大窗内部图片做台阶式变焦裁切；
 * 全部沿网格精准对齐，大留白，无淡入淡出，无 3D / 粒子 / 光效。
 */
export default function ExtractGrid({
  selection,
  onBack,
  onEnterCard,
}: {
  selection: Record<Dimension, string>
  onBack: () => void
  onEnterCard: (r: ArchiveRecord) => void
}) {
  const scored = useMemo(
    () => RECORDS.map((r) => ({ r, s: matchScore(r, selection) })).sort((a, b) => b.s - a.s || Math.random() - 0.5),
    [selection],
  )
  const best = scored[0]?.r
  const others = scored.slice(1).filter((x) => x.r.image && x.r.id !== best?.id).map((x) => x.r)
  const entries = DIMENSIONS.map((d) => [d, selection[d]] as [Dimension, string])

  // 超大字硬切轮换（CLASSIFY → INDEX → SEARCH …），偶数拍黑白构成翻转
  const [wi, setWi] = useState(0)
  // 图像窗位置重组节拍
  const [layout, setLayout] = useState(0)
  // BEST 窗内图片台阶式变焦
  const [zoomStep, setZoomStep] = useState(0)
  useEffect(() => {
    const t1 = setInterval(() => setWi((i) => (i + 1) % WORDS.length), 2600)
    const t2 = setInterval(() => setLayout((i) => (i + 1) % IMG_ROTATION.length), 4200)
    const t3 = setInterval(() => setZoomStep((i) => (i + 1) % 3), 2100)
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3) }
  }, [])

  const T0 = 0.3
  const STEP = 0.22
  const imgDelay = T0 + 7 * STEP + 0.2
  const ZOOMS = [1, 1.45, 1.15]

  return (
    <div
      className="light-grid fixed inset-0 overflow-hidden text-[#1a1a1a]"
      style={{
        backgroundSize: `${100 / (COLS * 5)}% ${100 / (ROWS * 5)}%, ${100 / (COLS * 5)}% ${100 / (ROWS * 5)}%`,
      }}
    >

      {/* 超大裁切红字横向移动带：整词缓入放全，停留后硬切下一个，黑白构成隔拍翻转 */}
      <motion.div
        className="absolute overflow-hidden border-y border-black/70"
        style={cellStyle(WORD_BAND)}
        initial={{ clipPath: 'inset(0 100% 0 0)' }}
        animate={{ clipPath: 'inset(0 0% 0 0)' }}
        transition={{ duration: 0.8, ease: SOFT_EASE }}
      >
        <div className="flex h-full items-center overflow-hidden">
          <motion.div
            key={wi}
            className="mega-type whitespace-nowrap leading-none will-change-transform"
            style={{ color: RED, fontSize: '15vh' }}
            initial={{ x: '105%' }}
            animate={{ x: 0 }}
            transition={{ duration: 1.05, ease: SOFT_EASE }} // 缓动入场：先快后慢，整词放全
          >
            {WORDS[wi]}
          </motion.div>
        </div>
      </motion.div>

      {/* 7 个词条块：逐个落入规划好的格子（矩形遮罩揭示） */}
      {entries.map(([d, v], i) => (
        <motion.div
          key={d}
          className="absolute z-[5] flex items-center gap-2 overflow-hidden border border-black bg-[#FFD200] px-3"
          style={cellStyle(TAG_CELLS[i])}
          initial={{ clipPath: 'inset(0 100% 0 0)' }}
          animate={{ clipPath: 'inset(0 0% 0 0)' }}
          transition={{ delay: T0 + i * STEP, duration: 0.45, ease: GRID_EASE }}
        >
          <span className="shrink-0 text-[10px] text-neutral-500">{d}</span>
          <span className="truncate text-[13px] font-bold" style={{ color: RED }}>{v}</span>
        </motion.div>
      ))}

      {/* BEST MATCH 大窗：长期静止；窗内图片台阶式变焦裁切（只显示局部） */}
      {best && (
        <motion.div
          className="absolute z-10 overflow-hidden border border-black bg-white"
          style={cellStyle(BEST_CELL)}
          initial={{ clipPath: 'inset(100% 0 0 0)' }}
          animate={{ clipPath: 'inset(0% 0 0 0)' }}
          transition={{ delay: imgDelay, duration: 0.55, ease: GRID_EASE }}
        >
          <button className="relative flex h-full w-full flex-col text-left" onClick={() => onEnterCard(best)}>
            {best.image ? (
              <div className="relative min-h-0 w-full flex-1 overflow-hidden">
                <motion.img
                  src={best.image}
                  alt={best.title}
                  draggable={false}
                  className="yp-img h-full w-full object-cover will-change-transform"
                  animate={{ scale: ZOOMS[zoomStep] }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }} // 台阶式变焦，带轻微缓动
                />
              </div>
            ) : (
              <div className="flex min-h-0 w-full flex-1 items-center justify-center bg-[#FFD200] p-4">
                <span className="font-en text-center text-xl font-bold leading-tight">{best.title}</span>
              </div>
            )}
            <span className="absolute left-0 top-0 bg-[#FFD200] px-2 py-0.5 font-en text-[10px] font-bold">BEST MATCH</span>
            <div className="flex items-center justify-between gap-2 border-t border-black px-2 py-1.5">
              <span className="truncate text-[11px] font-semibold">{best.title}</span>
              <span className="shrink-0 font-en text-[9px] text-neutral-500">进入地图 →</span>
            </div>
          </button>
        </motion.div>
      )}

      {/* 次级图像窗：沿网格换位重组；窗内图片纵向缓慢滑动（遮罩裁切） */}
      {IMG_CELLS.map((_, i) => {
        const rec = others[i]
        if (!rec) return null
        const cell = IMG_ROTATION[layout][i]
        return (
          <motion.div
            key={rec.id}
            className="absolute z-10 overflow-hidden border border-black bg-white will-change-[left,top,width,height]"
            initial={{ clipPath: 'inset(0 100% 0 0)', ...cellStyle(IMG_CELLS[i]) }}
            animate={{ clipPath: 'inset(0 0% 0 0)', ...cellStyle(cell) }}
            transition={{
              clipPath: { delay: imgDelay + 0.15 + i * 0.15, duration: 0.5, ease: GRID_EASE },
              default: { duration: i === 2 ? 0 : 0.6, ease: GRID_EASE }, // 一扇硬切、两扇滑移
            }}
          >
            <button className="relative block h-full w-full overflow-hidden" onClick={() => onEnterCard(rec)}>
              <motion.img
                src={rec.image!}
                alt={rec.title}
                draggable={false}
                className="yp-img h-[130%] w-full object-cover will-change-transform"
                animate={{ y: ['0%', '-23%', '0%'] }}
                transition={{ duration: 9 + i * 2.5, repeat: Infinity, ease: 'easeInOut' }} // 纵向缓慢滑动
              />
              <span className="absolute bottom-0 left-0 bg-black/80 px-1.5 py-0.5 font-en text-[9px] text-white">{rec.id}</span>
            </button>
          </motion.div>
        )
      })}

      {/* 说明文字块 */}
      <motion.div
        className="absolute flex items-center overflow-hidden border border-black bg-white px-3"
        style={cellStyle(TEXT_CELL)}
        initial={{ clipPath: 'inset(0 100% 0 0)' }}
        animate={{ clipPath: 'inset(0 0% 0 0)' }}
        transition={{ delay: imgDelay + 0.45, duration: 0.4, ease: GRID_EASE }}
      >
        <span className="truncate text-[10px] text-neutral-600">
          七维全选 · {scored.filter((x) => x.s >= 5).length} 条强匹配 / 共 {RECORDS.length} 条档案 —— 词条已在网格中归位
        </span>
      </motion.div>

      {/* 小字横向跑马灯：分类学语料持续水平移动 */}
      <motion.div
        className="absolute flex items-center overflow-hidden border border-black bg-white"
        style={cellStyle(TICKER_CELL)}
        initial={{ clipPath: 'inset(0 0 0 100%)' }}
        animate={{ clipPath: 'inset(0 0 0 0%)' }}
        transition={{ delay: imgDelay + 0.6, duration: 0.4, ease: GRID_EASE }}
      >
        <motion.div
          className="whitespace-nowrap font-en text-[9px] tracking-[0.3em] text-neutral-500 will-change-transform"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
        >
          {'YELLOW PAGES · INDEX · CLASSIFY · SEARCH · FIND · NAME · ADDRESS · PHONE · CATEGORY · '.repeat(4)}
        </motion.div>
      </motion.div>

      {/* 顶栏信息 + 操作 */}
      <header className="absolute inset-x-0 top-0 z-40 flex items-start justify-end p-5">
        <button
          onClick={onBack}
          className="border border-black bg-white px-3 py-1.5 font-en text-xs hover:bg-black hover:text-white"
        >
          ← BACK 返回首页
        </button>
      </header>
    </div>
  )
}
