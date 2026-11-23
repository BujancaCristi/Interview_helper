import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { AppConfig, DEFAULT_CONFIG } from '@shared/types'

let cache: AppConfig | null = null
const file = () => join(app.getPath('userData'), 'config.json')

export function loadConfig(): AppConfig {
  if (cache) return cache
  try {
    cache = { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(file(), 'utf8')) }
  } catch {
    cache = { ...DEFAULT_CONFIG }
  }
  return cache!
}

export function saveConfig(patch: Partial<AppConfig>): AppConfig {
  cache = { ...loadConfig(), ...patch }
  mkdirSync(app.getPath('userData'), { recursive: true })
  writeFileSync(file(), JSON.stringify(cache, null, 2))
  return cache
}
