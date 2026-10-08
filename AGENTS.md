# AGENTS.md

Bouncing-ball p5.js sketch with sound. Static site: no build system, package manager, tests, linter, or CI — the tracked repo is two files.

## Run it
- Open `index.html` in a browser, or serve this folder statically (HTTP is the most reliable way to test audio).
- Three scripts loaded in order in `index.html`: p5 2.3.4, p5.sound 0.4.1, then `sketch.js`. Keep that order — p5.sound patches the global `p5`. Offline opening fails (both libraries come from jsDelivr).
- Audio needs a user gesture: click/tap once to run `userStartAudio()`. Until then `sonar()` is a no-op and the sketch shows a "Haz clic para activar el sonido" hint. Do not remove the `mousePressed` / `touchStarted` handlers.

## Layout
- `index.html` — inline CSS reset (no margins, no scroll) so the canvas fills the window, plus a centered `#titulo` ("Pelotita loca") overlay. The title uses `pointer-events: none` on purpose: if you re-enable pointer events it will swallow the cursor and break the hover-to-go-crazy behavior.
- `sketch.js` — p5 global mode (`setup()` / `draw()`), Spanish comments. Key parts:
  - `actualizarFondo()` paints a single `colorFondo` recomputed every frame from three phase-shifted `sin()` waves, so it cycles smoothly through colors; `VELOCIDAD_FONDO` controls the speed.
  - `dibujarPelota()` draws the ball: radius `radioActual` (starts at `RADIO = 45`, smoothly eased toward `radioObjetivo`), a deterministic `noise()` grain texture (avoid `random()` there or it flickers), and a squash/stretch `scale()` driven by `deform` / `deformEje`.
  - `moverYRebotar()` is the physics: `velX` random ±, `velY` launched just hard enough to reach the top edge, gravity `velY += 0.3`. Bounces on all four edges use `radioActual`, not `RADIO` — the ball changes size, so collisions must follow it. Collisions also reflect the position (`pos = 2 * bound - pos`) so penetration doesn't inject energy. `RESTITUCION = 1` is a perfectly elastic bounce (no energy lost or gained, no air drag), so the ball bounces off the edges forever and never speeds up. `VEL_MAX = 40` is only a safety cap.
  - `reboteEfectos(velocidad, eje)` is the single per-bounce hook: new `colorPelota`, new `radioObjetivo` (`RADIO * random(0.72, 1.28)`), sets `deform` (squash) + `deformEje`, and plays the sound.
  - Hover = "crazy mode": touching the ball (`dist < radioActual`) sets `tiempoLoca = DURACION_LOCA` (120 frames); `moverLoca()` then moves at random 8–14 px/frame, flipping direction every 4–9 frames, with no gravity. Calms back when the timer expires.
  - Particles: `emitirParticulas()` spawns them at `mouseX` / `mouseY` (2/frame while moving, else 1; capped at `MAX_PARTICULAS = 600`); `actualizarParticulas()` removes them once `millis()` shows `VIDA_PARTICULA = 10000` ms and applies light gravity; `dibujarParticulas()` fades alpha across that lifetime. Lifetime uses `millis()`, not frame counts.
  - `windowResized()` resizes the canvas.

## p5.sound 0.4.1 API (differs from older p5.sound tutorials)
- `new p5.Oscillator('sine')` — a type string is auto-detected.
- Wiring: `osc.disconnect()`, `new p5.Envelope(a, d, s, r)`, `osc.connect(env)`, `osc.start()`. The envelope's output reaches the speakers by default.
- Trigger a note with **`env.play()` (no arguments)** plus `osc.freq(hz)`. The old 1.x forms `env.play(osc)`, `env.setInput(osc)`, `env.setRange(...)` behave differently here — don't copy them from old tutorials.
- `userStartAudio()` is a p5 global (provided by p5.sound) that resumes the AudioContext.

## Repo / environment gotchas
- This folder is its **own** git repo (`github.com/dbm-1701/pelota-que-rebota`) but physically lives inside a Local by Flywheel WordPress install (`app/public`). Run git commands from this directory; never commit surrounding WordPress files (`wp-admin`, `wp-content`, ...).
- Only `index.html` and `sketch.js` are tracked. Commit new assets here explicitly.
- No build step plus a root `index.html` means the repo can be served as-is (e.g. GitHub Pages).
- Comments and identifiers are in Spanish; this is a learning/class project ("trabajo-final").
