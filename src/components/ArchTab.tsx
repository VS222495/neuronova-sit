'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import styles from './shared.module.css'

interface Props {
  addXP: (n: number) => void
  playSound: (t: string) => void
}

function getLayers(hidden: number, neurons: number) {
  const r = [3]
  for (let i = 0; i < hidden; i++) r.push(neurons)
  r.push(2)
  return r
}

export default function ArchTab({ addXP }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const rafRef       = useRef<number | null>(null)
  const hiddenRef    = useRef(2)
  const neuronsRef   = useRef(4)
  const [hidden,  setHidden]  = useState(2)
  const [neurons, setNeurons] = useState(4)
  const [tooltip, setTooltip] = useState<{ cx: number; cy: number; text: string } | null>(null)

  const setH = (v: number) => { setHidden(v);  hiddenRef.current  = v; addXP(5) }
  const setN = (v: number) => { setNeurons(v); neuronsRef.current = v; addXP(5) }

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    let t = 0

    const draw = () => {
      t += 0.016
      const net   = getLayers(hiddenRef.current, neuronsRef.current)
      const maxN  = Math.max(...net)
      const gap   = W / (net.length + 1)

      // Neuron positions
      const pos: [number, number][][] = net.map((count, l) => {
        const x = gap * (l + 1)
        const sp = Math.min((H - 60) / (maxN), 52)
        return Array.from({ length: count }, (_, n) => [
          x,
          H / 2 + (n - (count - 1) / 2) * sp,
        ])
      })

      ctx.clearRect(0, 0, W, H)

      // Subtle grid
      ctx.strokeStyle = 'rgba(255,255,255,.025)'
      ctx.lineWidth = 1
      for (let x = 0; x < W; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
      for (let y = 0; y < H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

      // Connections + dots
      for (let l = 0; l < pos.length - 1; l++) {
        for (const [fx, fy] of pos[l]) {
          for (const [tx, ty] of pos[l + 1]) {
            const ph = Math.sin(t * 0.8 + fx * 0.01 + ty * 0.007)
            ctx.strokeStyle = `rgba(168,85,247,${0.055 + 0.035 * ph})`
            ctx.lineWidth = 1
            ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke()

            // signal dot
            const prog = ((t * 0.55 + l * 0.35 + fy * 0.004 + fx * 0.003) % 1 + 1) % 1
            if (prog < 0.8) {
              const p  = prog / 0.8
              const dx = fx + (tx - fx) * p
              const dy = fy + (ty - fy) * p
              const a  = p < 0.12 ? p / 0.12 : p > 0.7 ? (1 - (p - 0.7) / 0.1) : 1
              ctx.beginPath(); ctx.arc(dx, dy, 2.2, 0, Math.PI * 2)
              ctx.fillStyle = `rgba(0,255,136,${Math.min(1, a) * .85})`
              ctx.fill()
            }
          }
        }
      }

      // Neurons
      const COL = [
        [0, 255, 136],   // input  — green
        [168, 85, 247],  // hidden — purple
        [249, 115, 22],  // output — orange
      ]
      for (let l = 0; l < pos.length; l++) {
        const ci = l === 0 ? 0 : l === pos.length - 1 ? 2 : 1
        const [r, g, b] = COL[ci]
        for (let n = 0; n < pos[l].length; n++) {
          const [x, y] = pos[l][n]
          const pulse  = 0.5 + 0.5 * Math.sin(t * 1.7 + l * 1.3 + n * 0.75)
          const rad    = 13

          // glow
          const grd = ctx.createRadialGradient(x, y, 0, x, y, rad * 2.6)
          grd.addColorStop(0, `rgba(${r},${g},${b},${0.22 + pulse * 0.13})`)
          grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
          ctx.beginPath(); ctx.arc(x, y, rad * 2.6, 0, Math.PI * 2)
          ctx.fillStyle = grd; ctx.fill()

          // circle
          ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2)
          ctx.fillStyle   = `rgba(${r},${g},${b},${0.14 + pulse * 0.1})`
          ctx.strokeStyle = `rgba(${r},${g},${b},${0.65 + pulse * 0.35})`
          ctx.lineWidth   = 2
          ctx.fill(); ctx.stroke()
        }
      }

      // Labels
      const names = ['Vstup', ...Array.from({ length: hiddenRef.current }, (_, i) => `Skrytá ${i + 1}`), 'Výstup']
      ctx.textAlign = 'center'
      for (let l = 0; l < net.length; l++) {
        const x = gap * (l + 1)
        ctx.fillStyle = 'rgba(148,163,184,.65)'; ctx.font = '11px Inter, sans-serif'
        ctx.fillText(names[l], x, 16)
        ctx.fillStyle = 'rgba(148,163,184,.4)';  ctx.font = '10px "JetBrains Mono", monospace'
        ctx.fillText(`×${net[l]}`, x, H - 6)
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect   = canvas.getBoundingClientRect()
    const mx = (e.clientX - rect.left) * (canvas.width  / rect.width)
    const my = (e.clientY - rect.top)  * (canvas.height / rect.height)
    const net  = getLayers(hiddenRef.current, neuronsRef.current)
    const maxN = Math.max(...net)
    const W = canvas.width, H = canvas.height, gap = W / (net.length + 1)
    for (let l = 0; l < net.length; l++) {
      const x  = gap * (l + 1)
      const sp = Math.min((H - 60) / maxN, 52)
      for (let n = 0; n < net[l]; n++) {
        const y = H / 2 + (n - (net[l] - 1) / 2) * sp
        if (Math.hypot(mx - x, my - y) < 16) {
          const lname = l === 0 ? 'Vstupní vrstva' : l === net.length - 1 ? 'Výstupní vrstva' : `Skrytá vrstva ${l}`
          setTooltip({ cx: e.clientX - rect.left, cy: e.clientY - rect.top, text: `${lname}\nNeuron #${n + 1} z ${net[l]}` })
          return
        }
      }
    }
    setTooltip(null)
  }, [])

  const totalParams = () => {
    const net = getLayers(hidden, neurons)
    return net.slice(1).reduce((s, n, i) => s + net[i] * n + n, 0)
  }
  const totalConns = () => {
    const net = getLayers(hidden, neurons)
    return net.slice(1).reduce((s, n, i) => s + net[i] * n, 0)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <span style={{ fontSize: 42 }}>🧠</span>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
            <span style={{ background: 'rgba(0,255,136,.18)', color: 'var(--green)', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: '1px' }}>LEVEL 1</span>
            <h1 style={{ fontSize: 24, fontWeight: 900 }}>Architektura sítě</h1>
          </div>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>
            Prozkoumej strukturu neuronové sítě — posuň slidery a sleduj, jak se síť mění v reálném čase
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 268px', gap: 20, alignItems: 'start' }}>
        {/* Canvas */}
        <div className={styles.card} style={{ position: 'relative', overflow: 'hidden', padding: 12 }}>
          <canvas
            ref={canvasRef} width={760} height={400}
            style={{ width: '100%', display: 'block', cursor: 'crosshair' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTooltip(null)}
          />
          {tooltip && (
            <div style={{
              position: 'absolute', left: tooltip.cx + 14, top: tooltip.cy - 12,
              background: 'rgba(5,8,18,.96)', border: '1px solid rgba(0,255,136,.4)',
              borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--text)',
              pointerEvents: 'none', whiteSpace: 'pre-line',
              boxShadow: '0 0 18px rgba(0,255,136,.18)', zIndex: 10, lineHeight: 1.6,
            }}>{tooltip.text}</div>
          )}

          {/* Věděl/a jsi? */}
          <div style={{
            marginTop: 12, padding: '12px 16px',
            background: 'rgba(251,191,36,.06)', border: '1px solid rgba(251,191,36,.2)',
            borderRadius: 10, fontSize: 13, color: 'var(--text2)', lineHeight: 1.65,
          }}>
            <strong style={{ color: '#fbbf24' }}>💡 Věděl/a jsi?</strong>
            {' '}GPT-4 od OpenAI má přes <strong style={{ color: 'var(--text)' }}>1 bilion parametrů</strong> — to je milionkrát víc
            než má tvoje síť tady. Tesla Autopilot používá síť s <strong style={{ color: 'var(--text)' }}>48 kamerami</strong> a miliony
            neuronů, která rozhoduje každých pár milisekund jestli brzdit nebo odbočit. 🚗
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Sliders */}
          <div className={styles.card}>
            <div className={styles.sectionTitle}>⚙️ Konfigurace</div>

              {/* Slider: Skryté vrstvy */}
            <div style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 13, color: 'var(--text2)' }}>Skryté vrstvy</label>
                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--purple)', fontFamily: '"JetBrains Mono",monospace' }}>{hidden}</span>
              </div>
              <input type="range" min={1} max={4} value={hidden} className="purple"
                onChange={e => setH(Number(e.target.value))} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginTop: 3, marginBottom: 8 }}>
                <span>Jednoduchá</span><span>Hluboká</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, padding: '8px 10px', background: 'rgba(168,85,247,.07)', borderRadius: 8, borderLeft: '3px solid rgba(168,85,247,.5)' }}>
                {hidden === 1 && '🟢 1 vrstva — jednoduchá síť. Zvládne třeba rozlišit spam od normálního emailu.'}
                {hidden === 2 && '🔵 2 vrstvy — dobrý základ. Takto fungují jednoduché obrazové filtry.'}
                {hidden === 3 && '🟡 3 vrstvy — začínáme se blížit k \"hlubokému učení\" (deep learning).'}
                {hidden === 4 && '🔴 4 vrstvy — moderní sítě mívají stovky vrstev. GPT-4 jich má přes 96!'}
              </div>
            </div>

            <div style={{ marginBottom: 0, marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 13, color: 'var(--text2)' }}>Neurony / vrstva</label>
                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)', fontFamily: '"JetBrains Mono",monospace' }}>{neurons}</span>
              </div>
              <input type="range" min={2} max={8} value={neurons}
                onChange={e => setN(Number(e.target.value))} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginTop: 3, marginBottom: 8 }}>
                <span>Úzká</span><span>Široká</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, padding: '8px 10px', background: 'rgba(0,255,136,.06)', borderRadius: 8, borderLeft: '3px solid rgba(0,255,136,.4)' }}>
                {neurons <= 3 && '💡 Málo neuronů = síť se musí hodně „snažit". Může být pomalá nebo nepřesná.'}
                {neurons === 4 && '💡 4 neurony na vrstvu — pro jednodušší úlohy naprosto dostačující.'}
                {neurons >= 5 && neurons <= 6 && '💡 Více neuronů = více kapacity pro složité vzory. Ale taky víc parametrů k trénování.'}
                {neurons > 6 && '💡 Hodně neuronů! iPhone Face ID používá síť s tisíci neurony na vrstvu.'}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className={styles.card}>
            <div className={styles.sectionTitle}>⚔️ Stats postavy</div>
            {[
              { icon: '🗂️', label: 'Vrstvy celkem', val: hidden + 2, color: 'var(--purple)' },
              { icon: '🔢', label: 'Parametry',     val: totalParams().toLocaleString('cs'), color: 'var(--green)' },
              { icon: '🔗', label: 'Spojení',       val: totalConns().toLocaleString('cs'),  color: 'var(--blue)' },
            ].map(({ icon, label, val, color }) => (
              <div key={label} className={styles.statRow}>
                <div className={styles.statLabel}><span>{icon}</span><span>{label}</span></div>
                <span className={styles.statValue} style={{ color }}>{val}</span>
              </div>
            ))}
          </div>

          <div className={styles.cardGreen} style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>
            💡 <strong style={{ color: 'var(--green)' }}>Tip:</strong> Najdi libovolný neuron kurzorem — zobrazí se tooltip. Každý neuron zpracovává signál a předává ho dál vrstvou.
          </div>
        </div>
      </div>
    </div>
  )
}
