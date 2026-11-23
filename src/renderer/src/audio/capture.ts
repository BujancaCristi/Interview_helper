import workletUrl from './pcm-worklet.js?url'

export type AudioSource = 'system' | 'mic'

/** Starts capturing one source; calls onPcm with 16kHz mono Int16 chunks. Returns stop(). */
export async function startCapture(source: AudioSource, onPcm: (b: ArrayBuffer) => void): Promise<() => void> {
  let stream: MediaStream
  if (source === 'system') {
    // Main process grants audio:'loopback' (Windows WASAPI) via setDisplayMediaRequestHandler.
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
    stream.getVideoTracks().forEach((t) => { t.stop(); stream.removeTrack(t) })
    if (!stream.getAudioTracks().length) throw new Error('No system audio track available')
  } else {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 }
    })
  }
  const ctx = new AudioContext({ sampleRate: 16000 })
  await ctx.audioWorklet.addModule(workletUrl)
  const src = ctx.createMediaStreamSource(stream)
  const node = new AudioWorkletNode(ctx, 'pcm-worklet')
  node.port.onmessage = (e) => onPcm(e.data)
  src.connect(node) // not connected to destination: no echo/feedback
  return () => {
    node.port.onmessage = null
    src.disconnect(); node.disconnect()
    stream.getTracks().forEach((t) => t.stop())
    ctx.close()
  }
}
