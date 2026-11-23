import { useEffect, useRef, useState } from 'react'
import type { Segment, Speaker } from '../audio/useTranscriber'

interface Props {
  segments: Segment[]
  interim: Record<Speaker, string>
  running: boolean
  error: string
  micEnabled: boolean
  onToggleMic: () => void
  onToggleRun: () => void
}

export default function TranscriptBar({ segments, interim, running, error, micEnabled, onToggleMic, onToggleRun }: Props) {
  const [open, setOpen] = useState(true)
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView() }, [segments, interim, open])

  return (
    <div className="border-t border-white/10 bg-zinc-900/70">
      <div className="flex items-center gap-2 px-3 py-1">
        <button className="btn" onClick={() => setOpen(!open)}>{open ? '▾' : '▸'} Transcript</button>
        <button className={`btn ${running ? '!bg-emerald-500/30' : ''}`} onClick={onToggleRun}>{running ? '● Listening' : 'Listen'}</button>
        <button className={`btn ${micEnabled ? '!bg-sky-500/30' : ''}`} onClick={onToggleMic}>Mic {micEnabled ? 'on' : 'off'}</button>
        {error && <span className="truncate text-[10px] text-red-400" title={error}>{error}</span>}
      </div>
      {open && (
        <div className="max-h-28 overflow-auto px-3 pb-2 text-xs select-text">
          {segments.slice(-12).map((s) => (
            <p key={s.id} className={s.question ? 'rounded bg-amber-400/15 px-1 text-amber-200' : s.speaker === 'me' ? 'text-sky-300' : 'text-zinc-300'}>
              <b>{s.speaker === 'them' ? 'Them' : 'Me'}:</b> {s.text}
            </p>
          ))}
          {(['them', 'me'] as Speaker[]).map((sp) => interim[sp] && (
            <p key={sp} className="text-zinc-500 italic"><b>{sp === 'them' ? 'Them' : 'Me'}:</b> {interim[sp]}</p>
          ))}
          <div ref={endRef} />
        </div>
      )}
    </div>
  )
}
