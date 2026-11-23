import { AppConfig, AskRequest } from '@shared/types'
import { buildSystem, SCREEN_PROMPT } from './prompts'

type Block =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg'; data: string } }

function buildUserContent(req: AskRequest): Block[] {
  const blocks: Block[] = req.images.map((data) => ({
    type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data }
  }))
  const tx = req.transcript.trim()
  let text = ''
  if (req.kind === 'screen') text += SCREEN_PROMPT + '\n\n'
  if (tx) text += `Recent interview transcript (last ~30s):\n"""\n${tx}\n"""\n\n`
  if (req.kind === 'transcript') text += 'Answer the interviewer\'s most recent question from the transcript above.'
  if (req.text) text += `Question: ${req.text}`
  blocks.push({ type: 'text', text: text.trim() || 'Help me with what is on screen.' })
  return blocks
}

/** Streams a Messages API response, invoking onText per text delta. */
export async function streamAnswer(
  req: AskRequest, cfg: AppConfig, onText: (t: string) => void, signal: AbortSignal
): Promise<void> {
  if (!cfg.anthropicKey) throw new Error('Missing Anthropic API key (set it in the overlay).')
  const model = cfg.deepMode ? cfg.modelDeep : cfg.modelDefault

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': cfg.anthropicKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: cfg.deepMode ? 4096 : 2048,
      stream: true,
      system: buildSystem(cfg),
      messages: [{ role: 'user', content: buildUserContent(req) }]
    })
  })
  if (!res.ok || !res.body) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`)

  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let i: number
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const evt = buf.slice(0, i)
      buf = buf.slice(i + 2)
      const data = evt.split('\n').find((l) => l.startsWith('data: '))?.slice(6)
      if (!data) continue
      const j = JSON.parse(data)
      if (j.type === 'content_block_delta' && j.delta?.type === 'text_delta') onText(j.delta.text)
      else if (j.type === 'error') throw new Error(j.error?.message ?? 'stream error')
    }
  }
}

/** Fast Haiku check: is this utterance a question/prompt directed at the candidate? */
export async function detectQuestion(text: string, cfg: AppConfig): Promise<boolean> {
  if (!cfg.anthropicKey) return false
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': cfg.anthropicKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: cfg.modelFast,
      max_tokens: 3,
      system: 'You label interview transcript snippets. Reply only YES if the interviewer is asking the candidate a question or giving a task that needs an answer, otherwise NO.',
      messages: [{ role: 'user', content: text }]
    })
  })
  if (!res.ok) return false
  const j = await res.json()
  return /yes/i.test(j.content?.[0]?.text ?? '')
}
