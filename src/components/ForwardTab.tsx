'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import styles from './shared.module.css'

interface Props {
  addXP: (n: number) => void
  playSound: (t: string) => void
}

/* ── Fixed network weights ── */
const W1 = [
  [ 0.52, -0.31,  0.78],
  [ 0.21,  0.68, -0.44],
  [-0.59,  0.12,  0.87],
  [ 0.34, -0.53,  0.19],
]
const B1 = [0.12, -0.18,  0.28,  0.02]
const W2 = [
  [ 0.63, -0.41,  0.25,  0.77],
  [-0.28,  0.54, -0.72,  0.13],
]
const B2 = [0.08, -0.09]

function relu(x: number) { return Math.max(0, x) }
function softmax(v: number[]) {
  const m   = Math.max(...v)
  const exp = v.map(x => Math.exp(x - m))
  const s   = exp.reduce((a, b) => a + b, 0)
  return exp.map(e => e / s)
}
function forward(x: number[]) {
  const h  = W1.map((row, i) => relu(row.reduce((s, w, j) => s + w * x[j], B1[i])))
  const z2 = W2.map((row, i) => row.reduce((s, w, j) => s + w * h[j], B2[i]))
  return { h, out: softmax(z2) }
}

const INPUT_COLORS: [number,number,number][] = [
  [0, 255, 136],
  [168, 85, 247],
  [59, 130, 246],
]

