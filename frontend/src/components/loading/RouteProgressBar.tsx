import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

export function RouteProgressBar() {
  const location = useLocation()
  const [visible, setVisible] = useState(false)
  const [width, setWidth] = useState(0)
  const timersRef = useRef<number[]>([])

  useEffect(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id))
    timersRef.current = []

    setVisible(true)
    setWidth(12)

    timersRef.current.push(
      window.setTimeout(() => setWidth(45), 80),
      window.setTimeout(() => setWidth(72), 220),
      window.setTimeout(() => setWidth(88), 480),
      window.setTimeout(() => {
        setWidth(100)
        timersRef.current.push(
          window.setTimeout(() => {
            setVisible(false)
            setWidth(0)
          }, 220),
        )
      }, 720),
    )

    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id))
      timersRef.current = []
    }
  }, [location.pathname, location.search, location.hash])

  if (!visible) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[10000] h-0.5 bg-transparent"
      aria-hidden
    >
      <div
        className="h-full bg-primary shadow-[0_0_8px_var(--color-primary)] transition-[width] duration-200 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  )
}
