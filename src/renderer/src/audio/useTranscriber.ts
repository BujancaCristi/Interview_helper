import { useCallback, useRef, useState } from 'react'
import { startCapture, type AudioSource } from './capture'
import { DeepgramStream } from './deepgram'

export type Speaker = 'them' | 'me'
export interface Segment { id: number; speaker: Speaker; text: string; ts: number; question: boolean }

export const looksLikeQuestion = (t: string) =>
  /\?\s*$/.test(t.trim()) ||
  /^(so\s+|and\s+|okay\s+)?(what|why|how|when|where|who|which|can you|could you|would you|do you|did you|have you|are you|tell me|walk me|explain|describe|give me|implement|write|design)\b/i.test(t.trim())

export function useTranscriber(onFinalThem: (s: Segment) => void) {
  const [segments, setSegments] = useState<Segment[]>([])
  const [interim, setInterim] = useState<Record<Speaker, string>>({ them: '', me: '' })
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const segs = useRef<Segment[]>([])
  const stops = useRef<(() => void)[]>([])
  const nextId = useRef(1)
  const cb = useRef(onFinalThem)
  cb.current = onFinalThem

  const stop = useCallback(() => {
    stops.current.forEach((f) => f())
    stops.current = []
    setRunning(false)
    setInterim({ them: '', me: '' })
  }, [])

  const start = useCallback(async (withMic: boolean) => {
    setError('')
    const cfg = await window.api.getConfig()
    if (!cfg.deepgramKey) return setError('Missing Deepgram API key (Settings).')
    const sources: [AudioSource, Speaker][] = [['system', 'them'], ...(withMic ? [['mic', 'me'] as [AudioSource, Speaker]] : [])]
    try {
      for (const [src, speaker] of sources) {
        let pending = ''
        const flush = () => {
          const text = pending.trim(); pending = ''
          setInterim((i) => ({ ...i, [speaker]: '' }))
          if (!text) return
          const seg: Segment = { id: nextId.current++, speaker, text, ts: Date.now(), question: speaker === 'them' && looksLikeQuestion(text) }
          segs.current = [...segs.current.slice(-200), seg]
          setSegments(segs.current)
          if (speaker === 'them') cb.current(seg)
        }
        const dg = new DeepgramStream(cfg.deepgramKey, {
          onError: setError,
          onText: (text, isFinal, speechFinal) => {
            if (text && isFinal) pending += ' ' + text
            if (speechFinal) return flush()
            if (text) setInterim((i) => ({ ...i, [speaker]: (pending + (isFinal ? '' : ' ' + text)).trim() }))
          }
        })
        const stopCap = await startCapture(src, (b) => dg.send(b))
        stops.current.push(() => { stopCap(); dg.close() })
      }
      setRunning(true)
    } catch (e) {
      stop()
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [stop])

  /** Last `sec` seconds of finalized transcript, labelled by speaker. */
  const recent = useCallback((sec = 30) => {
    const cutoff = Date.now() - sec * 1000
    return segs.current.filter((s) => s.ts >= cutoff)
      .map((s) => `${s.speaker === 'them' ? 'Interviewer' : 'Me'}: ${s.text}`).join('\n')
  }, [])

  const inject = useCallback((text: string) => {
    const seg: Segment = { id: nextId.current++, speaker: 'them', text, ts: Date.now(), question: looksLikeQuestion(text) }
    segs.current = [...segs.current, seg]
    setSegments(segs.current)
    cb.current(seg)
  }, [])

  const clear = useCallback(() => { segs.current = []; setSegments([]) }, [])

  return { segments, interim, running, error, start, stop, recent, clear, inject }
}
