import type { GlyphAtlas, HeroKeyProps } from '@/motion/hero-key'
import type { CanvasSize, FromHeroWorker, ToHeroWorker } from './heroWorkerProtocol'

/**
 * Where the hero scene draws. In a worker where the browser can run WebGL on
 * an OffscreenCanvas (Chrome, Firefox, Safari 17 and later), so its start-up
 * never blocks the page; on the main thread otherwise. The page drives both
 * the same way.
 */
export type HeroEngineKind = 'worker' | 'main'

export interface HeroEngine {
  /**
   * Draws a story frame, with the light wave at `wave` seconds. Settings
   * changes redraw the current one by themselves.
   */
  render(frame: number, wave: number): void
  setProps(props: HeroKeyProps): void
  setSize(size: CanvasSize): void
  dispose(): void
}

interface Start {
  canvas: HTMLCanvasElement
  props: HeroKeyProps
  glyphs: GlyphAtlas
  size: CanvasSize
  frame: number
  /** Something broke after the first frame was drawn. */
  onLost: () => void
}

function startInWorker({ canvas, props, glyphs, size, frame, onLost }: Start): Promise<HeroEngine> {
  // One-way: after this the page can no longer draw on this canvas itself.
  const offscreen = canvas.transferControlToOffscreen()
  const worker = new Worker(new URL('./heroWorker.ts', import.meta.url), { type: 'module' })
  const send = (message: ToHeroWorker, transfer: Transferable[] = []) => worker.postMessage(message, transfer)

  return new Promise((resolve, reject) => {
    let ready = false
    const fail = (message: string) => {
      worker.terminate()
      if (ready) onLost()
      else reject(new Error(message))
    }
    worker.onmessage = ({ data }: MessageEvent<FromHeroWorker>) => {
      if (data.type === 'error') return fail(data.message)
      ready = true
      resolve({
        render: (f, w) => send({ type: 'frame', frame: f, wave: w }),
        setProps: (p) => send({ type: 'props', props: p }),
        setSize: (s) => send({ type: 'size', size: s }),
        dispose: () => worker.terminate(),
      })
    }
    worker.onerror = (event) => {
      event.preventDefault()
      fail(event.message || 'The hero worker failed')
    }
    send({ type: 'init', canvas: offscreen, props, glyphs, size, frame }, [offscreen, glyphs.data.buffer])
  })
}

async function startOnMainThread({ canvas, props, glyphs, size, frame, onLost }: Start): Promise<HeroEngine> {
  // Only browsers that need it download three.js into the page itself.
  const { createHeroKeyScene } = await import('@/motion/hero-key/scene')
  const scene = await createHeroKeyScene(canvas, props, glyphs)
  let current = frame
  let wave = 0
  scene.setSize(size.width, size.height, size.pixelRatio)
  scene.render(current)

  const onContextLost = (event: Event) => {
    event.preventDefault()
    onLost()
  }
  canvas.addEventListener('webglcontextlost', onContextLost)

  return {
    render(f, w) {
      current = f
      wave = w
      scene.render(f, w)
    },
    setProps(p) {
      scene.setProps(p)
      scene.render(current, wave)
    },
    setSize(s) {
      scene.setSize(s.width, s.height, s.pixelRatio)
      scene.render(current, wave)
    },
    dispose() {
      canvas.removeEventListener('webglcontextlost', onContextLost)
      scene.dispose()
    },
  }
}

export function startHeroEngine(kind: HeroEngineKind, start: Start): Promise<HeroEngine> {
  return kind === 'worker' ? startInWorker(start) : startOnMainThread(start)
}
