'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import styles from './shared.module.css'

interface Props {
  addXP: (n: number) => void
  playSound: (t: string) => void
}

/* ─── Dataset: 2D binary classification ─── */
type Sample = { x: [number, number]; y: number }
const DATASET: Sample[] = [
  { x: [0.10, 0.20], y: 0 }, { x: [0.30, 0.10], y: 0 }, { x: [0.20, 0.35], y: 0 },
  { x: [0.15, 0.42], y: 0 }, { x: [0.38, 0.17], y: 0 }, { x: [0.25, 0.30], y: 0 },
  { x: [0.72, 0.82], y: 1 }, { x: [0.85, 0.70], y: 1 }, { x: [0.90, 0.85], y: 1 },
  { x: [0.75, 0.90], y: 1 }, { x: [0.80, 0.76], y: 1 }, { x: [0.92, 0.80], y: 1 },
]

/* ─── Network: 2→4→1 sigmoid ─── */
interface Net { w1: number[][]; b1: number[]; w2: number[]; b2: number }

const randn = () => (Math.random() - 0.5) * 0.6

function initNet(): Net {
  return {
    w1: Array.from({ length: 4 }, () => [randn(), randn()]),
    b1: [0, 0, 0, 0],
    w2: Array.from({ length: 4 }, randn),
    b2: 0,
  }
}

function sigmoid(x: number) { return 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, x)))) }

function trainStep(net: Net, lr: number): { loss: number; acc: number } {
  const dw1 = net.w1.map(() => [0, 0])
  const db1 = [0, 0, 0, 0]
  const dw2 = [0, 0, 0, 0]
  let db2 = 0, totalLoss = 0, correct = 0

  for (const s of DATASET) {
    const [x1, x2] = s.x, y = s.y
    const h   = net.w1.map((row, i) => sigmoid(row[0] * x1 + row[1] * x2 + net.b1[i]))
    const out = sigmoid(net.w2.reduce((acc, w, i) => acc + w * h[i], net.b2))

    totalLoss += -y * Math.log(out + 1e-8) - (1 - y) * Math.log(1 - out + 1e-8)
    correct   += (out > 0.5 ? 1 : 0) === y ? 1 : 0

    const dOut = out - y
    db2 += dOut
    for (let i = 0; i < 4; i++) {
      dw2[i]    += dOut * h[i]
      const dh   = dOut * net.w2[i] * h[i] * (1 - h[i])
      db1[i]    += dh
      dw1[i][0] += dh * x1
      dw1[i][1] += dh * x2
    }
  }

  const n = DATASET.length
  for (let i = 0; i < 4; i++) {
    net.w2[i]    -= lr * dw2[i]    / n
    net.b1[i]    -= lr * db1[i]    / n
    net.w1[i][0] -= lr * dw1[i][0] / n
    net.w1[i][1] -= lr * dw1[i][1] / n
  }
  net.b2 -= lr * db2 / n

  return { loss: totalLoss / n, acc: correct / n * 100 }
}

const MAX_EPOCHS = 300

