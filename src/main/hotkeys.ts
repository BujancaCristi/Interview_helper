import { globalShortcut } from 'electron'
import { win, toggleVisible, setClickThrough, setFocusable, getState, nudge } from './overlay'
import { IPC, HotkeyAction } from '@shared/types'

const STEP = 40

const send = (a: HotkeyAction) => win?.webContents.send(IPC.hotkey, a)

export function registerHotkeys() {
  const map: Record<string, () => void> = {
    'CommandOrControl+Shift+H': toggleVisible,
    'CommandOrControl+Shift+S': () => send('read-screen'),
    'CommandOrControl+Shift+Space': () => send('generate-answer'),
    'CommandOrControl+Shift+C': () => send('clear'),
    'CommandOrControl+Shift+X': () => setClickThrough(!getState().clickThrough),
    'CommandOrControl+Shift+F': () => setFocusable(!getState().focusable),
    'CommandOrControl+Shift+Left': () => nudge(-STEP, 0),
    'CommandOrControl+Shift+Right': () => nudge(STEP, 0),
    'CommandOrControl+Shift+Up': () => nudge(0, -STEP),
    'CommandOrControl+Shift+Down': () => nudge(0, STEP)
  }
  for (const [accel, fn] of Object.entries(map)) {
    if (!globalShortcut.register(accel, fn)) console.warn(`Failed to register ${accel}`)
  }
}

export function unregisterHotkeys() {
  globalShortcut.unregisterAll()
}
