import { useEffect } from 'react'

export function useScrollReveal() {
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in')
          const el = e.target as HTMLElement
          if (el.dataset.count) {
            const target = parseFloat(el.dataset.count)
            const decimals = (el.dataset.count.split('.')[1] || '').length
            const suffix = el.dataset.suffix || ''
            const dur = 1400
            const start = performance.now()
            const tick = (t: number) => {
              const p = Math.min((t - start) / dur, 1)
              const eased = 1 - Math.pow(1 - p, 3)
              const v = target * eased
              el.textContent = decimals
                ? v.toFixed(decimals) + suffix
                : Math.floor(v).toLocaleString() + suffix
              if (p < 1) requestAnimationFrame(tick)
              else el.textContent = decimals
                ? target.toFixed(decimals) + suffix
                : target.toLocaleString() + suffix
            }
            requestAnimationFrame(tick)
          }
          io.unobserve(e.target)
        }
      })
    }, { threshold: 0.2, rootMargin: '0px 0px -60px 0px' })

    document.querySelectorAll(
      '.reveal, .reveal-left, .reveal-scale, .how-arrow, [data-count]'
    ).forEach((el) => io.observe(el))

    return () => io.disconnect()
  }, [])
}
