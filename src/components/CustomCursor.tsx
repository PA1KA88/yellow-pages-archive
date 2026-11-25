import { useEffect } from 'react'
import { motion, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion'

/** 行走手指 Logo（p6 原图，白底已转透明） */
export function FingerLogo({ size = 34 }: { size?: number }) {
  return (
    <img
      src="/finger-cursor.png"
      alt="walking fingers"
      draggable={false}
      style={{ height: size, width: 'auto' }}
    />
  )
}

/** 跟随鼠标的自定义光标（弹性跟随），仅在 active 时显示并隐藏系统光标 */
export default function CustomCursor({ active }: { active: boolean }) {
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.6 })
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.6 })
  const transform = useMotionTemplate`translate(${sx}px, ${sy}px)`

  useEffect(() => {
    if (!active) return
    const move = (e: MouseEvent) => { x.set(e.clientX - 20); y.set(e.clientY - 14) }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [active, x, y])

  if (!active) return null
  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-[999]"
      style={{ transform, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }}
    >
      <FingerLogo size={44} />
    </motion.div>
  )
}
