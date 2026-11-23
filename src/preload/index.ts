import { contextBridge, ipcRenderer } from 'electron'
import { AppConfig, AskRequest, ScreenShot, HotkeyAction, IPC, OverlayState } from '@shared/types'

const api = {
  getConfig: (): Promise<AppConfig> => ipcRenderer.invoke(IPC.getConfig),
  setConfig: (p: Partial<AppConfig>): Promise<AppConfig> => ipcRenderer.invoke(IPC.setConfig, p),
  getState: (): Promise<OverlayState> => ipcRenderer.invoke(IPC.getState),
  setOpacity: (v: number) => ipcRenderer.send(IPC.setOpacity, v),
  setClickThrough: (v: boolean) => ipcRenderer.send(IPC.setClickThrough, v),
  setFocusable: (v: boolean) => ipcRenderer.send(IPC.setFocusable, v),
  hoverInteractive: (v: boolean) => ipcRenderer.send(IPC.hoverInteractive, v),
  captureScreen: (): Promise<ScreenShot> => ipcRenderer.invoke(IPC.captureScreen),
  ask: (r: AskRequest) => ipcRenderer.send(IPC.askStart, r),
  cancelAsk: (id: string) => ipcRenderer.send(IPC.askCancel, id),
  onAsk: (cb: (e: { type: 'delta' | 'done' | 'error'; id: string; text?: string }) => void) => {
    const mk = (type: 'delta' | 'done' | 'error') => (_: unknown, p: { id: string; text?: string }) => cb({ type, ...p })
    const hs = { delta: mk('delta'), done: mk('done'), error: mk('error') }
    ipcRenderer.on(IPC.askDelta, hs.delta); ipcRenderer.on(IPC.askDone, hs.done); ipcRenderer.on(IPC.askError, hs.error)
    return () => {
      ipcRenderer.removeListener(IPC.askDelta, hs.delta)
      ipcRenderer.removeListener(IPC.askDone, hs.done)
      ipcRenderer.removeListener(IPC.askError, hs.error)
    }
  },
  detectQuestion: (t: string): Promise<boolean> => ipcRenderer.invoke(IPC.detectQuestion, t),
  openTestPlayer: (url: string) => ipcRenderer.send(IPC.openTestPlayer, url),
  hide: () => ipcRenderer.send(IPC.hide),
  quit: () => ipcRenderer.send(IPC.quit),
  onState: (cb: (s: OverlayState) => void) => {
    const h = (_: unknown, s: OverlayState) => cb(s)
    ipcRenderer.on(IPC.stateChanged, h)
    return () => ipcRenderer.removeListener(IPC.stateChanged, h)
  },
  onHotkey: (cb: (a: HotkeyAction) => void) => {
    const h = (_: unknown, a: HotkeyAction) => cb(a)
    ipcRenderer.on(IPC.hotkey, h)
    return () => ipcRenderer.removeListener(IPC.hotkey, h)
  }
}

contextBridge.exposeInMainWorld('api', api)
export type Api = typeof api
