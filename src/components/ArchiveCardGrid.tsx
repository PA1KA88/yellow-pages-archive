import { useEffect, useMemo, useRef, useState } from 'react'
import type { ArchiveRecord } from '@/types/archive'

interface Collection {
  key: string
  title: string
  records: ArchiveRecord[]
}

/** 同一主标题的连续年份、字母、封面与内页先合并为一个系列。 */
function collectionTitle(title: string) {
  return title.split(' · ')[0].trim() || title
}

function ArchiveCard({
  collection,
  onOpen,
}: {
  collection: Collection
  onOpen: () => void
}) {
  const cover = collection.records[0]
  const isSeries = collection.records.length > 1
  return (
    <button
      type="button"
      className="group relative flex h-[320px] w-full flex-col border-b border-r border-neutral-300 bg-[hsl(var(--paper))] text-left"
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 320px' }}
      onClick={onOpen}
      aria-label={isSeries ? `${collection.title}，${collection.records.length} 张系列档案，点击展开` : cover.title}
    >
      <div className="relative h-[240px] w-full shrink-0 overflow-hidden border-b border-neutral-300">
        <img
          src={cover.image}
          alt={isSeries ? `${collection.title}系列封面` : cover.title}
          loading="lazy"
          className="yp-img h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-1 top-1 bg-[hsl(var(--ink))] px-1 font-en text-[9px] leading-[14px] text-white">
          {isSeries ? `SERIES · ${collection.records.length}` : cover.id}
        </span>
      </div>
      <div className="h-[80px] shrink-0 p-1.5">
        <div className="line-clamp-2 text-[10px] leading-tight">
          {isSeries ? collection.title : cover.title}
        </div>
        {isSeries && (
          <div className="mt-1 font-en text-[9px] leading-[20px] text-[hsl(var(--yp-red))]">
            {collection.records.length} 张单卡 · 点击展开 →
          </div>
        )}
      </div>
      <span className="pointer-events-none absolute inset-0 border border-transparent group-hover:border-[#FFD200]" />
    </button>
  )
}

export default function ArchiveCardGrid({
  records,
  onZoom,
}: {
  records: ArchiveRecord[]
  onZoom: (record: ArchiveRecord) => void
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const gridRef = useRef<HTMLElement>(null)
  const [gridTemplateColumns, setGridTemplateColumns] = useState('')
  const collections = useMemo(() => {
    const buckets = new Map<string, ArchiveRecord[]>()
    for (const record of records) {
      const title = collectionTitle(record.title)
      const key = `${record.directoryClass ?? 'other'}:${title}`
      const bucket = buckets.get(key) ?? []
      bucket.push(record)
      buckets.set(key, bucket)
    }
    return [...buckets.entries()].map(([key, items]): Collection => ({
      key,
      title: collectionTitle(items[0].title),
      records: items,
    }))
  }, [records])

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const updateColumns = () => {
      const minimum = window.matchMedia('(max-width: 419px)').matches ? 160 : 200
      const innerWidth = Math.max(minimum, grid.clientWidth - 40)
      const count = Math.max(1, Math.floor((innerWidth + 20) / (minimum + 20)))
      const free = Math.max(0, innerWidth - count * minimum - (count - 1) * 20)
      const units = Math.floor(free / 20)
      const shared = Math.floor(units / count) * 20
      let remaining = (units % count) * 20
      const widths = Array.from({ length: count }, () => {
        const width = minimum + shared + (remaining > 0 ? 20 : 0)
        if (remaining > 0) remaining -= 20
        return width
      })
      const template = widths.map((width) => `${width}px`).join(' ')
      setGridTemplateColumns((current) => current === template ? current : template)
    }
    updateColumns()
    const observer = new ResizeObserver(updateColumns)
    observer.observe(grid)
    return () => observer.disconnect()
  }, [expanded])

  const current = expanded ? collections.find((collection) => collection.key === expanded) : null
  if (current) {
    return (
      <section aria-label={`${current.title}系列单卡`}>
        <div className="flex h-[60px] items-center border-b border-neutral-300 bg-[hsl(var(--paper))]">
          <button
            type="button"
            onClick={() => setExpanded(null)}
            className="h-full shrink-0 border-r border-neutral-300 px-[20px] text-[11px] leading-[20px] hover:bg-[#FFD200]"
          >
            ← 返回系列
          </button>
          <h2 className="px-[20px] text-[12px] font-semibold leading-[20px]">
            {current.title} · {current.records.length} 张单卡
          </h2>
        </div>
        <main ref={gridRef} className="archive-card-grid" style={{ gridTemplateColumns }}>
          {current.records.map((record) => (
            <ArchiveCard
              key={record.id}
              collection={{ key: record.id, title: record.title, records: [record] }}
              onOpen={() => onZoom(record)}
            />
          ))}
        </main>
      </section>
    )
  }

  return (
    <main ref={gridRef} className="archive-card-grid" style={{ gridTemplateColumns }}>
      {collections.map((collection) => (
        <ArchiveCard
          key={collection.key}
          collection={collection}
          onOpen={() => {
            if (collection.records.length > 1) setExpanded(collection.key)
            else onZoom(collection.records[0])
          }}
        />
      ))}
    </main>
  )
}
