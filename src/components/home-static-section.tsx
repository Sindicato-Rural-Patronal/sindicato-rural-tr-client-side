import { useState, useEffect, useRef } from 'react'
import { Users, GraduationCap, Tractor, Leaf } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type Stat = { icon: LucideIcon; target: number; label: string; suffix: string }

function StatItem({ stat, idx, hasAnimated }: { stat: Stat; idx: number; hasAnimated: boolean }) {
  const animatedCount = useCountUp(stat.target, 2000, hasAnimated)
  const Icon = stat.icon
  return (
    <div
      className="group text-center transition-all duration-500 ease-out hover:scale-105 hover:shadow-lg rounded-2xl p-4 bg-background/50 backdrop-blur-sm"
      style={{ animation: `fadeInUp 0.6s ease-out ${idx * 0.1}s both` }}
    >
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 transition-all duration-300 group-hover:bg-primary/20 group-hover:rotate-6 md:size-14">
        <Icon className="size-6 text-primary transition-transform duration-300 group-hover:scale-110 md:size-7" />
      </div>
      <p className="text-2xl font-bold text-foreground md:text-3xl">
        {hasAnimated ? animatedCount : 0}
        {stat.suffix}
      </p>
      <p className="mt-1 text-xs text-muted-foreground md:text-sm">{stat.label}</p>
    </div>
  )
}

function useCountUp(target: number, duration = 2000, shouldAnimate: boolean) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!shouldAnimate) return
    let start = 0
    const increment = target / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration, shouldAnimate])

  return count
}

export function StatsSection() {
  const [hasAnimated, setHasAnimated] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const { t } = useTranslation()

  const stats = [
    { icon: Users, target: 500, label: t('stats.members'), suffix: '+' },
    { icon: GraduationCap, target: 50, label: t('stats.courses'), suffix: '+' },
    { icon: Tractor, target: 30, label: t('stats.years'), suffix: '+' },
    { icon: Leaf, target: 1000, label: t('stats.graduates'), suffix: '+' },
  ]

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true)
        }
      },
      { threshold: 0.3 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [hasAnimated])

  return (
    <section ref={sectionRef} className="border-b bg-muted/40 py-12 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((stat, idx) => (
            <StatItem key={stat.label} stat={stat} idx={idx} hasAnimated={hasAnimated} />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}
