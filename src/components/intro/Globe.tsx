import { useEffect, useRef } from 'react'
import { GLOBE_DOTS } from '@/data/globeDots'

/**
 * 线稿地球（复刻参考站 Globe 组件）：
 * 2D canvas 正交投影，经纬线前后面分层透明度，陆地点阵只画朝向面；
 * 拖拽绕 X/Y 轴旋转（带惯性），滚轮绕 Z 轴翻滚，每 800ms 脚下涟漪。
 */
export default function Globe({ size = 340 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rippleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const m = canvasRef.current
    if (!m) return
    const k = m.getContext('2d')!
    const O = Math.min(2, window.devicePixelRatio || 1)
    m.width = size * O
    m.height = size * O
    const Y = size * 0.42
    const ne = size / 2
    const F = '#141414'
    let s = -0.28 // X 轴倾角（纬度旋转）
    let n = 0.6   // Y 轴旋转（经度）
    let o = 0     // Z 轴翻滚
    let a = 0, u = 0 // 角速度
    let c = false // 拖拽中
    let f = 0, h = 0 // 上次指针位置
    let y = 1, G = 0, C = 0
    let raf = 0
    let last = performance.now()
    let W = 0

    /** 经纬度 → 三维旋转 → 屏幕投影 [x, y, depth] */
    const B = (lon: number, lat: number): [number, number, number] => {
      const _e = (lon * Math.PI) / 180
      const se = (lat * Math.PI) / 180
      let te = Math.cos(se) * Math.sin(_e)
      let fe = Math.sin(se)
      let Ee = Math.cos(se) * Math.cos(_e)
      const D = Math.cos(n)
      const ie = Math.sin(n)
      ;[te, Ee] = [te * D + Ee * ie, -te * ie + Ee * D]
      const x = s + Math.sin(G) * 0.02
      const $ = Math.cos(x)
      const I = Math.sin(x)
      ;[fe, Ee] = [fe * $ - Ee * I, fe * I + Ee * $]
      const H = Math.cos(o)
      const z = Math.sin(o)
      ;[te, fe] = [te * H - fe * z, te * z + fe * H]
      return [Y * te, -Y * fe, Ee]
    }

    /** 折线分背面（0.14 透明）与正面（0.85 透明）两次描边 */
    const ee = (pts: [number, number, number][]) => {
      for (const me of [0, 1]) {
        k.beginPath()
        let started = false
        for (const [sx, sy, sz] of pts) {
          const front = sz > 0
          if ((me === 1) === front) {
            if (started) k.lineTo(sx, sy)
            else k.moveTo(sx, sy)
            started = true
          } else started = false
        }
        k.globalAlpha = me === 1 ? 0.85 : 0.14
        k.stroke()
      }
      k.globalAlpha = 1
    }

    const ve = (t: number) => {
      const me = Math.min(50, t - last)
      last = t
      if (!c) {
        n += a * me
        s += u * me
        a *= Math.pow(0.95, me / 16.7)
        u *= Math.pow(0.95, me / 16.7)
        y = Math.min(1, y + me / 1600)
        const te = y * y * (3 - 2 * y)
        n += 0.00021 * me * te
        s += (-0.28 - s) * 0.0008 * me * te
        G += me * 0.00045
      }
      W += me
      if (W > 800) {
        W = 0
        C = 1
        const box = rippleRef.current
        if (box)
          for (const delay of [0, 180]) {
            const el = document.createElement('span')
            el.className = 'yp-ripple absolute rounded-full border-2 border-[#121212]'
            el.style.cssText = `left:50%;top:82%;width:${size * 0.44}px;height:${size * 0.14}px;animation-delay:${delay}ms;opacity:0;transform:translate(-50%,-50%) scale(0.15)`
            box.appendChild(el)
            setTimeout(() => el.remove(), 1400)
          }
      }
      C *= Math.pow(0.9, me / 16.7)
      const _e = C * 3
      k.setTransform(O, 0, 0, O, 0, 0)
      k.clearRect(0, 0, size, size)
      k.save()
      k.translate(ne, ne + _e / 2)
      k.scale(1, 1 - _e / Y / 2)
      k.strokeStyle = F
      k.lineWidth = 1.6
      k.beginPath()
      k.arc(0, 0, Y, 0, Math.PI * 2)
      k.stroke()
      k.lineWidth = 0.6
      for (let se = -75; se <= 75; se += 15) {
        const pts: [number, number, number][] = []
        for (let fe = 0; fe <= 360; fe += 6) pts.push(B(fe, se))
        ee(pts)
      }
      for (let se = 0; se < 360; se += 15) {
        const pts: [number, number, number][] = []
        for (let fe = -90; fe <= 90; fe += 6) pts.push(B(se, fe))
        ee(pts)
      }
      k.fillStyle = F
      for (let se = 0; se < GLOBE_DOTS.length; se++) {
        const [te, fe] = GLOBE_DOTS[se]
        const [Ee, D, ie] = B(te, fe)
        if (ie > 0.02) k.fillRect(Ee - 1.6, D - 1.6, 3.2, 3.2)
      }
      k.restore()
      raf = requestAnimationFrame(ve)
    }
    raf = requestAnimationFrame(ve)

    const Pe = (e: PointerEvent) => {
      c = true
      y = 0
      f = e.clientX
      h = e.clientY
      m.setPointerCapture(e.pointerId)
    }
    const Oe = (e: PointerEvent) => {
      if (!c) return
      const dx = e.clientX - f
      const dy = e.clientY - h
      f = e.clientX
      h = e.clientY
      n -= dx * 0.006
      s += dy * 0.006
      s = Math.max(-1.4, Math.min(1.4, s))
      a = -dx * 0.006 * 8
      u = dy * 0.006 * 8
    }
    const we = () => { c = false }
    const ce = (e: WheelEvent) => {
      e.preventDefault()
      o += (e.deltaY > 0 ? 1 : -1) * 0.09
    }
    m.addEventListener('pointerdown', Pe)
    m.addEventListener('pointermove', Oe)
    m.addEventListener('pointerup', we)
    m.addEventListener('pointercancel', we)
    m.addEventListener('wheel', ce, { passive: false })
    return () => {
      cancelAnimationFrame(raf)
      m.removeEventListener('pointerdown', Pe)
      m.removeEventListener('pointermove', Oe)
      m.removeEventListener('pointerup', we)
      m.removeEventListener('pointercancel', we)
      m.removeEventListener('wheel', ce)
    }
  }, [size])

  return (
    <div className="relative" style={{ width: size, height: size * 1.08 }}>
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="cursor-grab touch-none active:cursor-grabbing"
        aria-label="线稿地球：拖拽绕 X/Y 轴旋转，滚轮绕 Z 轴翻滚"
      />
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="yp-step">
          <img
            src="/images/walking-fingers.png"
            width={size * 0.26}
            height={size * 0.26}
            style={{ width: size * 0.26, height: size * 0.26 }}
            draggable={false}
            role="img"
            aria-label="walking fingers"
          />
        </div>
      </div>
      <div ref={rippleRef} className="pointer-events-none absolute inset-0 overflow-visible" />
    </div>
  )
}
