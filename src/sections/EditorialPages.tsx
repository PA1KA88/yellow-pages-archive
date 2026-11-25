import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  DERIVATIVE_GROUPS, UNIT_ITEMS, VENUE_ITEMS, VISUAL_GROUPS,
  type EditorialGroup, type EditorialItem,
} from '@/data/editorial'

function EditorialCard({ item, width, onOpen }: { item: EditorialItem; width: number; onOpen: (item: EditorialItem) => void }) {
  return (
    <button
      type="button"
      className="editorial-card"
      style={{ width: width || '100%', height: item.height ?? 420 }}
      onClick={() => onOpen(item)}
      aria-label={`${item.id} ${item.title}，点击查看高清图`}
    >
      <div className="editorial-image-wrap">
        <img src={item.src} alt={item.title} loading="lazy" decoding="async" />
        <span className="editorial-open">VIEW +</span>
      </div>
      <div className="editorial-card-meta">
        <span className="editorial-index">{item.id}</span>
        <span className="editorial-name">{item.title}<small>{item.en}</small></span>
      </div>
    </button>
  )
}

function EditorialGrid({ items, onOpen }: { items: EditorialItem[]; onOpen: (item: EditorialItem) => void }) {
  const container = useRef<HTMLDivElement>(null)
  const [available, setAvailable] = useState(0)

  useEffect(() => {
    const element = container.current
    if (!element) return
    const measure = () => setAvailable(Math.floor(element.clientWidth / 20) * 20)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const widthFor = (item: EditorialItem) => {
    if (!available) return 0
    const desiredColumns = 12 / (item.span ?? 3)
    const columns = available < 640 ? 1 : available < 1100 ? Math.min(2, desiredColumns) : desiredColumns
    return Math.max(20, Math.floor((available - (columns - 1) * 20) / columns / 20) * 20)
  }

  return (
    <div ref={container} className="editorial-grid">
      {items.map((item) => <EditorialCard key={item.id} item={item} width={widthFor(item)} onOpen={onOpen} />)}
    </div>
  )
}

function GroupSection({ group, onOpen }: { group: EditorialGroup; onOpen: (item: EditorialItem) => void }) {
  return (
    <section className="editorial-group" aria-labelledby={`group-${group.id}`}>
      <header className="editorial-group-head">
        <span>{group.id}</span>
        <h3 id={`group-${group.id}`}>{group.title}</h3>
        <p>{group.en}</p>
      </header>
      <EditorialGrid items={group.items} onOpen={onOpen} />
    </section>
  )
}

function MajorHeading({ index, zh, en }: { index: string; zh: string; en: string }) {
  return (
    <header className="editorial-major-head">
      <span>{index}</span>
      <h2>{zh}</h2>
      <p>{en}</p>
    </header>
  )
}

export default function EditorialPage({ page }: { page: 'about' | 'derivatives' }) {
  const [selected, setSelected] = useState<EditorialItem | null>(null)
  const [naturalSize, setNaturalSize] = useState(false)

  useEffect(() => {
    if (!selected) return
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [selected])

  const open = (item: EditorialItem) => {
    setNaturalSize(false)
    setSelected(item)
  }

  return (
    <main className="editorial-page" aria-label={page === 'about' ? 'ABOUT US 主视觉与展览' : 'DERIVATIVES 展览物料'}>
      <div className="editorial-page-label">
        <span>{page === 'about' ? 'ABOUT US' : 'DERIVATIVES'}</span>
        <span>{page === 'about' ? '主视觉 / 展览' : '展览应用与物料'}</span>
        <span>{page === 'about' ? 'P01—P10 · A—H · V01—V04' : 'D01—D17'}</span>
      </div>

      {page === 'about' ? (
        <>
          <MajorHeading index="01" zh="主视觉" en="MAIN VISUAL" />
          {VISUAL_GROUPS.map((group) => <GroupSection key={group.id} group={group} onOpen={open} />)}
          <MajorHeading index="02" zh="展览" en="EXHIBITION" />
          <GroupSection group={{ id: 'A—H', title: '单体', en: 'INDIVIDUAL DISPLAY UNITS', items: UNIT_ITEMS }} onOpen={open} />
          <GroupSection group={{ id: 'V', title: '场馆', en: 'VENUE / 01—04', items: VENUE_ITEMS }} onOpen={open} />
        </>
      ) : (
        <>
          <MajorHeading index="03" zh="衍生品" en="DERIVATIVES / APPLICATIONS" />
          {DERIVATIVE_GROUPS.map((group) => <GroupSection key={group.id} group={group} onOpen={open} />)}
        </>
      )}

      <AnimatePresence>
        {selected && (
          <motion.div
            className="editorial-lightbox blueprint-grid"
            role="dialog"
            aria-modal="true"
            aria-label={`${selected.title} 高清图`}
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(100% 0 0 0)' }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => setSelected(null)}
          >
            <header>
              <span>{selected.id} / {selected.en}</span>
              <button type="button" onClick={() => setSelected(null)}>CLOSE ×</button>
            </header>
            <div className="editorial-lightbox-body" onClick={(event) => event.stopPropagation()}>
              <img
                src={selected.src}
                alt={selected.title}
                className={naturalSize ? 'is-natural' : ''}
                onClick={() => setNaturalSize((value) => !value)}
                title={naturalSize ? '点击适应屏幕' : '点击查看原始比例'}
              />
            </div>
            <footer onClick={(event) => event.stopPropagation()}>
              <strong>{selected.title}</strong>
              <span>{naturalSize ? '原始比例 · 点击图像适应屏幕' : '点击图像查看原始比例 · ESC 关闭'}</span>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
