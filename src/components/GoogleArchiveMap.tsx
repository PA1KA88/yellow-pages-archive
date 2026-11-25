import { useEffect, useMemo, useRef, useState } from 'react'
import type { ArchiveRecord } from '@/types/archive'
import { COUNTRY_NAME } from '@/types/archive'

type LatLon = { lat: number; lon: number }
type Provider = 'gaode' | 'esri'
type PhotonFeature = {
  geometry: { coordinates: [number, number] }
  properties: {
    name?: string
    state?: string
    country?: string
    countrycode?: string
    osm_value?: string
    type?: string
  }
}

const COUNTRY_CENTERS: Record<string, LatLon> = {
  china: { lat: 35.8617, lon: 104.1954 }, usa: { lat: 39.8, lon: -98.5 },
  uk: { lat: 54, lon: -2 }, france: { lat: 46.6, lon: 2.35 },
  japan: { lat: 36.2, lon: 138.25 }, italy: { lat: 42.8, lon: 12.5 },
  sweden: { lat: 62, lon: 15 }, russia: { lat: 61.5, lon: 90 },
  belgium: { lat: 50.6, lon: 4.7 }, netherlands: { lat: 52.2, lon: 5.3 },
  germany: { lat: 51.1, lon: 10.4 }, lebanon: { lat: 33.9, lon: 35.9 },
  canada: { lat: 56, lon: -106 }, southafrica: { lat: -29, lon: 24 },
  international: { lat: 20, lon: 0 },
}

const CITY_CENTERS: { keys: string[]; center: LatLon }[] = [
  { keys: ['纽约', 'new york'], center: { lat: 40.7128, lon: -74.006 } },
  { keys: ['东京', 'tokyo'], center: { lat: 35.6762, lon: 139.6503 } },
  { keys: ['paris', '巴黎'], center: { lat: 48.8566, lon: 2.3522 } },
  { keys: ['florence', '佛罗伦萨'], center: { lat: 43.7696, lon: 11.2558 } },
  { keys: ['london', '伦敦'], center: { lat: 51.5074, lon: -0.1278 } },
  { keys: ['philadelphia'], center: { lat: 39.9526, lon: -75.1652 } },
  { keys: ['boston'], center: { lat: 42.3601, lon: -71.0589 } },
  { keys: ['cape town'], center: { lat: -33.9249, lon: 18.4241 } },
  { keys: ['lyon', '里昂'], center: { lat: 45.764, lon: 4.8357 } },
  { keys: ['älmhult'], center: { lat: 56.551, lon: 14.137 } },
  { keys: ['上海', 'shanghai'], center: { lat: 31.2304, lon: 121.4737 } },
  { keys: ['北京', 'beijing'], center: { lat: 39.9042, lon: 116.4074 } },
  { keys: ['哈尔滨'], center: { lat: 45.8038, lon: 126.5349 } },
  { keys: ['成都'], center: { lat: 30.5728, lon: 104.0668 } },
]

function archiveQuery(rec: ArchiveRecord) {
  if (rec.mapQuery) return rec.mapQuery
  if (rec.city && rec.city !== '未标注' && rec.country !== 'international') {
    return `${rec.city}, ${COUNTRY_NAME[rec.country] ?? rec.country}`
  }
  return ''
}

function recordGeocodeQuery(rec: ArchiveRecord, query: string) {
  if (!query || /\d/.test(query)) return query
  const city = rec.city.toLowerCase()
  const aliases = [
    { keys: ['纽约', 'new york'], query: 'New York, USA' },
    { keys: ['东京', 'tokyo'], query: 'Tokyo, Japan' },
    { keys: ['paris', '巴黎'], query: 'Paris, France' },
    { keys: ['florence', '佛罗伦萨'], query: 'Florence, Italy' },
    { keys: ['london', '伦敦'], query: 'London, UK' },
    { keys: ['上海', 'shanghai'], query: 'Shanghai, China' },
  ]
  return aliases.find(({ keys }) => keys.some((key) => city.includes(key)))?.query ?? query
}

function fallbackCenter(rec: ArchiveRecord) {
  const city = rec.city.toLowerCase()
  const match = CITY_CENTERS.find(({ keys }) => keys.some((key) => city.includes(key)))
  return match?.center ?? COUNTRY_CENTERS[rec.country] ?? COUNTRY_CENTERS.international
}

