import * as T from 'three';
const $ = id => document.getElementById(id);
const PI2 = Math.PI * 2;
const scene = new T.Scene();
scene.background = new T.Color(0x8fd3ff);
scene.fog = new T.Fog(0x8fd3ff, 40, 110);
const cam = new T.PerspectiveCamera(65, 1, .1, 200);
const ren = new T.WebGLRenderer({ antialias: true });
ren.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.prepend(ren.domElement);
function rs() { ren.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
addEventListener('resize', rs); rs();
scene.add(new T.HemisphereLight(0xffffff, 0x557755, 1.1));
const sun = new T.DirectionalLight(0xffffff, 1.2); sun.position.set(20, 40, 10); scene.add(sun);
const M = c => new T.MeshLambertMaterial({ color: c });

// ---- World ----
const gr = new T.Mesh(new T.PlaneGeometry(90, 90), M(0x6b7280)); gr.rotation.x = -PI2 / 4; scene.add(gr);
const grid = new T.GridHelper(90, 45, 0x4b5563, 0x4b5563); grid.position.y = .01; scene.add(grid);
// ramp rises toward local +z; yaw rotates it
const ramps = [
  { x: 0, z: 10, w: 6, l: 8, h: 2.2, yaw: 0, c: 0xf97316 },
  { x: -14, z: 0, w: 6, l: 7, h: 1.6, yaw: -PI2 / 4, c: 0x22c55e },
  { x: 14, z: -6, w: 6, l: 7, h: 1.6, yaw: PI2 / 4, c: 0x3b82f6 },
  { x: -6, z: -10, w: 4, l: 5, h: 1.2, yaw: PI2 / 2, c: 0xeab308 },
  { x: 16, z: 18, w: 8, l: 8, h: 1, flat: true, c: 0xa855f7 },
  { x: -18, z: 20, w: 8, l: 6, h: .8, flat: true, c: 0xec4899 },
];
const rails = [{ x: -10, z: -18, len: 14, ax: 0, y: .8 }, { x: 8, z: 28, len: 12, ax: 1, y: .8 }];
for (const r of ramps) {
  let g;
  if (r.flat) g = new T.BoxGeometry(r.w, r.h, r.l).translate(0, r.h / 2, 0);
  else {
    const s = new T.Shape(); s.moveTo(-r.l / 2, 0); s.lineTo(r.l / 2, 0); s.lineTo(r.l / 2, r.h);
    g = new T.ExtrudeGeometry(s, { depth: r.w, bevelEnabled: false }).translate(0, 0, -r.w / 2).rotateY(-PI2 / 4);
  }
  const m = new T.Mesh(g, M(r.c)); m.position.set(r.x, 0, r.z); m.rotation.y = r.yaw || 0; scene.add(m);
}
for (const r of rails) {
  const m = new T.Mesh(new T.CylinderGeometry(.07, .07, r.len, 8), M(0xe5e7eb));
  m.rotation.z = PI2 / 4; if (r.ax) m.rotation.set(PI2 / 4, 0, 0);
  m.position.set(r.x, r.y, r.z); scene.add(m);
  for (const s of [-1, 1]) {
    const l = new T.Mesh(new T.BoxGeometry(.12, r.y, .12), M(0x374151));
    l.position.set(r.x + (r.ax ? 0 : s * r.len / 2.2), r.y / 2, r.z + (r.ax ? s * r.len / 2.2 : 0)); scene.add(l);
  }
}
function heightAt(x, z) {
  let h = 0;
  for (const r of ramps) {
    const dx = x - r.x, dz = z - r.z, c = Math.cos(r.yaw || 0), s = Math.sin(r.yaw || 0);
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    if (Math.abs(lx) < r.w / 2 && Math.abs(lz) < r.l / 2) h = Math.max(h, r.flat ? r.h : r.h * (lz / r.l + .5));
  }
  return h;
}

// ---- Bike & rider (original low-poly) ----
const B = new T.Group(); B.rotation.order = 'YXZ'; scene.add(B);
for (const z of [-.55, .55]) {
  const w = new T.Mesh(new T.TorusGeometry(.35, .06, 8, 18), M(0x111827)); w.rotation.y = PI2 / 4; w.position.set(0, .35, z); B.add(w);
}
const add = (g, c, x, y, z, rx = 0) => { const m = new T.Mesh(g, M(c)); m.position.set(x, y, z); m.rotation.x = rx; B.add(m); return m; };
add(new T.BoxGeometry(.07, .07, 1.1), 0xff5a1f, 0, .7, 0);
add(new T.BoxGeometry(.5, .06, .06), 0x9ca3af, 0, 1.05, .5);
add(new T.BoxGeometry(.3, .6, .25), 0x2563eb, 0, 1.2, -.1, .3);
add(new T.BoxGeometry(.18, .5, .18), 0x1f2937, 0, .85, -.15);
add(new T.SphereGeometry(.17, 10, 8), 0xfcd34d, 0, 1.68, .02);
add(new T.SphereGeometry(.19, 10, 8, 0, PI2, 0, PI2 / 4), 0xef4444, 0, 1.72, .02);

// ---- Input ----
const inp = { x: 0, y: 0, j: 0, s: 0, f: 0, jp: 0 };
const keys = {};
addEventListener('keydown', e => { keys[e.code] = 1; if (e.code === 'Space') inp.jp = 1; });
addEventListener('keyup', e => keys[e.code] = 0);
const pad = $('pad'), knob = $('knob'); let o = null;
pad.addEventListener('pointerdown', e => { pad.setPointerCapture(e.pointerId); o = { x: e.clientX, y: e.clientY }; knob.style.display = 'block'; knob.style.left = e.clientX - 45 + 'px'; knob.style.top = e.clientY - 45 - (innerHeight - pad.offsetHeight) + 'px'; });
pad.addEventListener('pointermove', e => { if (!o) return; inp.x = Math.max(-1, Math.min(1, (e.clientX - o.x) / 50)); inp.y = Math.max(-1, Math.min(1, -(e.clientY - o.y) / 50)); });
const endPad = () => { o = null; inp.x = inp.y = 0; knob.style.display = 'none'; };
pad.addEventListener('pointerup', endPad); pad.addEventListener('pointercancel', endPad);
for (const [id, k] of [['bj', 'j'], ['bs', 's'], ['bf', 'f']]) {
  const b = $(id);
  b.addEventListener('pointerdown', e => { b.setPointerCapture(e.pointerId); inp[k] = 1; if (k === 'j') inp.jp = 1; });
  const up = () => inp[k] = 0; b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
}
const kx = () => (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
const ky = () => (keys.ArrowUp || keys.KeyW ? 1 : 0) - (keys.ArrowDown || keys.KeyS ? 1 : 0);

// ---- Game state ----
const P = { x: 0, y: 0, z: -24, h: 0, v: 0, vy: 0, air: 0, gr: null, spin: 0, flip: 0, sl: 0, score: 0, trick: 0, msg: '', mt: 0 };
const say = t => { P.msg = t; P.mt = 1.6; };
const off = a => { const m = Math.abs(a) % PI2; return Math.min(m, PI2 - m); };
const rotsOk = () => off(P.spin) < .8 && off(P.flip) < .8;
const rotCount = () => Math.round(Math.abs(P.spin) / PI2) + Math.round(Math.abs(P.flip) / PI2);

function step(dt) {
  const ix = inp.x || kx(), iy = inp.y || ky();
  const s = inp.s || keys.KeyJ, f = inp.f || keys.KeyK, jump = inp.jp;
  inp.jp = 0;
  const fx = Math.sin(P.h), fz = Math.cos(P.h);
  if (P.gr) { // grinding
    const r = P.gr; P.v = Math.max(P.v, 5);
    P.x += fx * P.v * dt; P.z += fz * P.v * dt; P.y = r.y;
    P.trick += 60 * dt;
    const a = r.ax ? P.z - r.z : P.x - r.x;
    if (Math.abs(a) > r.len / 2) { P.gr = null; P.air = 1; P.vy = 0; say('Рейл!'); }
    if (jump) { P.gr = null; P.air = 1; P.vy = 6; }
    return;
  }
  P.v += (iy > 0 ? 7 * iy : 10 * iy) * dt; P.v -= P.v * .35 * dt; P.v = Math.max(0, Math.min(13, P.v));
  P.h -= ix * dt * (P.air ? 1.2 : 2.4 * Math.min(1, P.v / 3));
  const nx = Math.max(-42, Math.min(42, P.x + fx * P.v * dt)), nz = Math.max(-42, Math.min(42, P.z + fz * P.v * dt));
  if (!P.air && heightAt(nx, nz) > P.y + .5) P.v *= .2; else { P.x = nx; P.z = nz; }
  const g = heightAt(P.x, P.z);
  if (!P.air) {
    if (g > P.y + .001) P.sl = (g - P.y) / Math.max(1e-3, P.v * dt);
    if (g < P.y - .08) { P.air = 1; P.vy = P.v * P.sl; }
    else { P.y = g; if (g < .01) P.sl = 0; }
    if (jump) { P.air = 1; P.vy = Math.max(P.vy, 6.5); }
  }
  if (P.air) {
    P.vy -= 18 * dt; P.y += P.vy * dt; P.trick += 8 * dt;
    if (s) P.spin += dt * 9; if (f) P.flip += dt * 9;
    for (const r of rails) {
      const a = r.ax ? P.z - r.z : P.x - r.x, c = r.ax ? P.x - r.x : P.z - r.z;
      if (P.vy < 0 && Math.abs(a) < r.len / 2 && Math.abs(c) < .6 && Math.abs(P.y - r.y) < .45 && rotsOk()) {
        P.trick += rotCount() * 100; P.spin = P.flip = 0; P.gr = r; P.y = r.y; P.air = 0;
        const d = r.ax ? fz : fx; P.h = r.ax ? (d >= 0 ? 0 : Math.PI) : (d >= 0 ? PI2 / 4 : -PI2 / 4);
        say('Гринд!'); return;
      }
    }
    if (P.y <= g && P.vy <= 0) {
      if (rotsOk()) { const n = rotCount(); P.trick += n * 100; const gain = Math.round(P.trick); if (gain > 5) { P.score += gain; say('+' + gain); } }
      else { P.v = 0; say('Падение!'); }
      P.trick = 0; P.spin = P.flip = 0; P.y = g; P.vy = 0; P.air = 0;
    }
  }
}
let last = performance.now();
function loop(t) {
  const dt = Math.min(.05, (t - last) / 1000); last = t;
  step(dt);
  B.position.set(P.x, P.y, P.z); B.rotation.set(-P.flip, P.h + P.spin, 0);
  const fx = Math.sin(P.h), fz = Math.cos(P.h);
  cam.position.lerp(new T.Vector3(P.x - fx * 7, P.y + 3.4, P.z - fz * 7), 1 - Math.pow(.002, dt));
  cam.lookAt(P.x + fx * 3, P.y + 1, P.z + fz * 3);
  P.mt -= dt; $('sc').textContent = P.score; $('tr').textContent = P.trick > 5 ? Math.round(P.trick) : ''; $('ms').textContent = P.mt > 0 ? P.msg : '';
  ren.render(scene, cam); requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
