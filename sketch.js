/*
Pelotita loca:
- Fondo de un solo color que va cambiando de forma continua.
- Pelota grande, con textura, que se deforma (squash) y cambia de tamano al rebotar.
- Pelota grande, con textura, que cae y rebota con fisica real (gravedad) en los 4 bordes.
- Cada rebote emite un sonido con p5.sound; el tono depende de la velocidad.
- El mouse suelta particulas que viven 10 segundos.
*/

const RADIO = 45;              // radio base de la pelota
const GRAVEDAD = 0.4;          // la hace caer: movimiento con fisica real
const AMORTIGUACION = 0.9;     // energia que conserva en cada rebote
const VEL_MAX = 18;            // tope de velocidad (evita que se dispare)
const RADIO_MAX = RADIO * 1.6; // tamano maximo al crecer en los rebotes
const RADIO_MIN = RADIO * 0.9; // tamano al reiniciar el ciclo de crecimiento
const VELOCIDAD_FONDO = 0.01;  // que tan rapido cambia el color del fondo
const VIDA_PARTICULA = 10000;  // ms que vive cada particula (10 s)
const MAX_PARTICULAS = 600;    // tope para no saturar el dibujo

let posX, posY, velX, velY;
let radioActual, radioObjetivo;
let colorPelota;
let colorFondo;
let sonidoListo = false;

// Deformacion (squash) al rebotar.
let deform = 0;        // 0 = redonda, hasta ~0.45 al golpear
let deformEje = "y";   // "y" = piso/techo, "x" = paredes

let particulas = [];

let osc, envolvente;

function setup() {
  createCanvas(windowWidth, windowHeight);

  posX = width / 2;
  posY = height / 2;
  velX = random([-1, 1]) * random(3, 6);
  velY = -random(11, 15); // lanzada hacia arriba con fuerza

  radioActual = RADIO;
  radioObjetivo = RADIO;

  colorPelota = color(255, 150, 0);
  colorFondo = color(0);

  // Sonido: un oscilador pasa por una envolvente (oscilador -> envolvente -> salida).
  osc = new p5.Oscillator('sine');
  osc.disconnect();
  envolvente = new p5.Envelope(0.005, 0.08, 0.02, 0.15);
  osc.connect(envolvente);
  osc.amp(0.6);
  osc.start();
}

function draw() {
  actualizarFondo();

  // El tamano y la deformacion vuelven suavemente a su estado normal.
  radioActual = lerp(radioActual, radioObjetivo, 0.2);
  deform = lerp(deform, 0, 0.2);

  moverYRebotar();

  emitirParticulas();
  actualizarParticulas();

  dibujarPelota();
  dibujarParticulas();

  if (!sonidoListo) {
    fill(255);
    textAlign(CENTER, CENTER);
    text('Haz clic para activar el sonido', width / 2, 30);
  }
}

function actualizarFondo() {
  // Un solo color que recorre suavemente la rueda de colores.
  let t = frameCount * VELOCIDAD_FONDO;
  colorFondo = color(
    120 + 100 * sin(t),
    120 + 100 * sin(t + TWO_PI / 3),
    120 + 100 * sin(t + 2 * TWO_PI / 3)
  );
  background(colorFondo);
}

function dibujarPelota() {
  // Squash & stretch segun el eje del ultimo impacto.
  let aplastado = 1 - deform;
  let estirado = 1 + deform * 0.5;
  let escalaX = deformEje === "x" ? aplastado : estirado;
  let escalaY = deformEje === "y" ? aplastado : estirado;

  push();
  translate(posX, posY);
  scale(escalaX, escalaY);

  // Borde oscuro para que resalte sobre el fondo neon.
  stroke(0, 70);
  strokeWeight(3);
  fill(colorPelota);
  circle(0, 0, radioActual * 2);

  // Textura: grano determinista (usa noise, asi no parpadea).
  noStroke();
  const cr = red(colorPelota);
  const cg = green(colorPelota);
  const cb = blue(colorPelota);
  const paso = 4;
  for (let gx = -radioActual + paso / 2; gx < radioActual; gx += paso) {
    for (let gy = -radioActual + paso / 2; gy < radioActual; gy += paso) {
      if (gx * gx + gy * gy > (radioActual - 2) * (radioActual - 2)) continue;
      let n = noise((gx + 300) * 0.09, (gy + 300) * 0.09);
      let brillo = map(n, 0, 1, -70, 70);
      fill(cr + brillo, cg + brillo, cb + brillo, 150);
      circle(gx, gy, paso + 0.5);
    }
  }

  pop();
}