function initialZoom(rec: ArchiveRecord, query: string) {
  if (!query) return rec.country === 'international' ? 2 : 5
  if (rec.locationPrecision === 'institution' || rec.locationPrecision === 'archive-address') return 16
  if (rec.locationPrecision === 'city') return 13
  return 5
}

async function geocode(query: string): Promise<{ center: LatLon; feature: PhotonFeature }> {
  const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`)
  if (!response.ok) throw new Error(`Geocode HTTP ${response.status}`)
  const data = await response.json() as { features?: PhotonFeature[] }
  const feature = data.features?.[0]
  if (!feature) throw new Error('No matching place')
  const [lon, lat] = feature.geometry.coordinates
  return { center: { lat, lon }, feature }
}

function project({ lat, lon }: LatLon, zoom: number) {
  const scale = 256 * 2 ** zoom
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat))
  const sin = Math.sin(clamped * Math.PI / 180)
  return {
    x: (lon + 180) / 360 * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  }
}

function unproject({ x, y }: { x: number; y: number }, zoom: number): LatLon {
  const scale = 256 * 2 ** zoom
  const n = Math.PI - 2 * Math.PI * y / scale
  return { lat: 180 / Math.PI * Math.atan(Math.sinh(n)), lon: x / scale * 360 - 180 }
}

const PI = Math.PI
const AXIS = 6378245
const ECCENTRICITY = 0.006693421622965943
const outOfChina = ({ lat, lon }: LatLon) => lon < 72.004 || lon > 137.8347 || lat < 0.8293 || lat > 55.8271
function transformLat(x: number, y: number) {
  let value = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  value += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3
  value += (20 * Math.sin(y * PI) + 40 * Math.sin(y / 3 * PI)) * 2 / 3
  value += (160 * Math.sin(y / 12 * PI) + 320 * Math.sin(y * PI / 30)) * 2 / 3
  return value
}
function transformLon(x: number, y: number) {
  let value = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  value += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3
  value += (20 * Math.sin(x * PI) + 40 * Math.sin(x / 3 * PI)) * 2 / 3
  value += (150 * Math.sin(x / 12 * PI) + 300 * Math.sin(x / 30 * PI)) * 2 / 3
  return value
}
function wgsToGcj(point: LatLon): LatLon {
  if (outOfChina(point)) return point
  let dLat = transformLat(point.lon - 105, point.lat - 35)
  let dLon = transformLon(point.lon - 105, point.lat - 35)
  const radLat = point.lat / 180 * PI
  let magic = Math.sin(radLat)
  magic = 1 - ECCENTRICITY * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = dLat * 180 / ((AXIS * (1 - ECCENTRICITY)) / (magic * sqrtMagic) * PI)
  dLon = dLon * 180 / (AXIS / sqrtMagic * Math.cos(radLat) * PI)
  return { lat: point.lat + dLat, lon: point.lon + dLon }
}
function gcjToWgs(point: LatLon): LatLon {
  const converted = wgsToGcj(point)
  return { lat: point.lat * 2 - converted.lat, lon: point.lon * 2 - converted.lon }
}

/** 真实道路地图：国内高德、海外 Esri；Photon 地址检索；WGS84/GCJ-02 坐标适配。 */
export default function GoogleArchiveMap({ rec }: { rec: ArchiveRecord }) {
  const recordQuery = useMemo(() => archiveQuery(rec), [rec])
  const [query, setQuery] = useState('')
  const [activeQuery, setActiveQuery] = useState(recordQuery)
  const [center, setCenter] = useState<LatLon>(() => fallbackCenter(rec))
  const [provider, setProvider] = useState<Provider>(rec.country === 'china' ? 'gaode' : 'esri')
  const [zoom, setZoom] = useState(() => initialZoom(rec, recordQuery))
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [resetVersion, setResetVersion] = useState(0)
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; y: number; center: LatLon } | null>(null)
  const wheelTime = useRef(0)
  const custom = activeQuery !== recordQuery

  useEffect(() => {
    let cancelled = false
    setQuery('')
    setActiveQuery(recordQuery)
    setProvider(rec.country === 'china' ? 'gaode' : 'esri')
    setCenter(fallbackCenter(rec))
    setZoom(initialZoom(rec, recordQuery))
    setPan({ x: 0, y: 0 })
    setError('')
    if (recordQuery) {
      setSearching(true)
      geocode(recordGeocodeQuery(rec, recordQuery)).then(({ center: next, feature }) => {
        if (cancelled) return
        setCenter(next)
        setProvider(feature.properties.countrycode?.toUpperCase() === 'CN' ? 'gaode' : 'esri')
        const kind = feature.properties.osm_value || feature.properties.type
        if (kind === 'country' || kind === 'continent') setZoom(5)
      }).catch(() => {
        if (!cancelled) setError('未能获取精确坐标，当前显示所属城市或国家')
      }).finally(() => {
        if (!cancelled) setSearching(false)
      })
    } else setSearching(false)
    return () => { cancelled = true }
  }, [rec, recordQuery, resetVersion])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const update = () => setSize({ width: viewport.clientWidth, height: viewport.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const now = Date.now()
      if (now - wheelTime.current < 140) return
      wheelTime.current = now
      setZoom((value) => Math.max(3, Math.min(18, value + (event.deltaY < 0 ? 1 : -1))))
    }
    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', onWheel)
  }, [])

  const search = async () => {
    const value = query.trim()
    if (!value || searching) return
    setSearching(true)
    setError('')
    try {
      const { center: next, feature } = await geocode(value)
      setCenter(next)
      setProvider(feature.properties.countrycode?.toUpperCase() === 'CN' ? 'gaode' : 'esri')
      setActiveQuery(value)
      setZoom(15)
      setPan({ x: 0, y: 0 })
    } catch {
      setError('未找到该地点，请输入更完整的城市或地址')
    } finally {
      setSearching(false)
    }
  }

  const zoomBy = (amount: number) => setZoom((value) => Math.max(3, Math.min(18, value + amount)))
  const centerCrs = provider === 'gaode' ? wgsToGcj(center) : center
  const tiles = useMemo(() => {
    if (!size.width || !size.height) return []
    const projected = project(centerCrs, zoom)
    const max = 2 ** zoom
    const minX = Math.floor((projected.x - size.width / 2 - pan.x - 128) / 256)
    const maxX = Math.floor((projected.x + size.width / 2 - pan.x + 128) / 256)
    const minY = Math.max(0, Math.floor((projected.y - size.height / 2 - pan.y - 128) / 256))
    const maxY = Math.min(max - 1, Math.floor((projected.y + size.height / 2 - pan.y + 128) / 256))
    const result: { key: string; url: string; left: number; top: number }[] = []
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const wrappedX = (x % max + max) % max
        const url = provider === 'gaode'
          ? `https://webrd0${(Math.abs(x + y) % 4) + 1}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x=${wrappedX}&y=${y}&z=${zoom}`
          : `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zoom}/${y}/${wrappedX}`
        result.push({
          key: `${provider}-${zoom}-${x}-${y}`,
          url,
          left: x * 256 - projected.x + size.width / 2 + pan.x,
          top: y * 256 - projected.y + size.height / 2 + pan.y,
        })
      }
    }
    return result
  }, [centerCrs.lat, centerCrs.lon, provider, zoom, size, pan])

  const finishDrag = () => {
    const drag = dragRef.current
    if (!drag) return
    const start = provider === 'gaode' ? wgsToGcj(drag.center) : drag.center
    const projected = project(start, zoom)
    const nextCrs = unproject({ x: projected.x - pan.x, y: projected.y - pan.y }, zoom)
    setCenter(provider === 'gaode' ? gcjToWgs(nextCrs) : nextCrs)
    setPan({ x: 0, y: 0 })
    dragRef.current = null
  }

  const external = provider === 'gaode'
    ? `https://www.amap.com/search?query=${encodeURIComponent(activeQuery || `${center.lat},${center.lon}`)}`
    : `https://www.arcgis.com/apps/mapviewer/index.html?center=${center.lon},${center.lat}&level=${zoom}`
  const precisionLabel = custom ? '自定义检索' : rec.locationPrecision === 'institution'
    ? '机构地址' : rec.locationPrecision === 'archive-address'
      ? '档案地址' : rec.locationPrecision === 'city' ? '城市定位' : '地点未标注'

  return (
    <div className="flex h-full w-full flex-col bg-[#efeeeb]">
      <div className="shrink-0 border-b border-black/60 bg-[#f6f2e7]">
        <div className="flex h-10 items-stretch">
          <label htmlFor={`map-search-${rec.id}`} className="hidden shrink-0 items-center border-r border-black/40 px-3 font-en text-[9px] font-bold tracking-wider sm:flex">
            MAP SEARCH
          </label>
          <input
            id={`map-search-${rec.id}`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') void search() }}
            placeholder="搜索真实地址、城市或地点"
            aria-label="搜索真实地图地址或地点"
            className="min-w-0 flex-1 bg-transparent px-3 text-[11px] outline-none placeholder:text-black/45 focus:bg-white"
          />
          {custom && (
            <button onClick={() => setResetVersion((value) => value + 1)} className="shrink-0 border-l border-black/40 px-2 text-[9px] hover:bg-[#FFD200]/50" title="返回当前档案定位">
              复位
            </button>
          )}
          <button onClick={() => void search()} disabled={searching} className="shrink-0 border-l border-black bg-[#FFD200] px-3 font-en text-[10px] font-bold hover:bg-black hover:text-[#FFD200] disabled:opacity-60">
            {searching ? 'LOCATING' : 'SEARCH'}
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        aria-label={`真实道路地图：${activeQuery || rec.title}。可拖动和滚轮缩放`}
        className="relative min-h-0 flex-1 cursor-grab select-none overflow-hidden bg-[#e9e7df] active:cursor-grabbing"
        style={{ touchAction: 'none' }}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          event.currentTarget.setPointerCapture(event.pointerId)
          dragRef.current = { x: event.clientX, y: event.clientY, center }
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current
          if (!drag) return
          setPan({ x: event.clientX - drag.x, y: event.clientY - drag.y })
        }}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onDoubleClick={() => zoomBy(1)}
      >
        <div className="absolute inset-0" style={{ filter: 'grayscale(.82) sepia(.08) brightness(1.04) contrast(1.16)' }}>
          {tiles.map((tile) => (
            <img
              key={tile.key}
              src={tile.url}
              alt=""
              draggable={false}
              loading="eager"
              decoding="async"
              className="absolute h-256 max-w-none w-256 select-none"
              style={{ left: tile.left, top: tile.top, width: 256, height: 256 }}
            />
          ))}
        </div>
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="h-[20px] w-[20px] border border-black bg-[#FFD200]" />
          <div className="absolute left-[26px] top-0 max-w-[180px] truncate whitespace-nowrap border border-black bg-[#f6f2e7] px-2 text-[9px] font-semibold leading-[18px]">
            {activeQuery || rec.title}
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-1 left-2 z-10 bg-[#f6f2e7]/85 px-1 font-en text-[7px] tracking-wide text-black/60">
          {provider === 'gaode' ? '© 高德地图 · GCJ-02' : '© Esri · World Street Map'} / GEOCODE © OPENSTREETMAP CONTRIBUTORS
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-black/60 bg-[#f6f2e7] px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="font-en text-[8px] font-bold tracking-widest text-black/50">{precisionLabel} / REAL MAP LOCATION</div>
          <div className={`mt-0.5 break-words text-[10px] font-semibold leading-snug ${error ? 'text-[hsl(var(--yp-red))]' : ''}`}>
            {error || (custom ? activeQuery : rec.address || activeQuery || '原始资料未标注具体地址')}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <div className="flex h-7 items-stretch border border-black bg-[#f6f2e7]" aria-label="地图缩放，无需 Ctrl">
            <button onClick={() => zoomBy(-1)} disabled={zoom <= 3} aria-label="缩小地图，无需 Ctrl" title="缩小（无需 Ctrl）" className="w-7 border-r border-black font-en text-sm font-bold hover:bg-[#FFD200] disabled:opacity-30">−</button>
            <span className="flex min-w-9 items-center justify-center border-r border-black px-1 font-en text-[9px] font-bold" aria-live="polite">Z{zoom}</span>
            <button onClick={() => zoomBy(1)} disabled={zoom >= 18} aria-label="放大地图，无需 Ctrl" title="放大（无需 Ctrl）" className="w-7 font-en text-sm font-bold hover:bg-[#FFD200] disabled:opacity-30">+</button>
          </div>
          <a href={external} target="_blank" rel="noreferrer" className="border border-black px-2 py-1 font-en text-[8px] font-bold hover:bg-[#FFD200]">
            打开完整地图 ↗
          </a>
        </div>
      </div>
    </div>
  )
}
