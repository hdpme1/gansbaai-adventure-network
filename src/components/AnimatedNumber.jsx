import { useState, useEffect } from 'react'

// Counts up from 0 to `value` whenever `value` changes (or the component
// mounts). Used for points-earned moments — cheap to add, reads as a much
// more "alive" UI than a number just appearing.
export default function AnimatedNumber({ value, duration = 700 }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let startTime = null
    let raf

    function tick(timestamp) {
      if (startTime === null) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setDisplay(Math.round(value * eased))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return display
}