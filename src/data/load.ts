import raw from './archive.curated.json'
import type { ArchiveRecord, CountryMeta } from '@/types/archive'

export const RECORDS = raw.records as ArchiveRecord[]
export const META = raw.meta as { countries: CountryMeta[]; dimensions: string[]; count: number }

export function byCountry(code: string): ArchiveRecord[] {
  return RECORDS.filter((r) => r.country === code)
}

/** 某维度在数据中的所有唯一值（截断过长的） */
export function dimValues(dim: string, recs = RECORDS): string[] {
  const set = new Set<string>()
  for (const r of recs) {
    let v = ''
    if (dim === '年代') v = r.era
    else if (dim === '地点') v = r.city
    else if (dim === '主题') v = r.theme
    else if (dim === '类型') v = r.type
    else if (dim === '载体') v = r.status
    if (v) set.add(v)
  }
  return [...set]
}
