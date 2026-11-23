import { app, ipcMain, session, desktopCapturer, BrowserWindow } from 'electron'
import { createOverlay, setOpacity, setClickThrough, setFocusable, setHoverInteractive, hide, getState } from './overlay'
import { registerHotkeys, unregisterHotkeys } from './hotkeys'
import { loadConfig, saveConfig } from './store'
import { IPC, AskRequest } from '@shared/types'
import { captureActiveMonitor } from './services/capture'
import { streamAnswer, detectQuestion } from './services/anthropic'
import { win } from './overlay'

if (!app.requestSingleInstanceLock()) app.quit()

app.whenReady().then(() => {
  ipcMain.handle(IPC.getConfig, () => loadConfig())
  ipcMain.handle(IPC.setConfig, (_e, patch) => saveConfig(patch))
  ipcMain.handle(IPC.getState, () => getState())
  ipcMain.on(IPC.setOpacity, (_e, v: number) => setOpacity(v))
  ipcMain.on(IPC.setClickThrough, (_e, v: boolean) => setClickThrough(v))
  ipcMain.on(IPC.setFocusable, (_e, v: boolean) => setFocusable(v))
  ipcMain.on(IPC.hoverInteractive, (_e, v: boolean) => setHoverInteractive(v))
  ipcMain.on(IPC.hide, () => hide())
  ipcMain.on(IPC.quit, () => app.quit())

  ipcMain.handle(IPC.captureScreen, () => captureActiveMonitor())
  const inflight = new Map<string, AbortController>()
  ipcMain.on(IPC.askCancel, (_e, id: string) => inflight.get(id)?.abort())
  ipcMain.on(IPC.askStart, async (_e, req: AskRequest) => {
    const ac = new AbortController()
    inflight.set(req.id, ac)
    const send = (ch: string, text?: string) => win?.webContents.send(ch, { id: req.id, text })
    try {
      await streamAnswer(req, loadConfig(), (t) => send(IPC.askDelta, t), ac.signal)
      send(IPC.askDone)
    } catch (err) {
      if (ac.signal.aborted) send(IPC.askDone)
      else send(IPC.askError, err instanceof Error ? err.message : String(err))
    } finally {
      inflight.delete(req.id)
    }
  })

  // System-audio loopback (WASAPI) for getDisplayMedia in the renderer.
  session.defaultSession.setDisplayMediaRequestHandler(async (_req, cb) => {
    const sources = await desktopCapturer.getSources({ types: ['screen'] })
    cb({ video: sources[0], audio: 'loopback' })
  })
  session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(perm === 'media'))

  ipcMain.handle(IPC.detectQuestion, (_e, text: string) => detectQuestion(text, loadConfig()))

  // Test mode: a normal window (play a YouTube interview; loopback picks it up).
  ipcMain.on(IPC.openTestPlayer, (_e, url: string) => {
    const w = new BrowserWindow({ width: 900, height: 600, title: 'Test player', webPreferences: { partition: 'test-player' } })
    w.loadURL(/^https?:\/\//.test(url) ? url : 'https://www.youtube.com')
  })

  createOverlay()
  registerHotkeys()
})

app.on('will-quit', unregisterHotkeys)
app.on('window-all-closed', () => app.quit())
