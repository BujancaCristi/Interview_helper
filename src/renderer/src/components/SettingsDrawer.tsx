import { useEffect, useState } from 'react'
import type { AppConfig } from '@shared/types'

export default function SettingsDrawer({ onClose, onSaved }: { onClose: () => void; onSaved: (c: AppConfig) => void }) {
  const [c, setC] = useState<AppConfig | null>(null)
  useEffect(() => { window.api.getConfig().then(setC) }, [])
  if (!c) return null
  const set = <K extends keyof AppConfig>(k: K, v: AppConfig[K]) => setC({ ...c, [k]: v })
  const save = async () => { onSaved(await window.api.setConfig(c)); onClose() }

  const field = 'w-full rounded bg-white/10 px-2 py-1 text-xs outline-none focus:bg-white/15'
  const label = 'mt-2 mb-0.5 block text-[10px] uppercase tracking-wide text-zinc-400'

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-zinc-950/95">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <b className="text-xs">Settings</b>
        <div className="flex-1" />
        <button className="btn" onClick={save}>Save</button>
        <button className="btn" onClick={onClose}>Cancel</button>
      </div>
      <div className="flex-1 overflow-auto px-3 pb-3 select-text">
        <label className={label}>Anthropic API key</label>
        <input type="password" className={field} value={c.anthropicKey} onChange={(e) => set('anthropicKey', e.target.value)} />
        <label className={label}>Deepgram API key</label>
        <input type="password" className={field} value={c.deepgramKey} onChange={(e) => set('deepgramKey', e.target.value)} />

        <label className={label}>Models (default / deep / fast)</label>
        <div className="flex gap-1">
          <input className={field} value={c.modelDefault} onChange={(e) => set('modelDefault', e.target.value)} />
          <input className={field} value={c.modelDeep} onChange={(e) => set('modelDeep', e.target.value)} />
          <input className={field} value={c.modelFast} onChange={(e) => set('modelFast', e.target.value)} />
        </div>

        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          <label><input type="checkbox" checked={c.promptCaching} onChange={(e) => set('promptCaching', e.target.checked)} /> Prompt caching</label>
          <label><input type="checkbox" checked={c.deepMode} onChange={(e) => set('deepMode', e.target.checked)} /> Deep mode (Opus)</label>
          <label><input type="checkbox" checked={c.micEnabled} onChange={(e) => set('micEnabled', e.target.checked)} /> Capture mic</label>
          <label><input type="checkbox" checked={c.autoAnswer} onChange={(e) => set('autoAnswer', e.target.checked)} /> Auto-answer detected questions</label>
        </div>

        <label className={label}>Resume / CV</label>
        <textarea rows={6} className={field} value={c.resume} onChange={(e) => set('resume', e.target.value)} />
        <label className={label}>Job description</label>
        <textarea rows={5} className={field} value={c.jobDescription} onChange={(e) => set('jobDescription', e.target.value)} />
        <label className={label}>Custom rules</label>
        <textarea rows={3} className={field} placeholder="Concise bullets, bold key terms, STAR for behavioral, Python for coding"
          value={c.customPrompt} onChange={(e) => set('customPrompt', e.target.value)} />
      </div>
    </div>
  )
}
