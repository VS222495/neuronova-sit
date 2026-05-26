'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import ArchTab    from '@/components/ArchTab'
import ForwardTab from '@/components/ForwardTab'
import TrainTab   from '@/components/TrainTab'
import QuizTab    from '@/components/QuizTab'

/* ─────────────────── AUDIO ─────────────────── */
let _ctx: AudioContext | null = null
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!_ctx) _ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    return _ctx
  } catch { return null }
}

type SoundType = 'click' | 'xp' | 'correct' | 'wrong' | 'levelup'

function playSound(type: string) {
  const _type = type as SoundType
  const ctx = getCtx()
  if (!ctx) return
  try {
    const now = ctx.currentTime
    const osc  = (f: number, t: OscillatorType, start: number, dur: number, vol = 0.1) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.type = t; o.frequency.value = f
      g.gain.setValueAtTime(vol, now + start)
      g.gain.exponentialRampToValueAtTime(0.001, now + start + dur)
      o.start(now + start); o.stop(now + start + dur)
    }
    if (_type === 'click')  { osc(700, 'sine', 0, .06, .06) }
    if (_type === 'xp')     { osc(1000, 'sine', 0, .07, .05); osc(1400, 'sine', .04, .07, .04) }
    if (_type === 'correct'){ [523,659,784].forEach((f,i)=>osc(f,'sine',i*.07,.18,.1)) }
    if (_type === 'wrong')  { [320,220].forEach((f,i)=>osc(f,'square',i*.1,.15,.08)) }
    if (_type === 'levelup'){ [523,659,784,1047,1319].forEach((f,i)=>osc(f,'triangle',i*.09,.22,.12)) }
  } catch { /* ignore */ }
}

/* ─────────────────── TABS ─────────────────── */
const TABS = [
  { id: 'arch',    label: 'Architektura',      icon: '🧠', level: 1, color: '#00ff88', rgb: '0,255,136' },
  { id: 'forward', label: 'Dopředný průchod',  icon: '⚡', level: 2, color: '#a855f7', rgb: '168,85,247' },
  { id: 'train',   label: 'Trénování',         icon: '📈', level: 3, color: '#3b82f6', rgb: '59,130,246' },
  { id: 'quiz',    label: 'Kvíz',              icon: '🎯', level: 4, color: '#f97316', rgb: '249,115,22' },
] as const

type TabId = typeof TABS[number]['id']

interface Floater { id: number; amount: number; x: number }

