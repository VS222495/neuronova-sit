'use client'

import { useState, useRef } from 'react'
import styles from './shared.module.css'

interface Props {
  addXP: (n: number) => void
  playSound: (t: string) => void
}

interface Question {
  q:       string
  answers: string[]
  correct: number
  explain: string
  emoji:   string
}

const QUESTIONS: Question[] = [
  {
    q:       'Co je aktivační funkce v neuronové síti?',
    emoji:   '⚡',
    answers: [
      'Funkce pro zapnutí počítače',
      'Matematická funkce přidávající nelinearitu do výpočtu',
      'Způsob inicializace vah sítě',
      'Algoritmus pro načítání dat',
    ],
    correct: 1,
    explain: 'Aktivační funkce (ReLU, Sigmoid…) zavádí nelinearitu. Bez ní by celá síť fungovala jen jako lineární transformace a nedokázala by se naučit složité vzory.',
  },
  {
    q:       'Co je "gradient descent" (gradientní sestup)?',
    emoji:   '📉',
    answers: [
      'Typ aktivační funkce',
      'Způsob inicializace neuronové sítě',
      'Optimalizační algoritmus minimalizující chybovou funkci',
      'Metoda normalizace vstupních dat',
    ],
    correct: 2,
    explain: 'Gradientní sestup iterativně upravuje váhy sítě ve směru záporného gradientu chybové funkce — "sestupuje" po povrchu chyby k minimu.',
  },
  {
    q:       'Jaký problém řeší "overfitting" (přeučení)?',
    emoji:   '🎭',
    answers: [
      'Síť trénuje příliš pomalu',
      'Váhy sítě jsou příliš malé',
      'Síť se zapamatovala trénovací data a špatně generalizuje na nová',
      'Síť nemá dostatek parametrů pro daný problém',
    ],
    correct: 2,
    explain: 'Přeučení nastane, když síť "nazpaměť" zná trénovací data místo obecných vzorů. Projevuje se nízkou chybou na tréninku, ale vysokou chybou na nových datech. Řeší se dropout, regularizací nebo více daty.',
  },
  {
    q:       'K čemu slouží algoritmus backpropagation?',
    emoji:   '🔙',
    answers: [
      'K vizualizaci struktury sítě',
      'K výpočtu gradientů pomocí řetízkového pravidla',
      'K augmentaci trénovacích dat',
      'K inicializaci vah sítě',
    ],
    correct: 1,
    explain: 'Backpropagation prochází sítí zpětně a pomocí řetízkového pravidla diferenciálního počtu vypočítá gradient chybové funkce vůči každé váze. Tyto gradienty pak použije gradient descent.',
  },
  {
    q:       'Proč se Softmax používá na výstupu klasifikační sítě?',
    emoji:   '🎯',
    answers: [
      'Zrychluje výpočet dopředného průchodu',
      'Prevence přeučení sítě',
      'Normalizuje vstupní data',
      'Převádí výstupy na pravděpodobnosti, které se sečtou na 1',
    ],
    correct: 3,
    explain: 'Softmax transformuje libovolná čísla (logity) na pravděpodobnostní rozdělení — každý výstup je v rozsahu (0, 1) a suma všech výstupů je 1. Ideální pro vícetřídní klasifikaci.',
  },
]

const TOTAL_XP = 50 // max XP from quiz

