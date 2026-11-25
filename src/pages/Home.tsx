import { useState } from 'react'
import Part1 from '@/sections/Part1'
import Part2 from '@/sections/Part2'
import Intro from '@/components/intro/Intro'
import type { ArchiveRecord } from '@/types/archive'

export default function Home() {
  const [entered, setEntered] = useState(false)
  const [page, setPage] = useState<'part1' | 'part2'>('part1')
  const [seed, setSeed] = useState<ArchiveRecord | null>(null)

  // 开场动画前置：地球打字机开场 → ENTER 进入档案
  if (!entered) {
    return <Intro onEnter={() => setEntered(true)} />
  }
  if (page === 'part2') {
    return <Part2 initial={seed} onBack={() => setPage('part1')} />
  }
  return (
    <Part1
      onEnterPart2={(r) => {
        setSeed(r)
        setPage('part2')
      }}
    />
  )
}