/* ─────────────────── MAIN ─────────────────── */
export default function Home() {
  const [tab,           setTab]           = useState<TabId>('arch')
  const [xp,            setXp]            = useState(0)
  const [visited,       setVisited]       = useState<Set<TabId>>(new Set(['arch']))
  const [showLevelUp,   setShowLevelUp]   = useState(false)
  const [levelUpNum,    setLevelUpNum]    = useState(1)
  const [floaters,      setFloaters]      = useState<Floater[]>([])
  const floaterRef = useRef(0)

  // Load from localStorage
  useEffect(() => {
    const sx = localStorage.getItem('nq_xp')
    const sv = localStorage.getItem('nq_visited')
    if (sx) setXp(parseInt(sx, 10))
    if (sv) { try { setVisited(new Set(JSON.parse(sv))) } catch {} }
  }, [])

  const playerLevel = Math.floor(xp / 100) + 1
  const xpInLevel   = xp % 100
  const streak      = visited.size

  const addXP = useCallback((amount: number) => {
    playSound('xp')
    setXp(prev => {
      const next     = prev + amount
      const oldLevel = Math.floor(prev / 100) + 1
      const newLevel = Math.floor(next / 100) + 1
      localStorage.setItem('nq_xp', String(next))
      if (newLevel > oldLevel) {
        setShowLevelUp(true)
        setLevelUpNum(newLevel)
        playSound('levelup')
        setTimeout(() => setShowLevelUp(false), 3200)
      }
      return next
    })
    const id = ++floaterRef.current
    setFloaters(p => [...p, { id, amount, x: 120 + Math.random() * 180 }])
    setTimeout(() => setFloaters(p => p.filter(f => f.id !== id)), 1200)
  }, [])

  const switchTab = useCallback((id: TabId) => {
    playSound('click')
    setTab(id)
    setVisited(prev => {
      const next = new Set([...prev, id])
      localStorage.setItem('nq_visited', JSON.stringify([...next]))
      return next
    })
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Level-Up Overlay ── */}
      {showLevelUp && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, pointerEvents: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,.55)',
        }}>
          <div style={{
            animation: 'level-up 3.2s ease forwards',
            textAlign: 'center',
            background: 'rgba(7,10,18,.97)',
            border: '2px solid #fbbf24',
            borderRadius: '24px',
            padding: '44px 72px',
            boxShadow: '0 0 60px rgba(251,191,36,.3)',
          }}>
            <div style={{ fontSize: '56px', marginBottom: '6px' }}>⭐</div>
            <div style={{ fontSize: '11px', letterSpacing: '4px', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', marginBottom: '10px' }}>NOVÁ ÚROVEŇ!</div>
            <div style={{ fontSize: '72px', fontWeight: 900, background: 'linear-gradient(135deg,#fbbf24,#f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>
              {levelUpNum}
            </div>
          </div>
        </div>
      )}

      {/* ── XP Floaters ── */}
      {floaters.map(f => (
        <div key={f.id} style={{
          position: 'fixed', left: f.x, top: 74, zIndex: 999, pointerEvents: 'none',
          animation: 'xp-float 1.1s ease forwards',
          color: '#fbbf24', fontWeight: 800, fontSize: '15px',
          textShadow: '0 0 12px #fbbf24',
          fontFamily: '"JetBrains Mono", monospace',
        }}>+{f.amount} XP</div>
      ))}

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(13,17,23,.97)', backdropFilter: 'blur(18px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 68, display: 'flex', alignItems: 'center', gap: 20 }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg,var(--green),var(--purple))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>🧬</div>
            <span style={{ fontWeight: 900, fontSize: 16, background: 'linear-gradient(135deg,var(--green),var(--purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              NeuronQuest
            </span>
          </div>

          {/* Level badge */}
          <div style={{
            flexShrink: 0,
            background: 'linear-gradient(135deg,rgba(168,85,247,.2),rgba(0,255,136,.2))',
            border: '1px solid rgba(168,85,247,.4)', borderRadius: 10,
            padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: '1px', textTransform: 'uppercase' }}>Level</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--purple)', fontFamily: '"JetBrains Mono",monospace' }}>{playerLevel}</span>
          </div>

          {/* XP Bar */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: '1px', textTransform: 'uppercase' }}>XP</span>
              <span style={{ fontSize: 10, color: 'var(--green)', fontFamily: '"JetBrains Mono",monospace' }}>
                {xp} / {playerLevel * 100}
              </span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,.07)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                width: `${xpInLevel}%`,
                background: 'linear-gradient(90deg,var(--purple),var(--green))',
                transition: 'width .6s cubic-bezier(.34,1.56,.64,1)',
                boxShadow: '0 0 8px var(--green)',
              }} />
            </div>
          </div>

          {/* Streak */}
          <div style={{
            flexShrink: 0,
            background: 'rgba(251,191,36,.1)', border: '1px solid rgba(251,191,36,.3)',
            borderRadius: 10, padding: '6px 12px',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 18 }}>🔥</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fbbf24', lineHeight: 1, fontFamily: '"JetBrains Mono",monospace' }}>{streak}</div>
              <div style={{ fontSize: 9,  color: 'var(--text2)', lineHeight: 1, textTransform: 'uppercase', letterSpacing: '1px' }}>streak</div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Tab Bar ── */}
      <nav style={{
        background: 'rgba(13,17,23,.92)', borderBottom: '1px solid var(--border)',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 2 }}>
          {TABS.map(t => {
            const active   = tab === t.id
            const wasVisit = visited.has(t.id)
            return (
              <button key={t.id}
                onClick={() => switchTab(t.id)}
                style={{
                  background:   active ? `rgba(${t.rgb},.14)` : 'transparent',
                  border:       'none',
                  borderBottom: active ? `2px solid ${t.color}` : '2px solid transparent',
                  color:        active ? t.color : wasVisit ? 'var(--text)' : 'var(--text3)',
                  padding: '12px 18px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  borderRadius: '8px 8px 0 0',
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  transition: 'all .2s', whiteSpace: 'nowrap',
                }}
              >
                <span style={{
                  width: 20, height: 20, borderRadius: '50%', fontSize: 11, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: active ? t.color : 'rgba(255,255,255,.08)',
                  color:      active ? '#000' : 'var(--text2)',
                }}>{t.level}</span>
                <span>{t.icon}</span>
                <span>{t.label}</span>
                {wasVisit && !active && <span style={{ fontSize: 10, color: '#fbbf24' }}>✓</span>}
              </button>
            )
          })}
        </div>
      </nav>

      {/* ── Content ── */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <div key={tab} style={{ animation: 'slide-in .3s ease' }}>
          {tab === 'arch'    && <ArchTab    addXP={addXP} playSound={playSound} />}
          {tab === 'forward' && <ForwardTab addXP={addXP} playSound={playSound} />}
          {tab === 'train'   && <TrainTab   addXP={addXP} playSound={playSound} />}
          {tab === 'quiz'    && <QuizTab    addXP={addXP} playSound={playSound} />}
        </div>
      </main>
    </div>
  )
}
