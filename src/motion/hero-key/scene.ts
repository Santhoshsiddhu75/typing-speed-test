import {
  BackSide,
  BufferGeometry,
  Color,
  DataTexture,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  InstancedBufferAttribute,
  InstancedMesh,
  LinearFilter,
  LinearMipmapLinearFilter,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  PMREMGenerator,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { HeroAspect, HeroKeyColors, HeroKeyProps } from './types'
import { COMPOSITION_SIZE, LOGO } from './constants'
import { KEY_SLOTS, SPACE } from './layout'
import { stateAt } from './timeline'
import { clamp01, lerp } from './easing'
import { luminance, over, parseColor, toHex } from './colors'
import { ATLAS } from './glyphs'
import type { GlyphAtlas } from './glyphs'
import { keyboardShadow, softKey, softSpot } from './textures'
import { litAt, waveStrength } from './wave'
import {
  LOGO_KEY,
  PLAIN,
  logoBody,
  logoFace,
  logoOutline,
  logoT,
  logoUnderside,
  paint,
  plainKey,
} from './geometry'

/**
 * The hero scene: the TapTest logo key as a 3D object, and the keyboard it
 * belongs to. Plain three.js, so it costs one library on the page.
 *
 * `render(frame, waveSeconds)` is the only way anything moves, and it draws
 * a pure function of those and the props. The frame is the story; the
 * seconds are the light wave's own clock, counted from when the keyboard
 * came up. It touches no DOM, so it runs on an
 * OffscreenCanvas in a worker as well as on a page's own canvas.
 *
 * To render it to video later, wrap it in a Remotion composition: a <canvas>
 * sized to COMPOSITION_SIZE; behind a delayRender, loadGlyphFont and
 * drawGlyphAtlas, then this; then render(useCurrentFrame()) in an effect.
 */
export interface HeroKeyScene {
  render(frame: number, waveSeconds?: number): void
  setProps(props: HeroKeyProps): void
  /** CSS size of the canvas, and the pixel ratio to draw it at. */
  setSize(width: number, height: number, pixelRatio: number): void
  dispose(): void
}

/** Every key floats this high at rest, and a full press travels it to the ground. */
const REST = 0.07
const TRAVEL = 0.07
const LETTER_SIZE = 0.44
const rad = (deg: number) => (deg * Math.PI) / 180

const LETTER_VERTEX = /* glsl */ `
  attribute vec2 aCell;
  uniform vec2 uGrid;
  varying vec2 vUv;
  varying vec3 vColor;
  void main() {
    // The atlas is stored top row first; a quad's uv runs bottom to top.
    vUv = vec2((uv.x + aCell.x) / uGrid.x, (aCell.y + 1.0 - uv.y) / uGrid.y);
    #ifdef USE_INSTANCING_COLOR
      vColor = instanceColor;
    #else
      vColor = vec3(1.0);
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`

/**
 * The wave's backlight: a soft green pool on the ground under a key, which
 * shows round its edges as it lights. Each key's brightness is its own.
 */
const BACKLIGHT_VERTEX = /* glsl */ `
  attribute float aLit;
  varying vec2 vUv;
  varying float vLit;
  void main() {
    vUv = uv;
    vLit = aLit;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`

const BACKLIGHT_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uStrength;
  varying vec2 vUv;
  varying float vLit;
  void main() {
    float alpha = texture2D(uMap, vUv).a * vLit * uStrength;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(uColor, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const LETTER_FRAGMENT = /* glsl */ `
  uniform sampler2D uAtlas;
  varying vec2 vUv;
  varying vec3 vColor;
  void main() {
    float alpha = texture2D(uAtlas, vUv).a;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(vColor, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

/**
 * Ends the current task. Start-up is a handful of heavy steps (the WebGL
 * context, the environment, the geometry, the shaders); run back to back
 * they block the page for hundreds of milliseconds on a mid-range phone.
 * Between steps the browser gets to answer input and paint.
 */
function breathe(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler
  return scheduler?.yield ? scheduler.yield() : new Promise((resolve) => setTimeout(resolve, 0))
}

/** A flat vertex colour, so pieces of one colour share a shader with painted ones. */
function plain(geometry: BufferGeometry): BufferGeometry {
  const count = geometry.getAttribute('position').count
  geometry.setAttribute('color', new Float32BufferAttribute(new Float32Array(count * 3).fill(1), 3))
  return geometry
}

/** The page's tokens, resolved to what the scene needs. */
function resolveColors(colors: HeroKeyColors) {
  const background = parseColor(colors.background)
  const keycapA = over(parseColor(colors.keycapA), background)
  const keycapB = over(parseColor(colors.keycapB), background)
  const shadow = parseColor(colors.keycapShadow)
  return {
    dark: luminance(background) < 0.2,
    primary: new Color(toHex(over(parseColor(colors.primary), background))),
    faceA: new Color(toHex(keycapA)),
    faceB: new Color(toHex(keycapB)),
    // Each painted where CSS paints it: the border and the letter over the
    // key's face, the edge (a box-shadow) over the page.
    border: new Color(toHex(over(parseColor(colors.keycapBorder), keycapA))),
    letter: new Color(toHex(over(parseColor(colors.keycapLetter), keycapB))),
    edge: new Color(toHex(over(parseColor(colors.keycapEdge), background))),
    // Shadows stay translucent: they darken whatever is under them.
    shadow: new Color(toHex(shadow)),
    shadowAlpha: shadow.a,
  }
}

export async function createHeroKeyScene(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  initial: HeroKeyProps,
  glyphs: GlyphAtlas
): Promise<HeroKeyScene> {
  await breathe()

  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true })
  renderer.setClearColor(0x000000, 0)
  renderer.toneMapping = NeutralToneMapping
  renderer.localClippingEnabled = true
  await breathe()

  // Soft reflections from a procedural room: nothing to download. A 64px
  // cube is plenty for matte keys and a light clearcoat, and a quarter of
  // the default's work four times over.
  const scene = new Scene()
  const pmrem = new PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const environment = pmrem.fromScene(room, 0.04, 0.1, 100, { size: 64 }).texture
  room.dispose()
  pmrem.dispose()
  scene.environment = environment
  await breathe()

  const camera = new PerspectiveCamera(30, 1, 0.5, 120)

  // A key light from the top left, and a soft fill so nothing goes black.
  const keyLight = new DirectionalLight(0xffffff, 1.4)
  keyLight.position.set(-4, 7, 4)
  const fill = new HemisphereLight(0xffffff, 0x8a9399, 0.35)
  scene.add(keyLight, fill)

  // Keys rise out of the ground: anything below it is cut away.
  const ground = new Plane(new Vector3(0, 1, 0), 0)

  // ---- The logo key -------------------------------------------------------

  // The body, the underside and the T share one shader: every shader is
  // compiled on the phone, and each one costs start-up time.
  const logo = new Group()
  const outline = new Mesh(logoOutline(LOGO_KEY.outline), new MeshBasicMaterial({ color: LOGO.outline, side: BackSide }))
  // Behind the outline and a little larger, so only a thin rim of it shows.
  const keyline = new Mesh(
    logoOutline(LOGO_KEY.outline + LOGO_KEY.keyline),
    new MeshBasicMaterial({ color: LOGO.keyline, side: BackSide })
  )
  const underside = new Mesh(
    plain(logoUnderside()),
    new MeshStandardMaterial({ vertexColors: true, color: LOGO.underside, roughness: 0.55 })
  )
  const bodyMaterial = new MeshStandardMaterial({ vertexColors: true, roughness: 0.72 })
  const body = new Mesh(logoBody(), bodyMaterial)
  body.position.y = LOGO_KEY.underside.height
  paint(body.geometry, [new Color(LOGO.wall), new Color(LOGO.face), new Color(LOGO.well)])

  const facePivot = new Group()
  const faceMaterial = new MeshPhysicalMaterial({
    color: LOGO.face,
    roughness: 0.32,
    clearcoat: 0.6,
    clearcoatRoughness: 0.22,
  })
  const face = new Mesh(logoFace(), faceMaterial)
  const tMaterial = new MeshStandardMaterial({ vertexColors: true, color: LOGO.t, roughness: 0.42 })
  const t = new Mesh(plain(logoT()), tMaterial)
  facePivot.add(face, t)
  logo.add(keyline, outline, underside, body, facePivot)
  scene.add(logo)

  // Given the environment directly rather than through the scene, so their
  // intensity can be set apart from the keyboard's.
  const logoMaterials = [faceMaterial, bodyMaterial, tMaterial, underside.material as MeshStandardMaterial]
  for (const m of logoMaterials) m.envMap = environment

  const tRest = new Color(LOGO.t)
  const tPressed = new Color(LOGO.tPressed)
  const faceTop = LOGO_KEY.underside.height + LOGO_KEY.height
  // Sunk all the way, the face's edge has to clear the bottom of the well.
  const faceSunkScale = (LOGO_KEY.well.half - 0.003) / LOGO_KEY.face.half
  await breathe()

  // ---- The keyboard -------------------------------------------------------

  const keyMaterial = new MeshStandardMaterial({ vertexColors: true, roughness: 0.5, clippingPlanes: [ground] })
  const keyGeometry = plainKey(1)
  const keys = new InstancedMesh(keyGeometry, keyMaterial, KEY_SLOTS.length)
  keys.frustumCulled = false
  // An instance of one, so it shares the keys' shader.
  const spaceGeometry = plainKey(SPACE.width)
  const space = new InstancedMesh(spaceGeometry, keyMaterial, 1)
  space.frustumCulled = false
  scene.add(keys, space)

  await breathe()
  const atlas = new DataTexture(glyphs.data, glyphs.width, glyphs.height, RGBAFormat)
  atlas.generateMipmaps = true
  atlas.minFilter = LinearMipmapLinearFilter
  atlas.magFilter = LinearFilter
  atlas.anisotropy = renderer.capabilities.getMaxAnisotropy()
  atlas.needsUpdate = true
  const cellOf = (letter: string) => glyphs.cells[letter] ?? [0, 0]
  const letterGeometry = new PlaneGeometry(1, 1)
  letterGeometry.rotateX(-Math.PI / 2)
  letterGeometry.setAttribute(
    'aCell',
    new InstancedBufferAttribute(new Float32Array(KEY_SLOTS.flatMap((slot) => cellOf(slot.letter))), 2)
  )
  const letterMaterial = new ShaderMaterial({
    uniforms: { uAtlas: { value: atlas }, uGrid: { value: new Vector2(ATLAS.cols, ATLAS.rows) } },
    vertexShader: LETTER_VERTEX,
    fragmentShader: LETTER_FRAGMENT,
    transparent: true,
    depthWrite: false,
  })
  const letters = new InstancedMesh(letterGeometry, letterMaterial, KEY_SLOTS.length)
  letters.frustumCulled = false
  letters.renderOrder = 4
  KEY_SLOTS.forEach((_, i) => letters.setColorAt(i, new Color()))
  scene.add(letters)

  // ---- Shadows and the green light ----------------------------------------

  const flat = () => {
    const g = new PlaneGeometry(1, 1)
    g.rotateX(-Math.PI / 2)
    return g
  }
  const spotTexture = softSpot()
  const logoShadow = new Mesh(flat(), new MeshBasicMaterial({ map: spotTexture, transparent: true, depthWrite: false }))
  logoShadow.position.y = 0.002
  logoShadow.renderOrder = 2

  const glowTexture = softSpot(0.6)
  const glow = new Mesh(flat(), new MeshBasicMaterial({ map: glowTexture, transparent: true, depthWrite: false }))
  glow.position.y = 0.003
  glow.renderOrder = 3

  const boardShadowMaterial = new MeshBasicMaterial({ transparent: true, depthWrite: false })
  const boardShadow = new Mesh(flat(), boardShadowMaterial)
  boardShadow.position.y = 0.001
  boardShadow.renderOrder = 1
  scene.add(logoShadow, glow, boardShadow)

  // One backlight per key, and one for the space bar, all in one draw.
  const backlitTexture = softKey()
  const backlitGeometry = flat()
  const backlitLit = new InstancedBufferAttribute(new Float32Array(KEY_SLOTS.length + 1), 1)
  backlitGeometry.setAttribute('aLit', backlitLit)
  const backlitMaterial = new ShaderMaterial({
    uniforms: { uMap: { value: backlitTexture }, uColor: { value: new Color() }, uStrength: { value: 0.4 } },
    vertexShader: BACKLIGHT_VERTEX,
    fragmentShader: BACKLIGHT_FRAGMENT,
    transparent: true,
    depthWrite: false,
  })
  const backlit = new InstancedMesh(backlitGeometry, backlitMaterial, KEY_SLOTS.length + 1)
  backlit.frustumCulled = false
  backlit.renderOrder = 3
  KEY_SLOTS.forEach((slot, i) => backlit.setMatrixAt(i, new Matrix4().makeScale(1.5, 1, 1.5).setPosition(slot.x, 0.004, slot.z)))
  scene.add(backlit)

  let shadowTexture: Texture | null = null

  // ---- Props --------------------------------------------------------------

  let props = initial
  let colors = resolveColors(props.colors)
  const letterColour = new Color()
  const matrix = new Matrix4()
  const scale = new Vector3()
  const position = new Vector3()
  const hidden = new Matrix4().makeScale(0, 0, 0)

  function applyProps(next: HeroKeyProps, previousAspect: HeroAspect | null) {
    props = next
    colors = resolveColors(next.colors)

    // CSS draws the keycap face with linear-gradient(165deg, a, b): a at the
    // top left, b at the bottom right. The top of the screen is the back of
    // the key, and the gradient spans each key's own face, as it spans each
    // element in CSS.
    const facePaint = (halfWidth: number) => (x: number, z: number) => {
      const dx = 0.259
      const dz = 0.966
      const reach = halfWidth * dx + PLAIN.top * dz
      const g = clamp01(0.5 + (x * dx + z * dz) / (2 * reach))
      return colors.faceA.clone().lerp(colors.faceB, g)
    }
    paint(keyGeometry, [colors.edge, colors.border, facePaint(PLAIN.top)])
    paint(spaceGeometry, [colors.edge, colors.border, facePaint(PLAIN.top + (SPACE.width - 1) / 2)])

    // On the dark ground the logo's dark outline disappears; a thin green
    // keyline outside it keeps the key's edge.
    keyline.visible = colors.dark

    // Light softens in the dark; the logo key keeps the logo's own white.
    keyLight.intensity = colors.dark ? 0.85 : 1.4
    fill.intensity = colors.dark ? 0.2 : 0.35
    scene.environmentIntensity = colors.dark ? 0.5 : 0.85
    for (const m of logoMaterials) m.envMapIntensity = colors.dark ? 1.35 : 0.85

    const shadowMaterial = logoShadow.material as MeshBasicMaterial
    shadowMaterial.color.copy(colors.shadow)
    boardShadowMaterial.color.copy(colors.shadow)
    ;(glow.material as MeshBasicMaterial).color.copy(colors.primary)
    backlitMaterial.uniforms.uColor.value.copy(colors.primary)
    // Subtle on the light ground, a little more on the dark, where a
    // backlit keyboard reads as light rather than tint.
    backlitMaterial.uniforms.uStrength.value = colors.dark ? 0.55 : 0.4

    if (next.aspect !== previousAspect) {
      const withSpace = next.aspect === 'square'
      space.visible = withSpace
      const { texture, bounds } = keyboardShadow(withSpace)
      shadowTexture?.dispose()
      shadowTexture = texture
      boardShadowMaterial.map = texture
      boardShadowMaterial.needsUpdate = true
      boardShadow.position.set((bounds.minX + bounds.maxX) / 2, 0.001, (bounds.minZ + bounds.maxZ) / 2)
      boardShadow.scale.set(bounds.maxX - bounds.minX, 1, bounds.maxZ - bounds.minZ)

      const spaceLight = new Matrix4().makeScale(withSpace ? SPACE.width + 1.6 : 0, 1, withSpace ? 1.5 : 0)
      backlit.setMatrixAt(KEY_SLOTS.length, spaceLight.setPosition(SPACE.x, 0.004, SPACE.z))
      backlit.instanceMatrix.needsUpdate = true

      const size = COMPOSITION_SIZE[next.aspect]
      camera.aspect = size.width / size.height
    }
  }

  await breathe()
  applyProps(initial, null)

  function render(frame: number, waveSeconds = 0) {
    const state = stateAt(frame, props.aspect, props.framing)
    const wave = waveStrength(frame, waveSeconds)

    const { azimuth, elevation, distance, target, roll, fov } = state.camera
    const az = rad(azimuth)
    const el = rad(elevation)
    camera.position.set(
      target[0] + distance * Math.cos(el) * Math.sin(az),
      target[1] + distance * Math.sin(el),
      target[2] + distance * Math.cos(el) * Math.cos(az)
    )
    camera.up.set(0, 1, 0)
    camera.lookAt(target[0], target[1], target[2])
    camera.rotateZ(rad(roll))
    camera.fov = fov
    camera.updateProjectionMatrix()
    // A lens shift: the picture moves within the frame, the view does not.
    camera.projectionMatrix.elements[8] -= state.camera.shift[0]
    camera.projectionMatrix.elements[9] -= state.camera.shift[1]
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()

    // The logo key: travels down as it presses, and its face sinks into the
    // well and narrows with it, as in logopress.png.
    const press = state.logo.press
    const sink = clamp01(press)
    logo.position.y = REST + state.logo.lift - TRAVEL * press
    logo.rotation.y = rad(state.logo.yaw)
    facePivot.position.y = faceTop - LOGO_KEY.well.depth * sink
    const faceScale = lerp(1, faceSunkScale, sink)
    facePivot.scale.set(faceScale, 1, faceScale)
    tMaterial.color.lerpColors(tRest, tPressed, sink)

    const lifted = clamp01(state.logo.lift / 3.4)
    logoShadow.scale.setScalar(1.55 * (1 + 0.6 * lifted))
    ;(logoShadow.material as MeshBasicMaterial).opacity =
      colors.shadowAlpha * 1.5 * Math.pow(1 - lifted, 2.2) * (1 + 0.25 * sink)

    glow.visible = state.glow > 0.002
    glow.scale.setScalar(1.3 + 1.3 * state.glow)
    ;(glow.material as MeshBasicMaterial).opacity = (colors.dark ? 0.26 : 0.3) * state.glow

    // The keyboard, and the light wave across it once it is up.
    KEY_SLOTS.forEach((slot, i) => {
      const y = REST + state.keys[i].rise
      matrix.makeTranslation(slot.x, y, slot.z)
      keys.setMatrixAt(i, matrix)

      const top = y + PLAIN.height
      if (top < 0.004) {
        letters.setMatrixAt(i, hidden)
      } else {
        position.set(slot.x, top + 0.003, slot.z)
        scale.setScalar(LETTER_SIZE)
        matrix.makeScale(scale.x, scale.y, scale.z).setPosition(position)
        letters.setMatrixAt(i, matrix)
      }
      const lit = wave > 0 ? wave * litAt(slot.x, slot.x, waveSeconds) : 0
      letterColour.lerpColors(colors.letter, colors.primary, lit)
      letters.setColorAt(i, letterColour)
      backlitLit.setX(i, lit)
    })
    keys.instanceMatrix.needsUpdate = true
    letters.instanceMatrix.needsUpdate = true
    if (letters.instanceColor) letters.instanceColor.needsUpdate = true

    if (state.space) {
      matrix.makeTranslation(SPACE.x, REST + state.space.rise, SPACE.z)
      space.setMatrixAt(0, matrix)
      space.instanceMatrix.needsUpdate = true
    }
    // The space bar lights along its whole length as the band passes it.
    const reach = SPACE.width / 2 - PLAIN.half
    backlitLit.setX(KEY_SLOTS.length, state.space && wave > 0 ? wave * litAt(SPACE.x - reach, SPACE.x + reach, waveSeconds) : 0)
    backlitLit.needsUpdate = true
    backlit.visible = wave > 0.001

    boardShadow.visible = state.keyboardShadow > 0.002
    boardShadowMaterial.opacity = colors.shadowAlpha * 1.6 * state.keyboardShadow

    renderer.render(scene, camera)
  }

  await breathe()

  // Compile every shader up front, off the main thread where the browser
  // allows, so the first scrolled frame does not stall on it. Then upload
  // the textures, each in its own task, for the same reason.
  await renderer.compileAsync(scene, camera)
  for (const texture of [environment, atlas, spotTexture, glowTexture, backlitTexture, shadowTexture]) {
    await breathe()
    if (texture) renderer.initTexture(texture)
  }
  await breathe()

  return {
    render,
    setProps: (next) => applyProps(next, props.aspect),
    setSize(width, height, pixelRatio) {
      renderer.setPixelRatio(pixelRatio)
      renderer.setSize(width, height, false)
    },
    dispose() {
      scene.traverse((object) => {
        if (object instanceof Mesh) {
          object.geometry.dispose()
          const material = object.material as MeshBasicMaterial
          material.dispose()
        }
      })
      for (const texture of [environment, atlas, spotTexture, glowTexture, backlitTexture, shadowTexture]) texture?.dispose()
      renderer.dispose()
    },
  }
}
