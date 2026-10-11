import { createHeroKeyScene } from '@/motion/hero-key/scene'
import type { HeroKeyScene } from '@/motion/hero-key/scene'
import type { CanvasSize, FromHeroWorker, ToHeroWorker } from './heroWorkerProtocol'

/**
 * Draws the hero scene on an OffscreenCanvas, off the page's main thread.
 * Starting WebGL (the context, the environment map, compiling shaders) runs
 * to hundreds of milliseconds on a mid-range phone; here none of it can hold
 * up a tap or a scroll. The page only sends frame numbers.
 */

// The DOM and WebWorker type libraries cannot share one program, so the
// little of the worker scope used here is typed by hand.
const scope = self as unknown as {
  postMessage(message: FromHeroWorker): void
  onmessage: ((event: MessageEvent<ToHeroWorker>) => void) | null
  requestAnimationFrame?: (callback: () => void) => number
}

let scene: HeroKeyScene | null = null
let frame = 0
let wave = 0
let scheduled = false
// Anything that arrives while the scene is still starting waits for it.
let pendingProps: Extract<ToHeroWorker, { type: 'props' }>['props'] | null = null
let pendingSize: CanvasSize | null = null

const draw = () => {
  scheduled = false
  scene?.render(frame, wave)
}

/** Frames can arrive faster than they draw; only the latest is drawn. */
const schedule = () => {
  if (scheduled) return
  scheduled = true
  if (scope.requestAnimationFrame) scope.requestAnimationFrame(draw)
  else setTimeout(draw, 0)
}

scope.onmessage = async ({ data }) => {
  switch (data.type) {
    case 'init':
      try {
        scene = await createHeroKeyScene(data.canvas, data.props, data.glyphs)
        const size = pendingSize ?? data.size
        scene.setSize(size.width, size.height, size.pixelRatio)
        if (pendingProps) scene.setProps(pendingProps)
        frame = data.frame
        scene.render(frame)
        scope.postMessage({ type: 'ready' })
      } catch (error) {
        scope.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) })
      }
      break
    case 'frame':
      frame = data.frame
      wave = data.wave
      schedule()
      break
    case 'props':
      if (!scene) pendingProps = data.props
      else {
        scene.setProps(data.props)
        schedule()
      }
      break
    case 'size':
      if (!scene) pendingSize = data.size
      else {
        scene.setSize(data.size.width, data.size.height, data.size.pixelRatio)
        // A resize clears the canvas, so draw again now rather than next frame.
        scene.render(frame, wave)
      }
      break
  }
}