function moverYRebotar() {
  // Fisica real: la gravedad la hace caer y los rebotes conservan parte de la fuerza.
  posX += velX;
  posY += velY;
  velY += GRAVEDAD;

  if (posY > height - radioActual) { // piso
    posY = 2 * (height - radioActual) - posY;
    velY = -abs(velY) * AMORTIGUACION;
    if (abs(velY) < 5) velY = -random(7, 12); // que no se quede muerta
    reboteEfectos(abs(velY), "y");
  }

  if (posY < radioActual) { // techo
    posY = 2 * radioActual - posY;
    velY = abs(velY) * AMORTIGUACION;
    reboteEfectos(abs(velY), "y");
  }

  if (posX < radioActual) { // pared izquierda
    posX = 2 * radioActual - posX;
    velX = abs(velX) * AMORTIGUACION;
    if (abs(velX) < 2) velX = random(3, 6); // sigue rebotando en los lados
    reboteEfectos(abs(velX), "x");
  }

  if (posX > width - radioActual) { // pared derecha
    posX = 2 * (width - radioActual) - posX;
    velX = -abs(velX) * AMORTIGUACION;
    if (abs(velX) < 2) velX = -random(3, 6);
    reboteEfectos(abs(velX), "x");
  }

  velX = constrain(velX, -VEL_MAX, VEL_MAX);
  velY = constrain(velY, -VEL_MAX, VEL_MAX);
}

// Al chocar con un borde: cambia color y tamano, se deforma y suena.
function reboteEfectos(velocidad, eje) {
  cambiarColor();
  // En cada borde crece un poco; al llegar al maximo, reinicia el ciclo.
  radioObjetivo *= random(1.05, 1.1);
  if (radioObjetivo > RADIO_MAX) radioObjetivo = RADIO_MIN;
  deform = constrain(velocidad / 6, 0, 1) * 0.45;
  deformEje = eje;
  sonar(velocidad);
}

function cambiarColor() {
  colorPelota = color(random(100, 255), random(100, 255), random(100, 255));
}

// ------------------- Sistema de particulas -------------------

// Salen de la posicion del mouse y viven VIDA_PARTICULA (10 s).
function emitirParticulas() {
  if (particulas.length >= MAX_PARTICULAS) return;
  // Mas cantidad cuando el mouse se mueve.
  let seMovio = mouseX !== pmouseX || mouseY !== pmouseY;
  let cuantas = seMovio ? 2 : 1;
  for (let i = 0; i < cuantas; i++) {
    particulas.push({
      x: mouseX,
      y: mouseY,
      vx: random(-3, 3),
      vy: random(-3, 1),
      tam: random(3, 9),
      col: color(random(100, 255), random(100, 255), random(100, 255)),
      nacimiento: millis()
    });
  }
}

function actualizarParticulas() {
  let ahora = millis();
  for (let i = particulas.length - 1; i >= 0; i--) {
    let p = particulas[i];
    if (ahora - p.nacimiento >= VIDA_PARTICULA) {
      particulas.splice(i, 1); // murio a los 10 s
      continue;
    }
    p.vy += 0.08;      // caen un poco
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.99;
    p.vy *= 0.99;
  }
}

function dibujarParticulas() {
  noStroke();
  let ahora = millis();
  for (let p of particulas) {
    let t = (ahora - p.nacimiento) / VIDA_PARTICULA; // 0 (nace) .. 1 (muere)
    fill(red(p.col), green(p.col), blue(p.col), 255 * (1 - t));
    circle(p.x, p.y, p.tam * (1 - t * 0.5));
  }
}

function sonar(velocidad) {
  if (!sonidoListo) return;
  let frecuencia = map(velocidad, 0, VEL_MAX, 150, 900, true);
  osc.freq(frecuencia, 0.01);
  envolvente.play();
}

// Los navegadores necesitan un gesto del usuario para habilitar el audio.
function activarSonido() {
  if (!sonidoListo) {
    userStartAudio();
    sonidoListo = true;
  }
}

function mousePressed() {
  activarSonido();
  return false;
}

function touchStarted() {
  activarSonido();
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
