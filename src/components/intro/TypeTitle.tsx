import { useEffect, useState } from 'react'

/** 打字机标题：逐字打出，墨块光标闪烁，打完后触发 onDone（参考站原样复刻） */
export default function TypeTitle({
  text,
  speed = 60,
  delay = 0,
  className = '',
  keepCaret = false,
  onDone,
}: {
  text: string
  speed?: number
  delay?: number
  className?: string
  keepCaret?: boolean
  onDone?: () => void
}) {
  const [n, setN] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let i = 0
    let timer = 0
    let finished = false
    setN(0)
    setDone(false)
    const tick = () => {
      i += 1
      setN(i)
      if (i < text.length) {
        timer = window.setTimeout(tick, speed)
      } else if (!finished) {
        finished = true
        onDone?.()
        if (!keepCaret) setDone(true)
      }
    }
    timer = window.setTimeout(tick, delay + speed)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed, delay])

  return (
    <span className={className} aria-label={text}>
      <span>{text.slice(0, n)}</span>
      {!done && <span className="yp-caret" aria-hidden="true" />}
    </span>
  )
}