export default function QuizTab({ addXP, playSound }: Props) {
  const [qIdx,      setQIdx]      = useState(0)
  const [selected,  setSelected]  = useState<number | null>(null)
  const [answered,  setAnswered]  = useState<boolean[]>(Array(QUESTIONS.length).fill(false))
  const [correct,   setCorrect]   = useState<boolean[]>(Array(QUESTIONS.length).fill(false))
  const [done,      setDone]      = useState(false)
  const [cardAnim,  setCardAnim]  = useState('')
  const xpGiven = useRef(false)

  const q      = QUESTIONS[qIdx]
  const score  = correct.filter(Boolean).length
  const isAns  = answered[qIdx]
  const wasOk  = correct[qIdx]

  const handleAnswer = (i: number) => {
    if (isAns) return
    const ok    = i === q.correct
    const newAns = [...answered]; newAns[qIdx] = true
    const newCor = [...correct];  newCor[qIdx] = ok
    setSelected(i)
    setAnswered(newAns)
    setCorrect(newCor)
    playSound(ok ? 'correct' : 'wrong')
    if (ok) addXP(10)
    setCardAnim(ok ? styles.flashGreen : styles.shake)
    setTimeout(() => setCardAnim(''), 700)
  }

  const handleNext = () => {
    if (qIdx < QUESTIONS.length - 1) {
      setCardAnim(styles.slideIn)
      setQIdx(q => q + 1)
      setSelected(null)
      setTimeout(() => setCardAnim(''), 400)
    } else {
      setDone(true)
      if (!xpGiven.current) {
        addXP(TOTAL_XP - score * 10) // bonus XP
        xpGiven.current = true
      }
    }
  }

  const restart = () => {
    setQIdx(0); setSelected(null)
    setAnswered(Array(QUESTIONS.length).fill(false))
    setCorrect(Array(QUESTIONS.length).fill(false))
    setDone(false)
    xpGiven.current = false
  }

  const shareText = `Dokončil/a jsem NeuronQuest kvíz s výsledkem ${score}/${QUESTIONS.length}! 🧠⚡ #NeuronQuest`

  const handleShare = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(shareText)
    alert('Výsledek zkopírován do schránky!\n\n' + shareText)
  }

  if (done) {
    const pct = Math.round(score / QUESTIONS.length * 100)
    const grade = score === 5 ? { txt: 'Perfektní!', emoji: '🏆', color: 'var(--yellow)' }
      : score >= 3 ? { txt: 'Výborně!',  emoji: '🎉', color: 'var(--green)' }
      : { txt: 'Zkus to znovu', emoji: '💪', color: 'var(--purple)' }

    return (
      <div style={{ animation: 'bounce-in .5s ease', maxWidth: 560, margin: '40px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 80, marginBottom: 16 }}>{grade.emoji}</div>
        <h2 style={{ fontSize: 36, fontWeight: 900, color: grade.color, marginBottom: 8 }}>{grade.txt}</h2>
        <p style={{ color: 'var(--text2)', fontSize: 16, marginBottom: 32 }}>
          Odpověděl/a jsi správně na <strong style={{ color: 'var(--text)' }}>{score} z {QUESTIONS.length}</strong> otázek
        </p>

        {/* Score circle */}
        <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto 32px' }}>
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="68" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="12" />
            <circle cx="80" cy="80" r="68" fill="none"
              stroke={grade.color} strokeWidth="12"
              strokeDasharray={`${pct * 4.27} 427`}
              strokeLinecap="round"
              transform="rotate(-90 80 80)"
              style={{ filter: `drop-shadow(0 0 8px ${grade.color})` }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 42, fontWeight: 900, color: grade.color, fontFamily: '"JetBrains Mono",monospace' }}>{pct}%</span>
          </div>
        </div>

        {/* Per-question recap */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
          {QUESTIONS.map((question, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: correct[i] ? 'rgba(0,255,136,.07)' : 'rgba(239,68,68,.07)',
              border: `1px solid ${correct[i] ? 'rgba(0,255,136,.25)' : 'rgba(239,68,68,.25)'}`,
              borderRadius: 10, padding: '10px 14px', textAlign: 'left',
            }}>
              <span style={{ fontSize: 18 }}>{correct[i] ? '✅' : '❌'}</span>
              <span style={{ fontSize: 13, color: 'var(--text2)', flex: 1 }}>{question.q}</span>
              <span style={{ fontSize: 11, color: correct[i] ? 'var(--green)' : 'var(--red)', fontWeight: 700, flexShrink: 0 }}>
                {correct[i] ? '+10 XP' : '0 XP'}
              </span>
            </div>
          ))}
        </div>

        {/* Co jsi se naučil/a */}
        <div style={{
          textAlign: 'left', marginBottom: 28,
          background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 16, padding: '20px 24px',
        }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: 'var(--text)' }}>
            🎓 Co jsi se naučil/a
          </div>
          {[
            { emoji: '🧠', title: 'Neuronová síť', text: 'Je matematický model inspirovaný mozkem. Skládá se z vrstev neuronů, které si předávají signál — jako štafeta. Čím více vrstev, tím komplexnější vzory dokáže rozpoznat.' },
            { emoji: '⚡', title: 'Aktivační funkce (ReLU)', text: 'Říká neuronu: záporné hodnoty vypni, kladné pusť dál. Díky ní se síť dokáže naučit nelineární vzory — třeba rozlišit psa od kočky, nebo spam od normálního emailu.' },
            { emoji: '📉', title: 'Gradient descent', text: 'Optimalizační algoritmus, který síť učí. Představ si kopec — gradient descent hledá nejnižší bod (nejmenší chybu) tím, že po kopci krůček po krůčku sestupuje dolů.' },
            { emoji: '🎭', title: 'Overfitting (přeučení)', text: 'Síť se „naučila nazpaměť" místo toho, aby pochopila obecné vzory. Řeší se dropout (náhodné vypínání neuronů při tréninku) nebo více trénovacích dat.' },
            { emoji: '🎯', title: 'Softmax', text: 'Finální vrstva klasifikační sítě. Převádí čísla na procenta (pravděpodobnosti). Takhle ti YouTube říká: „90 % šance, že se ti tohle video líbí." — a má pravdu 😄' },
          ].map(({ emoji, title, text }) => (
            <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{emoji}</span>
              <div>
                <strong style={{ fontSize: 13, color: 'var(--text)', display: 'block', marginBottom: 3 }}>{title}</strong>
                <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{text}</span>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(0,255,136,.07)', border: '1px solid rgba(0,255,136,.2)', borderRadius: 10, fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
            🚀 <strong style={{ color: 'var(--green)' }}>Co dál?</strong> Zkus si zahrát s architekturou sítě v Levelu 1,
            sleduj jak ReLU mění aktivace v Levelu 2, a pohrej si s learning rate v Levelu 3.
            Reálné sítě jako GPT nebo Tesla Autopilot fungují na stejných principech — jen ve větším! 💪
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={restart}
            style={{ padding: '12px 28px' }}>
            🔄 Zkusit znovu
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleShare}
            style={{ padding: '12px 28px' }}>
            📤 Sdílet výsledek
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <span style={{ fontSize: 42 }}>🎯</span>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
            <span style={{ background: 'rgba(249,115,22,.18)', color: 'var(--orange)', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: '1px' }}>BOSS LEVEL 4</span>
            <h1 style={{ fontSize: 24, fontWeight: 900 }}>Kvíz</h1>
          </div>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>
            Otestuj své znalosti! Každá správná odpověď = +10 XP
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>Otázka {qIdx + 1} z {QUESTIONS.length}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {QUESTIONS.map((_, i) => (
              <div key={i} style={{
                width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                background: i < qIdx
                  ? (correct[i] ? 'rgba(0,255,136,.2)' : 'rgba(239,68,68,.2)')
                  : i === qIdx ? 'rgba(249,115,22,.2)' : 'rgba(255,255,255,.05)',
                border: `2px solid ${i < qIdx ? (correct[i] ? 'rgba(0,255,136,.6)' : 'rgba(239,68,68,.6)') : i === qIdx ? 'rgba(249,115,22,.7)' : 'rgba(255,255,255,.1)'}`,
                color: i === qIdx ? 'var(--orange)' : 'var(--text2)',
              }}>
                {i < qIdx ? (correct[i] ? '✓' : '✗') : i + 1}
              </div>
            ))}
          </div>
        </div>
        <div className={styles.progressBar} style={{ height: 5 }}>
          <div className={styles.progressFill} style={{
            width: `${((qIdx) / QUESTIONS.length) * 100}%`,
            background: 'linear-gradient(90deg,var(--orange),var(--yellow))',
          }} />
        </div>
      </div>

      {/* Question card */}
      <div className={`${styles.card} ${cardAnim}`} style={{
        marginBottom: 16,
        border: isAns
          ? `1px solid ${wasOk ? 'rgba(0,255,136,.35)' : 'rgba(239,68,68,.35)'}`
          : '1px solid rgba(249,115,22,.25)',
        maxWidth: 740,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
          <span style={{ fontSize: 36, flexShrink: 0 }}>{q.emoji}</span>
          <h2 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.4 }}>{q.q}</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {q.answers.map((ans, i) => {
            const isCorrectAns = i === q.correct
            const isSelected   = selected === i
            let bg = 'rgba(255,255,255,.04)', border = '1px solid rgba(255,255,255,.08)', color = 'var(--text)'

            if (isAns) {
              if (isCorrectAns) {
                bg = 'rgba(0,255,136,.12)'; border = '1px solid rgba(0,255,136,.5)'; color = 'var(--green)'
              } else if (isSelected && !isCorrectAns) {
                bg = 'rgba(239,68,68,.12)'; border = '1px solid rgba(239,68,68,.5)'; color = 'var(--red)'
              }
            }

            return (
              <button key={i}
                onClick={() => handleAnswer(i)}
                disabled={isAns}
                style={{
                  background: bg, border, color,
                  borderRadius: 12, padding: '14px 16px',
                  cursor: isAns ? 'default' : 'pointer',
                  textAlign: 'left', fontSize: 14, lineHeight: 1.4,
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  transition: 'all .2s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => { if (!isAns) (e.currentTarget.style.background = 'rgba(255,255,255,.08)') }}
                onMouseLeave={e => { if (!isAns) (e.currentTarget.style.background = 'rgba(255,255,255,.04)') }}
              >
                <span style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: isAns && isCorrectAns ? 'rgba(0,255,136,.3)' : isAns && isSelected ? 'rgba(239,68,68,.3)' : 'rgba(255,255,255,.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, color: isAns && isCorrectAns ? 'var(--green)' : isAns && isSelected ? 'var(--red)' : 'var(--text2)',
                }}>
                  {isAns && isCorrectAns ? '✓' : isAns && isSelected && !isCorrectAns ? '✗' : String.fromCharCode(65 + i)}
                </span>
                <span>{ans}</span>
              </button>
            )
          })}
        </div>

        {/* Explanation */}
        {isAns && (
          <div style={{
            marginTop: 16, padding: '12px 16px',
            background: wasOk ? 'rgba(0,255,136,.07)' : 'rgba(239,68,68,.07)',
            border: `1px solid ${wasOk ? 'rgba(0,255,136,.25)' : 'rgba(239,68,68,.25)'}`,
            borderRadius: 10, fontSize: 14, color: 'var(--text2)', lineHeight: 1.6,
            animation: 'fade-in .4s ease',
          }}>
            <strong style={{ color: wasOk ? 'var(--green)' : 'var(--red)' }}>
              {wasOk ? '✅ Správně! +10 XP' : '❌ Špatně'}
            </strong>
            {' — '}{q.explain}
          </div>
        )}
      </div>

      {/* Next button */}
      {isAns && (
        <div style={{ animation: 'fade-in .3s ease', maxWidth: 740 }}>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleNext}
            style={{ padding: '14px 32px', fontSize: 15 }}
          >
            {qIdx < QUESTIONS.length - 1 ? 'Další otázka →' : '🏁 Zobrazit výsledky'}
          </button>
        </div>
      )}
    </div>
  )
}
