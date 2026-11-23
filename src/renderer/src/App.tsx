import { useCallback, useEffect, useRef, useState } from 'react'
import type { HotkeyAction, OverlayState } from '@shared/types'
import Markdown from './components/Markdown'
import TranscriptBar from './components/TranscriptBar'
import SettingsDrawer from './components/SettingsDrawer'
import { useTranscriber, type Segment } from './audio/useTranscriber'

export default function App() {
  const [state, setState] = useState<OverlayState>({ clickThrough: false, focusable: false, opacity: 0.85 })
  const rootRef = useRef<HTMLDivElement>(null)
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [shots, setShots] = useState<string[]>([])
  const [deep, setDeep] = useState(false)
  const [typed, setTyped] = useState('')
  const [mic, setMic] = useState(false)
  const [auto, setAuto] = useState(false)
  const [settings, setSettings] = useState(false)
  const autoRef = useRef(false)
  autoRef.current = auto
  const askRef = useRef<(k: 'screen' | 'transcript' | 'text', i: string[], t?: string) => void>(() => {})
  const tr = useTranscriber(async (seg: Segment) => {
    if (autoRef.current && seg.question && (await window.api.detectQuestion(seg.text))) askRef.current('transcript', [])
  })
  const trRef = useRef(tr)
  trRef.current = tr
  const curId = useRef('')
  const shotsRef = useRef<string[]>([])
  shotsRef.current = shots

  useEffect(() => {
    window.api.getConfig().then((c) => { setDeep(c.deepMode); setMic(c.micEnabled); setAuto(c.autoAnswer) })
    return window.api.onAsk((e) => {
      if (e.id !== curId.current) return
      if (e.type === 'delta') setAnswer((a) => a + (e.text ?? ''))
      else if (e.type === 'error') { setError(e.text ?? 'error'); setBusy(false) }
      else setBusy(false)
    })
  }, [])

  const ask = useCallback((kind: 'screen' | 'transcript' | 'text', images: string[], text?: string) => {
    if (curId.current) window.api.cancelAsk(curId.current)
    curId.current = crypto.randomUUID()
    setAnswer(''); setError(''); setBusy(true)
    window.api.ask({ id: curId.current, kind, images, transcript: trRef.current.recent(30), text })
  }, [])

  askRef.current = ask

  const addShot = useCallback(async () => {
    const s = await window.api.captureScreen()
    setShots((a) => [...a, s.base64])
    return s.base64
  }, [])

  const readScreen = useCallback(async () => {
    try {
      const cur = await window.api.captureScreen()
      const all = [...shotsRef.current, cur.base64]
      setShots([])
      ask('screen', all)
    } catch (e) { setError(String(e)) }
  }, [ask])

  const clear = useCallback(() => {
    if (curId.current) window.api.cancelAsk(curId.current)
    setAnswer(''); setError(''); setShots([]); setBusy(false); trRef.current.clear()
  }, [])

  const openSettings = (v: boolean) => { setSettings(v); window.api.setFocusable(v) }
  const toggleMic = () => { const v = !mic; setMic(v); window.api.setConfig({ micEnabled: v }); if (tr.running) { tr.stop(); tr.start(v) } }
  const toggleRun = () => (tr.running ? tr.stop() : tr.start(mic))
  const testSamples = [
    'Tell me about a time you resolved a conflict with a teammate.',
    'Given an array of integers, how would you find two numbers that sum to a target?',
    'How would you design a URL shortener that handles a hundred million requests a day?'
  ]

  const toggleDeep = () => { setDeep(!deep); window.api.setConfig({ deepMode: !deep }) }

  useEffect(() => {
    window.api.getState().then(setState)
    const off1 = window.api.onState(setState)
    const off2 = window.api.onHotkey((a: HotkeyAction) => {
      if (a === 'read-screen') readScreen()
      else if (a === 'generate-answer') ask('transcript', [])
      else clear()
    })
    return () => { off1(); off2() }
  }, [readScreen, ask, clear])

  // In click-through mode the window ignores the mouse (forwarding moves);
  // re-enable interaction only while hovering the control bar.
  const hover = (v: boolean) => state.clickThrough && window.api.hoverInteractive(v)

  return (
    <div ref={rootRef} className="h-full p-1">
      <div className="relative h-full flex flex-col rounded-xl border border-white/10 bg-zinc-950/90 shadow-2xl overflow-hidden">
        {/* Draggable top bar */}
        <div
          className="drag flex items-center gap-2 px-3 py-2 bg-zinc-900/90 border-b border-white/10"
          onMouseEnter={() => hover(true)}
          onMouseLeave={() => hover(false)}
        >
          <span className="text-xs font-semibold tracking-wide text-emerald-400">PARAKEET-WIN</span>
          <span className="text-[10px] text-zinc-400">
            {state.clickThrough ? 'click-through' : 'interactive'} · {state.focusable ? 'focusable' : 'no-focus'}
          </span>
          <div className="flex-1" />
          <div className="no-drag flex items-center gap-2">
            <input
              type="range" min={0.2} max={1} step={0.05} value={state.opacity}
              onChange={(e) => window.api.setOpacity(parseFloat(e.target.value))}
              className="w-20 accent-emerald-400" title="Opacity"
            />
            <button className="btn" onClick={() => window.api.setClickThrough(!state.clickThrough)}>Click-thru</button>
            <button className="btn" onClick={() => window.api.setFocusable(!state.focusable)}>Focus</button>
            <button className="btn" onClick={() => window.api.hide()}>Hide</button>
            <button className="btn" onClick={() => window.api.quit()}>✕</button>
          </div>
        </div>

        <div
          className="flex items-center gap-2 border-b border-white/10 px-3 py-1.5"
          onMouseEnter={() => hover(true)} onMouseLeave={() => hover(false)}
        >
          <button className="btn" onClick={readScreen}>Read Screen</button>
          <button className="btn" onClick={addShot}>Add Screenshot{shots.length ? ` (${shots.length})` : ''}</button>
          <button className="btn" onClick={() => ask('transcript', [])}>Answer</button>
          <button className="btn" onClick={clear}>Clear</button>
          <button className="btn" title="Open a normal window to play a YouTube interview" onClick={() => window.api.openTestPlayer('https://www.youtube.com/results?search_query=mock+technical+interview')}>Test ▶</button>
          <button className="btn" title="Inject a sample interviewer question" onClick={() => tr.inject(testSamples[Math.floor(Math.random() * testSamples.length)])}>Sample Q</button>
          <button className="btn" onClick={() => openSettings(true)}>⚙</button>
          <div className="flex-1" />
          <button className={`btn ${deep ? '!bg-amber-500/30' : ''}`} onClick={toggleDeep} title="claude-opus-5-5">
            Deep {deep ? 'ON' : 'off'}
          </button>
        </div>

        <div className="flex-1 overflow-auto p-3 select-text">
          {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
          {!answer && !busy && !error && (
            <p className="text-xs text-zinc-500">Ctrl+Shift+S read screen · Ctrl+Shift+Space answer · Ctrl+Shift+C clear</p>
          )}
          {busy && !answer && <p className="text-xs text-zinc-400 animate-pulse">Thinking…</p>}
          {answer && <Markdown text={answer} />}
        </div>

        <TranscriptBar
          segments={tr.segments} interim={tr.interim} running={tr.running} error={tr.error}
          micEnabled={mic} onToggleMic={toggleMic} onToggleRun={toggleRun}
        />

        <form
          className="border-t border-white/10 p-2"
          onMouseEnter={() => hover(true)} onMouseLeave={() => hover(false)}
          onSubmit={(e) => { e.preventDefault(); if (typed.trim()) { ask('text', [], typed.trim()); setTyped('') } }}
        >
          <input
            value={typed} onChange={(e) => setTyped(e.target.value)}
            placeholder="Type a question (test mode, needs focus: Ctrl+Shift+F)"
            className="w-full rounded bg-white/10 px-2 py-1 text-xs outline-none"
          />
        </form>
        {settings && (
          <SettingsDrawer
            onClose={() => openSettings(false)}
            onSaved={(c) => { setDeep(c.deepMode); setMic(c.micEnabled); setAuto(c.autoAnswer) }}
          />
        )}
      </div>
    </div>
  )
}
