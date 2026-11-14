import { useEffect, useRef } from 'react'

/**
 * Full-bleed Hero neural constellation & travelling photon pulse canvas.
 * Runs at 60 FPS when motion is allowed and renders a clean static frame under reduced-motion.
 */
export function HeroNeuralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let width = Math.max(320, Math.min(960, canvas.clientWidth || window.innerWidth))
    let height = Math.max(240, Math.min(540, canvas.clientHeight || 520))

    const syncDimensions = () => {
      if (!canvas) return
      const cssW = canvas.clientWidth || window.innerWidth
      const cssH = canvas.clientHeight || 680
      width = Math.max(320, Math.min(960, Math.round(cssW * 0.75)))
      height = Math.max(240, Math.min(540, Math.round(cssH * 0.75)))
      canvas.width = width
      canvas.height = height
      ctx.setTransform(1, 0, 0, 1, 0, 0)
    }
    syncDimensions()

    const nodeCount = (canvas.clientWidth || window.innerWidth) < 700 ? 14 : 22
    const palette = ['rgba(56, 189, 248, 0.9)', 'rgba(197, 255, 112, 0.85)', 'rgba(167, 139, 250, 0.88)']
    const bloomPalette = ['rgba(56, 189, 248, 0.13)', 'rgba(197, 255, 112, 0.13)', 'rgba(167, 139, 250, 0.13)']
    const nodes = Array.from({ length: nodeCount }, (_, idx) => ({
      x: ((idx * 79 + 19) % 100) * 0.01 * width,
      y: ((idx * 47 + 11) % 100) * 0.01 * height,
      vx: (((idx % 7) - 3) * 0.16) || 0.16,
      vy: (((idx % 5) - 2) * 0.15) || -0.14,
      r: idx % 5 === 0 ? 2.8 : 1.9,
      color: palette[idx % palette.length],
      bloom: bloomPalette[idx % bloomPalette.length],
    }))

    let frame = 0
    let tick = 0
    let inViewport = true
    let lastPaint = 0

    const drawFrame = (animate: boolean, now = performance.now()) => {
      if (animate && lastPaint > 0 && now - lastPaint < 32) {
        if (inViewport && !motionQuery.matches) {
          frame = window.requestAnimationFrame(ts => drawFrame(true, ts))
        }
        return
      }
      lastPaint = now
      ctx.clearRect(0, 0, width, height)
      tick += animate ? 0.036 : 0
      const linkDist = width < 520 ? 105 : 140

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        if (animate) {
          a.x += a.vx
          a.y += a.vy
          if (a.x < 12 || a.x > width - 12) a.vx *= -1
          if (a.y < 12 || a.y > height - 12) a.vy *= -1
        }

        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          const dist = Math.hypot(a.x - b.x, a.y - b.y)
          if (dist < linkDist) {
            const alpha = (1 - dist / linkDist) * 0.28
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(125, 211, 252, ${alpha.toFixed(3)})`
            ctx.lineWidth = 1
            ctx.stroke()

            // Animated photon pulse travelling along primary links
            if (animate && (i + j) % 7 === 0) {
              const t = (tick * 0.7 + i * 0.23) % 1
              const px = a.x + (b.x - a.x) * t
              const py = a.y + (b.y - a.y) * t
              ctx.beginPath()
              ctx.arc(px, py, 2.2, 0, Math.PI * 2)
              ctx.fillStyle = j % 2 === 0 ? 'rgba(197, 255, 112, 0.92)' : 'rgba(56, 189, 248, 0.95)'
              ctx.fill()
            }
          }
        }

        // Subtle outer bloom on major nodes
        if (a.r > 2.4) {
          ctx.beginPath()
          ctx.arc(a.x, a.y, 7.5, 0, Math.PI * 2)
          ctx.fillStyle = a.bloom
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2)
        ctx.fillStyle = a.color
        ctx.fill()
      }

      if (animate && inViewport && !motionQuery.matches) {
        frame = window.requestAnimationFrame(ts => drawFrame(true, ts))
      }
    }

    frame = window.requestAnimationFrame(ts => drawFrame(!motionQuery.matches, ts))

    const observer =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              const visible = entries[0]?.isIntersecting ?? true
              if (visible === inViewport) return
              inViewport = visible
              window.cancelAnimationFrame(frame)
              if (inViewport && !motionQuery.matches) {
                frame = window.requestAnimationFrame(() => drawFrame(true))
              }
            },
            { threshold: 0.01 }
          )
        : null
    observer?.observe(canvas)

    const onResize = () => {
      syncDimensions()
      if (motionQuery.matches) drawFrame(false)
    }

    const onMotionChange = () => {
      window.cancelAnimationFrame(frame)
      drawFrame(!motionQuery.matches && inViewport)
    }

    window.addEventListener('resize', onResize, { passive: true })
    motionQuery.addEventListener?.('change', onMotionChange)

    return () => {
      window.cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', onResize)
      motionQuery.removeEventListener?.('change', onMotionChange)
    }
  }, [])

  return <canvas ref={canvasRef} className="hero-neural-canvas" aria-hidden="true" />
}
