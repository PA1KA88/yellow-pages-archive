import { useEffect, useState } from 'react'
import Globe from './Globe'
import TypeTitle from './TypeTitle'

/** 两组字幕同步打字，地球同时入场；完整开场保持 3 秒后可进入。 */
export default function Intro({ onEnter }: { onEnter: () => void }) {
  const [ready, setReady] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  const enter = () => {
    if (leaving) return
    setLeaving(true)
    try {
      const au = new Audio('/audio/page-flip.mp3')
      au.volume = 0.55
      au.play().catch(() => {})
    } catch { /* 音频不可用时静默 */ }
    setTimeout(onEnter, 220)
  }

  return (
    <div className={`yp-aged-paper relative flex min-h-screen flex-col overflow-hidden transition-none ${leaving ? 'yp-page-out' : ''}`}>
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-8">
        <h1 className="font-type text-[10vw] leading-[1.04] tracking-tight text-[#121212] sm:text-7xl">
          <span className="block"><TypeTitle text="WHAT ARE YOU" speed={26} /></span>
          <span className="block pl-[8vw]"><TypeTitle text="LOOKING FOR?" speed={26} /></span>
        </h1>

        <div className="relative mt-4 flex items-center justify-center">
          <div className="yp-stamp shrink-0"><Globe size={300} /></div>
        </div>

        <h2 className="font-type mt-2 text-right text-[7vw] leading-[1.1] tracking-tight text-[#121212] sm:text-5xl">
          <span className="block"><TypeTitle text="YOUR WORLD" speed={26} /></span>
          <span className="mt-3 block"><TypeTitle text="AT YOUR FINGERTIPS" speed={26} /></span>
        </h2>

        <div className="mt-6 flex justify-end">
          <button
            onClick={enter}
            className={`font-type px-6 py-3 text-base tracking-[0.15em] text-[#121212] transition-all sm:text-lg ${
              ready
                ? 'bg-[#ffec00] shadow-[0_4px_16px_rgba(20,20,20,0.16)] hover:-translate-y-0.5'
                : 'pointer-events-none bg-transparent opacity-30'
            }`}
          >
            ENTER THE ARCHIVE →
          </button>
        </div>
      </div>
    </div>
  )
}
