import { desktopCapturer, screen } from 'electron'
import type { ScreenShot } from '@shared/types'

const MAX_WIDTH = 1920

/** Silently capture the monitor under the cursor, downscale and JPEG-encode. */
export async function captureActiveMonitor(): Promise<ScreenShot> {
  const d = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: Math.round(d.size.width * d.scaleFactor), height: Math.round(d.size.height * d.scaleFactor) }
  })
  const src = sources.find((s) => s.display_id === String(d.id)) ?? sources[0]
  if (!src) throw new Error('No screen source available')
  let img = src.thumbnail
  if (img.getSize().width > MAX_WIDTH) img = img.resize({ width: MAX_WIDTH, quality: 'best' })
  const { width, height } = img.getSize()
  return { base64: img.toJPEG(80).toString('base64'), width, height }
}