export default function ForwardTab({ addXP }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number | null>(null)
  const inputsRef = useRef([5, 5, 5])

  const [inputs, setInputs] = useState([5, 5, 5])
  const [result, setResult] = useState(() => forward([0.5, 0.5, 0.5]))
  const [prevOut, setPrevOut] = useState([0, 0])
  const [displayOut, setDisplayOut] = useState([0, 0])

  const [triedHighX1, setTriedHighX1] = useState(false)
  const [triedHighX2, setTriedHighX2] = useState(false)
  const taskDone = triedHighX1 && triedHighX2
  const taskXpRef = useRef(false)

  // Animate output number
  useEffect(() => {
    let frame = 0
    const target = result.out
    const start  = prevOut
    const dur    = 30
    const step   = () => {
      frame++
      const p = Math.min(frame / dur, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setDisplayOut(target.map((t, i) => start[i] + (t - start[i]) * ease))
      if (frame < dur) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  const handleInput = useCallback((i: number, v: number) => {
    const next = [...inputsRef.current]; next[i] = v
    inputsRef.current = next
    setInputs([...next])
    const r = forward(next.map(x => x / 10))
    setPrevOut(result.out)
    setResult(r)
    addXP(5)
    // Task tracking: tried high X1 (combo [10,1,5]) and high X2 (combo [1,10,1])
    if (next[0] >= 8 && next[1] <= 3) setTriedHighX1(true)
    if (next[1] >= 8 && next[0] <= 3) setTriedHighX2(true)
    if (next[0] >= 8 && next[1] <= 3 && next[1] >= 8 && next[0] <= 3) { /* both at once, rare */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.out, addXP])

  // Canvas: animated forward pass visualization
  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    let t = 0

    // Layer x positions
    const LAYERS = [3, 4, 2]
    const xPos   = [80, W / 2, W - 80]
    const maxN   = 4

    const getNeuronY = (layerIdx: number, n: number) => {
      const count = LAYERS[layerIdx]
      const sp    = Math.min((H - 60) / maxN, 56)
      return H / 2 + (n - (count - 1) / 2) * sp
    }

    const draw = () => {
      t += 0.016
      const inp = inputsRef.current
      const { h, out } = forward(inp.map(x => x / 10))

      ctx.clearRect(0, 0, W, H)

      // ── Connections ──
      for (let l = 0; l < LAYERS.length - 1; l++) {
        for (let from = 0; from < LAYERS[l]; from++) {
          for (let to = 0; to < LAYERS[l + 1]; to++) {
            const fx = xPos[l],     fy = getNeuronY(l, from)
            const tx = xPos[l + 1], ty = getNeuronY(l + 1, to)

            ctx.strokeStyle = 'rgba(255,255,255,.06)'
            ctx.lineWidth   = 1
            ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke()

            // Animated dot
            const phase  = ((t * 0.6 + l * 0.4 + from * 0.15 + to * 0.07) % 1 + 1) % 1
            if (phase < 0.85) {
              const p  = phase / 0.85
              const dx = fx + (tx - fx) * p, dy = fy + (ty - fy) * p
              const a  = p < 0.1 ? p / 0.1 : p > 0.75 ? (1 - (p - 0.75) / 0.1) : 1
              // Color based on source
              let rc: [number,number,number]
              if (l === 0) {
                rc = INPUT_COLORS[from]
              } else {
                const hval = h[from]
                const bright = Math.min(1, hval)
                rc = [Math.round(168 * (1 - bright) + 0 * bright), Math.round(85 * (1 - bright) + 255 * bright), Math.round(247 * (1 - bright) + 136 * bright)]
              }
              ctx.beginPath(); ctx.arc(dx, dy, 2.5, 0, Math.PI * 2)
              ctx.fillStyle = `rgba(${rc[0]},${rc[1]},${rc[2]},${Math.min(1, a) * .9})`
              ctx.fill()
            }
          }
        }
      }

      // ── Neurons ──
      // Input
      for (let n = 0; n < 3; n++) {
        const x = xPos[0], y = getNeuronY(0, n)
        const v = inp[n], r = INPUT_COLORS[n]
        const grd = ctx.createRadialGradient(x, y, 0, x, y, 28)
        grd.addColorStop(0, `rgba(${r[0]},${r[1]},${r[2]},.32)`)
        grd.addColorStop(1, `rgba(${r[0]},${r[1]},${r[2]},0)`)
        ctx.beginPath(); ctx.arc(x, y, 28, 0, Math.PI * 2); ctx.fillStyle = grd; ctx.fill()
        ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2)
        ctx.fillStyle   = `rgba(${r[0]},${r[1]},${r[2]},.25)`
        ctx.strokeStyle = `rgba(${r[0]},${r[1]},${r[2]},.9)`
        ctx.lineWidth   = 2; ctx.fill(); ctx.stroke()
        ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = 'bold 9px "JetBrains Mono",monospace'
        ctx.textAlign = 'center'; ctx.fillText(String(inp[n]), x, y + 3.5)
      }

      // Hidden (ReLU)
      for (let n = 0; n < 4; n++) {
        const x = xPos[1], y = getNeuronY(1, n)
        const v     = h[n]
        const norm  = Math.min(v, 2) / 2  // 0..1 brightness
        const pulse = 0.5 + 0.5 * Math.sin(t * 2 + n * 0.9)
        const rr = Math.round(60 + 108 * norm), gg = Math.round(30 + 225 * norm), bb = Math.round(100 + 147 * norm)

        const grd = ctx.createRadialGradient(x, y, 0, x, y, 26)
        grd.addColorStop(0, `rgba(${rr},${gg},${bb},${.3 + .2 * norm})`)
        grd.addColorStop(1, `rgba(${rr},${gg},${bb},0)`)
        ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.fillStyle = grd; ctx.fill()

        ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2)
        ctx.fillStyle   = norm === 0 ? 'rgba(60,60,80,.4)' : `rgba(${rr},${gg},${bb},${.2 + .15 * pulse})`
        ctx.strokeStyle = norm === 0 ? 'rgba(100,100,120,.5)' : `rgba(${rr},${gg},${bb},${.7 + .3 * pulse})`
        ctx.lineWidth   = 2; ctx.fill(); ctx.stroke()
        ctx.fillStyle = norm === 0 ? 'rgba(148,163,184,.5)' : 'rgba(255,255,255,.9)'
        ctx.font = 'bold 9px "JetBrains Mono",monospace'
        ctx.textAlign = 'center'; ctx.fillText(v.toFixed(2), x, y + 3.5)
      }

      // Output (softmax)
      for (let n = 0; n < 2; n++) {
        const x = xPos[2], y = getNeuronY(2, n)
        const v = out[n]
        const pulse = 0.5 + 0.5 * Math.sin(t * 1.5 + n * 1.2)
        const grd = ctx.createRadialGradient(x, y, 0, x, y, 28)
        grd.addColorStop(0, `rgba(249,115,22,${.25 + .2 * v})`)
        grd.addColorStop(1, 'rgba(249,115,22,0)')
        ctx.beginPath(); ctx.arc(x, y, 28, 0, Math.PI * 2); ctx.fillStyle = grd; ctx.fill()
        ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2)
        ctx.fillStyle   = `rgba(249,115,22,${.15 + .25 * v})`
        ctx.strokeStyle = `rgba(249,115,22,${.7 + .3 * pulse})`
        ctx.lineWidth   = 2; ctx.fill(); ctx.stroke()
        ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = 'bold 8px "JetBrains Mono",monospace'
        ctx.textAlign = 'center'; ctx.fillText(`${(v * 100).toFixed(0)}%`, x, y + 3.5)
      }

      // Layer titles
      ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center'
      const names = ['Vstup', 'Skrytá (ReLU)', 'Výstup (Softmax)']
      xPos.forEach((x, i) => {
        ctx.fillStyle = 'rgba(148,163,184,.6)'; ctx.fillText(names[i], x, 16)
      })

      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  // Award XP when both combos tried
  useEffect(() => {
    if (taskDone && !taskXpRef.current) {
      taskXpRef.current = true
      addXP(25)
    }
  }, [taskDone, addXP])

  const sliderLabels = ['x₁', 'x₂', 'x₃']
  const sliderCls    = ['', 'purple', 'blue']
  const sliderColors = ['var(--green)', 'var(--purple)', 'var(--blue)']

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <span style={{ fontSize: 42 }}>⚡</span>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
            <span style={{ background: 'rgba(168,85,247,.18)', color: 'var(--purple)', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: '1px' }}>LEVEL 2</span>
            <h1 style={{ fontSize: 24, fontWeight: 900 }}>Dopředný průchod</h1>
          </div>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>
            Nastav vstupní hodnoty a sleduj, jak signál prochází sítí přes aktivace až k výstupu
          </p>
        </div>
      </div>

      {/* Task Card */}
      <div style={{
        background: taskDone ? 'rgba(168,85,247,.08)' : 'rgba(251,191,36,.06)',
        border: `1px solid ${taskDone ? 'rgba(168,85,247,.3)' : 'rgba(251,191,36,.22)'}`,
        borderRadius: 12, padding: '14px 18px', marginBottom: 20,
        display: 'flex', gap: 12, alignItems: 'flex-start', transition: 'all .4s ease',
      }}>
        <div style={{ fontSize: 20, flexShrink: 0 }}>{taskDone ? '✅' : '🎯'}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6, color: taskDone ? 'var(--purple)' : '#fbbf24' }}>
            {taskDone ? 'SPLNĚNO! +25 XP' : 'ÚKOL LEVELU'}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>
            Nastav <strong style={{ color: taskDone ? 'var(--purple)' : '#fbbf24' }}>x₁=10, x₂=1, x₃=5</strong>. Která třída vyhraje?
            Teď zkus <strong style={{ color: taskDone ? 'var(--purple)' : '#fbbf24' }}>x₁=1, x₂=10, x₃=1</strong>. Změnil se výsledek?
          </p>
          {taskDone && (
            <p style={{ fontSize: 13, color: 'var(--purple)', marginTop: 8, fontWeight: 600 }}>
              Skvěle! Vidíš, jak jiné vstupy vedou k jinému výsledku? Přesně takhle pracuje iPhone Face ID.
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
        {/* Canvas */}
        <div className={styles.card} style={{ padding: 12 }}>
          {/* Explanation */}
          <div style={{
            marginBottom: 10, padding: '10px 14px',
            background: 'rgba(168,85,247,.08)', border: '1px solid rgba(168,85,247,.2)',
            borderRadius: 10, fontSize: 13, color: 'var(--text2)', lineHeight: 1.65,
          }}>
            💡 <strong style={{ color: 'var(--purple)' }}>Jak to funguje:</strong>{' '}
            Takhle síť počítá předpověď — vstup projde vrstvami a na konci dostaneš odpověď.{' '}
            <strong style={{ color: 'var(--text)' }}>Tohle se děje když iPhone rozpoznává tvůj obličej.</strong>
          </div>
          <canvas ref={canvasRef} width={680} height={380}
            style={{ width: '100%', display: 'block' }} />
        </div>

        {/* Controls + output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* KROK 1 — Vstup */}
          <div className={styles.card}>
            <div className={styles.sectionTitle}>① Vstupní vrstva</div>
            <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 12 }}>
              Sem přicházejí surová data. Představ si to jako <strong style={{ color: 'var(--text)' }}>smysly</strong> — oči, uši, nos.
              Pro YouTube doporučovač to mohou být: délka videa, počet zhlédnutí, čas spuštění.
              Posuň slidery a sleduj, jak se mění celá síť! 👇
            </p>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ marginBottom: i < 2 ? 18 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                  <label style={{ fontSize: 14, fontWeight: 700, color: sliderColors[i], fontFamily: '"JetBrains Mono",monospace' }}>
                    {sliderLabels[i]}
                  </label>
                  <span style={{ fontSize: 20, fontWeight: 800, color: sliderColors[i], fontFamily: '"JetBrains Mono",monospace' }}>
                    {inputs[i]}
                  </span>
                </div>
                <input type="range" min={0} max={10} step={1} value={inputs[i]}
                  className={sliderCls[i]}
                  onChange={e => handleInput(i, parseFloat(e.target.value))} />
              </div>
            ))}
          </div>

          {/* KROK 2 — Skrytá vrstva */}
          <div className={styles.card}>
            <div className={styles.sectionTitle}>② Skrytá vrstva — ReLU</div>
            <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 10 }}>
              Každý neuron sečte vstupy, vynásobí je váhami a projde přes <strong style={{ color: 'var(--purple)' }}>ReLU</strong>.
              ReLU je brutálně jednoduchá: záporné hodnoty = 0 (neuron spí 💤), kladné hodnoty projdou dál.
              Je to jako světelný spínač — buď svítí, nebo ne.
            </p>
            {result.h.map((v, i) => {
              const norm = Math.min(v, 2) / 2
              const color = norm === 0 ? 'var(--text3)' : `rgba(${Math.round(60+108*norm)},${Math.round(30+225*norm)},${Math.round(100+147*norm)},1)`
              return (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                    <span style={{ color: 'var(--text2)' }}>h{i + 1}</span>
                    <span style={{ color, fontFamily: '"JetBrains Mono",monospace', fontWeight: 700 }}>
                      {norm === 0 ? '💤 0.00 (mrtvý)' : `⚡ ${v.toFixed(3)}`}
                    </span>
                  </div>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${norm * 100}%`, background: norm === 0 ? 'var(--text3)' : `rgb(${Math.round(60+108*norm)},${Math.round(30+225*norm)},${Math.round(100+147*norm)})` }} />
                  </div>
                </div>
              )
            })}
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8, lineHeight: 1.5 }}>
              💡 Čím více neuronů svítí, tím „jistější" je síť ve svém výstupu.
            </p>
          </div>

          {/* KROK 3 — Výstup */}
          <div className={styles.card}>
            <div className={styles.sectionTitle}>③ Výstupní vrstva — Softmax</div>
            <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 10 }}>
              <strong style={{ color: 'var(--orange)' }}>Softmax</strong> je závěrečný rozhodčí. Vezme čísla z posledních neuronů
              a přepočítá je na procenta, která se vždy sečtou na 100 %.
              Přesně takhle Google Lens rozhoduje: „90 % pes, 8 % vlk, 2 % kočka." 🐕
            </p>
            {[0, 1].map(i => (
              <div key={i} style={{ marginBottom: i === 0 ? 14 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>Třída {i + 1}</span>
                  <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--orange)', fontFamily: '"JetBrains Mono",monospace', transition: 'color .3s' }}>
                    {(displayOut[i] * 100).toFixed(1)}%
                  </span>
                </div>
                <div className={styles.progressBar} style={{ height: 10 }}>
                  <div className={styles.progressFill} style={{
                    width: `${displayOut[i] * 100}%`,
                    background: 'linear-gradient(90deg,var(--orange),#f97316dd)',
                  }} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(249,115,22,.08)', borderRadius: 8, fontSize: 13 }}>
              🏆 Predikce: <strong style={{ color: 'var(--orange)' }}>Třída {result.out[0] > result.out[1] ? 1 : 2}</strong>
              {' '}({(Math.max(...result.out) * 100).toFixed(1)}% jistota)
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