export default function TrainTab({ addXP, playSound }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const netRef      = useRef<Net>(initNet())
  const lossRef     = useRef<number[]>([])
  const accRef      = useRef<number[]>([])
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [lr,         setLr]         = useState(0.1)
  const [isTraining, setIsTraining] = useState(false)
  const [epoch,      setEpoch]      = useState(0)
  const [lastAcc,    setLastAcc]    = useState(0)
  const [highScore,  setHighScore]  = useState(0)
  const [xpGiven,    setXpGiven]    = useState(false)

  // Load high score
  useEffect(() => {
    const hs = localStorage.getItem('nq_hs')
    if (hs) setHighScore(parseFloat(hs))
  }, [])

  // Draw canvas whenever data changes
  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const pad = { top: 20, right: 20, bottom: 40, left: 50 }
    const gW = W - pad.left - pad.right
    const gH = H - pad.top  - pad.bottom

    ctx.clearRect(0, 0, W, H)

    // Background
    ctx.fillStyle = 'rgba(255,255,255,.02)'
    ctx.fillRect(pad.left, pad.top, gW, gH)

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (gH / 4) * i
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + gW, y); ctx.stroke()
      ctx.fillStyle = 'rgba(148,163,184,.45)'; ctx.font = '10px "JetBrains Mono",monospace'
      ctx.textAlign = 'right'
      ctx.fillText((1 - i * 0.25).toFixed(2), pad.left - 5, y + 3)
    }
    for (let i = 0; i <= 5; i++) {
      const x = pad.left + (gW / 5) * i
      ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + gH); ctx.stroke()
      ctx.fillStyle = 'rgba(148,163,184,.45)'; ctx.textAlign = 'center'
      ctx.fillText(String(Math.round((i / 5) * MAX_EPOCHS)), x, pad.top + gH + 15)
    }

    const losses = lossRef.current
    if (losses.length < 2) return

    // Normalize loss to [0,1]
    const maxL = Math.max(...losses, 0.01)

    const ptX = (i: number) => pad.left + (i / MAX_EPOCHS) * gW
    const ptY = (v: number, max: number) => pad.top + gH - (Math.min(v, max) / max) * gH

    // Loss line
    const grad = ctx.createLinearGradient(pad.left, 0, pad.left + gW, 0)
    grad.addColorStop(0, 'rgba(239,68,68,.9)')
    grad.addColorStop(1, 'rgba(249,115,22,.9)')
    ctx.strokeStyle = grad; ctx.lineWidth = 2.5
    ctx.beginPath()
    losses.forEach((l, i) => {
      const x = ptX(i), y = ptY(l, maxL)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Fill under loss
    ctx.beginPath()
    losses.forEach((l, i) => {
      const x = ptX(i), y = ptY(l, maxL)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.lineTo(ptX(losses.length - 1), pad.top + gH)
    ctx.lineTo(pad.left, pad.top + gH)
    ctx.closePath()
    ctx.fillStyle = 'rgba(239,68,68,.07)'; ctx.fill()

    // Accuracy line
    const accs = accRef.current
    const accGrad = ctx.createLinearGradient(pad.left, 0, pad.left + gW, 0)
    accGrad.addColorStop(0, 'rgba(0,255,136,.7)')
    accGrad.addColorStop(1, 'rgba(0,200,100,.7)')
    ctx.strokeStyle = accGrad; ctx.lineWidth = 2; ctx.setLineDash([5, 3])
    ctx.beginPath()
    accs.forEach((a, i) => {
      const x = ptX(i), y = ptY(a / 100, 1)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke(); ctx.setLineDash([])

    // Labels
    ctx.fillStyle = 'rgba(239,68,68,.9)'; ctx.font = '10px Inter,sans-serif'; ctx.textAlign = 'left'
    ctx.fillText('■ Loss', pad.left + 4, pad.top + 14)
    ctx.fillStyle = 'rgba(0,255,136,.8)'
    ctx.fillText('╌ Přesnost', pad.left + 54, pad.top + 14)
    ctx.fillStyle = 'rgba(148,163,184,.5)'; ctx.textAlign = 'center'
    ctx.fillText('Epochy', pad.left + gW / 2, H - 6)

    // Current point marker
    if (losses.length > 0) {
      const li = losses.length - 1
      ctx.beginPath()
      ctx.arc(ptX(li), ptY(losses[li], maxL), 5, 0, Math.PI * 2)
      ctx.fillStyle = 'var(--orange)'; ctx.fill()
    }
  }, [])

  useEffect(() => { drawGraph() }, [drawGraph, epoch])

  // Training loop
  const startTraining = useCallback(() => {
    if (isTraining) return
    netRef.current  = initNet()
    lossRef.current = []
    accRef.current  = []
    setEpoch(0); setLastAcc(0); setXpGiven(false)
    setIsTraining(true)

    let ep = 0
    const step = () => {
      const { loss, acc } = trainStep(netRef.current, lr)
      lossRef.current.push(loss)
      accRef.current.push(acc)
      ep++
      setEpoch(ep)
      setLastAcc(acc)

      if (ep < MAX_EPOCHS) {
        timerRef.current = setTimeout(step, 10)
      } else {
        setIsTraining(false)
        // High score
        const hs = parseFloat(localStorage.getItem('nq_hs') || '0')
        if (acc > hs) {
          localStorage.setItem('nq_hs', String(acc))
          setHighScore(acc)
          playSound('correct')
        }
        if (!xpGiven) { addXP(30); setXpGiven(true) }
      }
    }
    step()
  }, [isTraining, lr, addXP, playSound, xpGiven])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const lrWarning = lr < 0.01
    ? { emoji: '🐢', text: 'Velmi pomalé učení', color: 'var(--blue)' }
    : lr > 0.5
    ? { emoji: '💥', text: 'Nestabilní — může divergovat', color: 'var(--red)' }
    : lr > 0.2
    ? { emoji: '⚡', text: 'Rychlé, riziko oscilace', color: 'var(--yellow)' }
    : { emoji: '✅', text: 'Optimální rozsah', color: 'var(--green)' }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <span style={{ fontSize: 42 }}>📈</span>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
            <span style={{ background: 'rgba(59,130,246,.18)', color: 'var(--blue)', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: '1px' }}>LEVEL 3</span>
            <h1 style={{ fontSize: 24, fontWeight: 900 }}>Trénování</h1>
          </div>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>
            Trénuj neuronovou síť na reálném datasetu a sleduj, jak klesá chybová funkce
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
        {/* Canvas */}
        <div className={styles.card} style={{ padding: 12 }}>
          <canvas ref={canvasRef} width={720} height={340}
            style={{ width: '100%', display: 'block' }} />
          {/* Epoch + acc bar */}
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text2)', flexShrink: 0 }}>Epocha {epoch}/{MAX_EPOCHS}</span>
            <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,.06)', borderRadius: 3 }}>
              <div style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg,var(--blue),var(--purple))', width: `${(epoch / MAX_EPOCHS) * 100}%`, transition: 'width .2s' }} />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Learning rate */}
          <div className={styles.card}>
            <div className={styles.sectionTitle}>🎓 Learning rate</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>Rychlost učení</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--blue)', fontFamily: '"JetBrains Mono",monospace' }}>{lr.toFixed(3)}</span>
            </div>
            <input type="range" min={0.001} max={0.8} step={0.001} value={lr} className="blue"
              onChange={e => setLr(parseFloat(e.target.value))} />
            <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(255,255,255,.04)', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{lrWarning.emoji}</span>
              <span style={{ color: lrWarning.color }}>{lrWarning.text}</span>
            </div>
          </div>

          {/* Stats */}
          <div className={styles.card}>
            <div className={styles.sectionTitle}>📊 Výsledky</div>
            {[
              { icon: '🎯', label: 'Přesnost',   val: `${lastAcc.toFixed(1)}%`, color: lastAcc > 80 ? 'var(--green)' : lastAcc > 50 ? 'var(--yellow)' : 'var(--text2)' },
              { icon: '📉', label: 'Loss',        val: lossRef.current.length ? lossRef.current[lossRef.current.length - 1].toFixed(4) : '—', color: 'var(--orange)' },
              { icon: '🏆', label: 'High Score',  val: `${highScore.toFixed(1)}%`, color: 'var(--yellow)' },
            ].map(({ icon, label, val, color }) => (
              <div key={label} className={styles.statRow}>
                <div className={styles.statLabel}><span>{icon}</span><span>{label}</span></div>
                <span className={styles.statValue} style={{ color }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
            onClick={startTraining}
            disabled={isTraining}
          >
            {isTraining
              ? <><span style={{ display: 'inline-block', animation: 'spin .8s linear infinite' }}>⚙️</span> Trénuji...</>
              : epoch > 0 ? '🔄 Trénovat znovu' : '🚀 Spustit trénování'
            }
          </button>

          <div className={styles.cardBlue} style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>
            💡 <strong style={{ color: 'var(--blue)' }}>Dataset:</strong> 12 bodů, 2 třídy. Síť 2→4→1, sigmoid aktivace, binární cross-entropy loss.
          </div>
        </div>
      </div>
    </div>
  )
}
