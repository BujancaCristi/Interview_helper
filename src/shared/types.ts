export interface AppConfig {
  opacity: number
  bounds: { x: number; y: number; width: number; height: number } | null
  anthropicKey: string
  deepgramKey: string
  resume: string
  jobDescription: string
  customPrompt: string
  deepMode: boolean
  promptCaching: boolean
  micEnabled: boolean
  autoAnswer: boolean
  modelDefault: string
  modelDeep: string
  modelFast: string
}

export const DEFAULT_CONFIG: AppConfig = {
  opacity: 0.85,
  bounds: null,
  anthropicKey: '',
  deepgramKey: '',
  resume: '',
  jobDescription: '',
  customPrompt: '',
  deepMode: false,
  promptCaching: true,
  micEnabled: false,
  autoAnswer: false,
  modelDefault: 'claude-sonnet-5-5',
  modelDeep: 'claude-opus-5-5',
  modelFast: 'claude-haiku-5-5'
}

export interface OverlayState {
  clickThrough: boolean
  focusable: boolean
  opacity: number
}

/** Hotkey actions broadcast from main -> renderer. */
export type HotkeyAction = 'read-screen' | 'generate-answer' | 'clear'

export const MODELS = {
  default: 'claude-sonnet-5-5',
  deep: 'claude-opus-5-5',
  fast: 'claude-haiku-5-5'
} as const

export interface AskRequest {
  id: string
  kind: 'screen' | 'transcript' | 'text'
  /** base64 JPEG images (no data: prefix) */
  images: string[]
  /** last ~30s of transcript */
  transcript: string
  /** typed question (test mode / follow-up) */
  text?: string
}

export interface ScreenShot { base64: string; width: number; height: number }

export const IPC = {
  captureScreen: 'screen:capture',
  detectQuestion: 'detect:question',
  openTestPlayer: 'test:open-player',
  askStart: 'ask:start',
  askCancel: 'ask:cancel',
  askDelta: 'ask:delta',
  askDone: 'ask:done',
  askError: 'ask:error',
  getConfig: 'config:get',
  setConfig: 'config:set',
  getState: 'overlay:get-state',
  setOpacity: 'overlay:set-opacity',
  setClickThrough: 'overlay:set-click-through',
  setFocusable: 'overlay:set-focusable',
  hoverInteractive: 'overlay:hover-interactive',
  hide: 'overlay:hide',
  quit: 'app:quit',
  stateChanged: 'overlay:state-changed',
  hotkey: 'hotkey'
} as const
