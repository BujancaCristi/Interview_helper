import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { loadConfig, saveConfig } from './store'
import { IPC, OverlayState } from '@shared/types'

export let win: BrowserWindow | null = null

const state: OverlayState = { clickThrough: false, focusable: false, opacity: 0.85 }
let hoverInteractive = false

export function getState(): OverlayState {
  return { ...state }
}

function emit() {
  win?.webContents.send(IPC.stateChanged, getState())
}

export function createOverlay(): BrowserWindow {
  const cfg = loadConfig()
  state.opacity = cfg.opacity
  const wa = screen.getPrimaryDisplay().workArea
  const b = cfg.bounds ?? { width: 520, height: 640, x: wa.x + wa.width - 540, y: wa.y + 40 }

  win = new BrowserWindow({
    ...b,
    minWidth: 320,
    minHeight: 200,
    frame: false,
    transparent: true,
    resizable: true,
    hasShadow: false,
    skipTaskbar: true,       // hidden from taskbar (and Alt+Tab for tool windows)
    alwaysOnTop: true,
    focusable: false,        // never steals focus; toggle with Ctrl+Shift+F to type
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  })

  // Excluded from capture (WDA_EXCLUDEFROMCAPTURE on Win10 2004+/Win11)
  win.setContentProtection(true)
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.setOpacity(state.opacity)
  win.setMenuBarVisibility(false)

  win.once('ready-to-show', () => win?.showInactive())
  win.webContents.on('did-finish-load', emit)

  const persist = () => {
    if (win && !win.isDestroyed()) saveConfig({ bounds: win.getBounds() })
  }
  win.on('moved', persist)
  win.on('resized', persist)
  win.on('closed', () => (win = null))

  if (process.env['ELECTRON_RENDERER_URL']) win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else win.loadFile(join(__dirname, '../renderer/index.html'))
  return win
}

export function toggleVisible() {
  if (!win) return
  if (win.isVisible()) win.hide()
  else win.showInactive()
}

export function hide() {
  win?.hide()
}

export function setOpacity(v: number) {
  state.opacity = Math.min(1, Math.max(0.2, v))
  win?.setOpacity(state.opacity)
  saveConfig({ opacity: state.opacity })
  emit()
}

function applyMouse() {
  if (!win) return
  // Click-through: ignore mouse but still forward move events so the renderer
  // can re-enable interaction when hovering real controls.
  if (state.clickThrough && !hoverInteractive) win.setIgnoreMouseEvents(true, { forward: true })
  else win.setIgnoreMouseEvents(false)
}

export function setClickThrough(v: boolean) {
  state.clickThrough = v
  hoverInteractive = false
  applyMouse()
  emit()
}

export function setHoverInteractive(v: boolean) {
  hoverInteractive = v
  applyMouse()
}

export function setFocusable(v: boolean) {
  state.focusable = v
  win?.setFocusable(v)
  if (v) win?.focus()
  emit()
}

export function nudge(dx: number, dy: number) {
  if (!win) return
  const [x, y] = win.getPosition()
  win.setPosition(x + dx, y + dy)
}
