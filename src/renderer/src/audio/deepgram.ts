export interface DgEvents {
  onText: (text: string, isFinal: boolean, speechFinal: boolean) => void
  onError: (msg: string) => void
}

/** Deepgram live WebSocket (linear16, 16kHz mono). */
export class DeepgramStream {
  private ws: WebSocket
  private queue: ArrayBuffer[] = []
  private open = false

  constructor(key: string, private ev: DgEvents) {
    const qs = new URLSearchParams({
      model: 'nova-2', language: 'en-US', encoding: 'linear16', sample_rate: '16000', channels: '1',
      interim_results: 'true', smart_format: 'true', punctuate: 'true', endpointing: '400', utterance_end_ms: '1200'
    })
    this.ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${qs}`, ['token', key])
    this.ws.onopen = () => { this.open = true; this.queue.forEach((b) => this.ws.send(b)); this.queue = [] }
    this.ws.onmessage = (m) => {
      try {
        const j = JSON.parse(m.data)
        if (j.type === 'UtteranceEnd') return ev.onText('', true, true)
        const t: string = j.channel?.alternatives?.[0]?.transcript ?? ''
        if (j.type === 'Results') ev.onText(t, !!j.is_final, !!j.speech_final)
      } catch { /* ignore */ }
    }
    this.ws.onerror = () => ev.onError('Deepgram connection error (check key/network)')
    this.ws.onclose = (e) => { if (e.code !== 1000 && e.code !== 1005) ev.onError(`Deepgram closed (${e.code}) ${e.reason}`) }
  }

  send(b: ArrayBuffer) {
    if (this.open) this.ws.send(b)
    else if (this.queue.length < 100) this.queue.push(b)
  }

  close() {
    try {
      if (this.open) this.ws.send(JSON.stringify({ type: 'CloseStream' }))
      this.ws.close(1000)
    } catch { /* ignore */ }
  }
}
