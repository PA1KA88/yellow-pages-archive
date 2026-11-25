export interface ArchiveRecord {
  id: string
  source: string
  country: string
  city: string
  era: string
  title: string
  type: string
  theme: string
  status: string
  note: string
  url: string
  image: string
  /** 仅用于首页拓展展示筛选，不影响抽卡数据池。 */
  directoryClass?: 'regular' | 'alternative' | 'other'
  imageKind?: string
  /** 原始资料或机构地址；没有可靠定位时明确留空，不生成虚假坐标。 */
  address?: string
  mapQuery?: string
  locationPrecision?: 'institution' | 'archive-address' | 'city' | 'unlocated'
  /** 色卡等内容必须保留彩色，避免灰阶改变档案含义。 */
  preserveColor?: boolean
}

export interface CountryMeta {
  code: string
  name: string
  tz: string
}

export const DIMENSIONS = ['时区', '国家', '年代', '地点', '主题', '类型', '载体'] as const
export type Dimension = (typeof DIMENSIONS)[number]

export const COUNTRY_NAME: Record<string, string> = {
  china: '中国', usa: '美国', uk: '英国', france: '法国', japan: '日本', italy: '意大利',
  sweden: '瑞典', russia: '俄罗斯', belgium: '比利时', netherlands: '荷兰',
  germany: '德国', lebanon: '黎巴嫩', canada: '加拿大', southafrica: '南非', international: '国际',
}
export const COUNTRY_TZ: Record<string, string> = {
  china: 'UTC+8', usa: 'UTC-5', uk: 'UTC+0', france: 'UTC+1', japan: 'UTC+9', italy: 'UTC+1',
  sweden: 'UTC+1', russia: 'UTC+3', belgium: 'UTC+1', netherlands: 'UTC+1',
  germany: 'UTC+1', lebanon: 'UTC+2', canada: 'UTC-5', southafrica: 'UTC+2', international: 'UTC+0',
}
export const COUNTRIES = [
  'china', 'usa', 'uk', 'france', 'japan', 'italy', 'sweden', 'russia',
  'belgium', 'netherlands', 'germany', 'lebanon', 'canada', 'southafrica', 'international',
]

/** 维度 → 记录取值 */
export function dimValue(r: ArchiveRecord, d: Dimension): string {
  switch (d) {
    case '时区': return COUNTRY_TZ[r.country] ?? '—'
    case '国家': return COUNTRY_NAME[r.country] ?? r.country
    case '年代': return r.era || '—'
    case '地点': return r.city || '—'
    case '主题': return r.theme || '—'
    case '类型': return r.type || '—'
    case '载体': return r.status || '—'
  }
}

/** 选中词条对记录的匹配得分 */
export function matchScore(r: ArchiveRecord, sel: Partial<Record<Dimension, string>>): number {
  let s = 0
  for (const [d, v] of Object.entries(sel)) {
    if (!v) continue
    if (dimValue(r, d as Dimension) === v) s += 1
  }
  return s
}
