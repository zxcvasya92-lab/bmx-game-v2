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
const F = new T.Group(), Rd = new T.Group(); B.add(F, Rd);
const add = (p, g, c, x, y, z, rx = 0) => { const m = new T.Mesh(g, M(c)); m.position.set(x, y, z); m.rotation.x = rx; p.add(m); return m; };
for (const z of [-.55, .55]) { const w = new T.Mesh(new T.TorusGeometry(.35, .06, 8, 18), M(0x111827)); w.rotation.y = PI2 / 4; w.position.set(0, .35, z); F.add(w); }
add(F, new T.BoxGeometry(.07, .07, 1.1), 0xff5a1f, 0, .7, 0);
const bars = add(F, new T.BoxGeometry(.5, .06, .06), 0x9ca3af, 0, 1.05, .5);
add(Rd, new T.BoxGeometry(.3, .6, .25), 0x2563eb, 0, 1.2, -.1, .3);
add(Rd, new T.BoxGeometry(.18, .5, .18), 0x1f2937, 0, .85, -.15);
add(Rd, new T.SphereGeometry(.17, 10, 8), 0xfcd34d, 0, 1.68, .02);
add(Rd, new T.SphereGeometry(.19, 10, 8, 0, PI2, 0, PI2 / 4), 0xef4444, 0, 1.72, .02);

// ---- Input (PSP-style on-screen controls) ----
const inp = { x: 0, y: 0, dl: 0, dr: 0, du: 0, dd: 0, L: 0, R: 0, O: 0, xp: 0, tp: 0, sp: 0 };
const keys = {}; let paused = false;
addEventListener('keydown', e => { keys[e.code] = 1; if (e.code === 'Space') inp.xp = 1; if (e.code === 'KeyJ') inp.tp = 1; if (e.code === 'KeyK') inp.sp = 1; if (e.code === 'Escape') paused = !paused; });
addEventListener('keyup', e => keys[e.code] = 0);
const hold = (id, fn) => { const b = $(id); b.addEventListener('pointerdown', e => { b.setPointerCapture(e.pointerId); b.classList.add('on'); fn(1); }); const up = () => { b.classList.remove('on'); fn(0); }; b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); };
hold('bX', v => { if (v) inp.xp = 1; }); hold('bO', v => inp.O = v);
hold('bT', v => { if (v) inp.tp = 1; }); hold('bS', v => { if (v) inp.sp = 1; });
hold('dU', v => inp.du = v); hold('dD', v => inp.dd = v); hold('dL', v => inp.dl = v); hold('dR', v => inp.dr = v);
hold('bL', v => inp.L = v); hold('bR', v => inp.R = v);
hold('bSt', v => { if (v) paused = !paused; }); hold('bSe', v => { if (v) reset(); });
const base = $('stick'), kn = $('knob');
function sv(e) {
  const r = base.getBoundingClientRect(), R = r.width / 2 - 14;
  let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const d = Math.hypot(dx, dy);
  if (d > R) { dx *= R / d; dy *= R / d; }
  kn.style.transform = `translate(${dx}px,${dy}px)`; inp.x = dx / R; inp.y = -dy / R;
}
base.addEventListener('pointerdown', e => { base.setPointerCapture(e.pointerId); sv(e); });
base.addEventListener('pointermove', e => { if (base.hasPointerCapture(e.pointerId)) sv(e); });
const se = () => { kn.style.transform = ''; inp.x = inp.y = 0; };
base.addEventListener('pointerup', se); base.addEventListener('pointercancel', se);
const k = c => keys[c] ? 1 : 0;

// ---- Game state ----
const P = {}; let score = 0;
function reset() { Object.assign(P, { x: 0, y: 0, z: -24, h: 0, v: 0, vy: 0, air: 0, gr: null, spin: 0, flip: 0, sl: 0, trick: 0, man: 0, bal: 0, pit: 0, tri: 0, sq: 0, rest: 0, msg: '', mt: 0, t: 0 }); }
reset();
const say = t => { P.msg = t; P.mt = 1.6; };
const off = a => { const m = Math.abs(a) % PI2; return Math.min(m, PI2 - m); };
const rotsOk = () => off(P.spin) < .8 && off(P.flip) < .8;
const rotCount = () => Math.round(Math.abs(P.spin) / PI2) + Math.round(Math.abs(P.flip) / PI2);
const bail = () => { P.v = 0; P.trick = 0; P.man = 0; say('Падение!'); };

function step(dt) {
  P.t += dt;
  const ix = inp.x + k('KeyD') - k('KeyA'), iy = inp.y + k('KeyW') - k('KeyS');
  const dX = inp.dr + k('ArrowRight') - inp.dl - k('ArrowLeft'), dY = inp.du + k('ArrowUp') - inp.dd - k('ArrowDown');
  const sd = inp.L + k('KeyQ') - inp.R - k('KeyE') - dX; // spin direction
  const O = inp.O || k('KeyM'), hop = inp.xp, tri = inp.tp, sq = inp.sp;
  inp.xp = inp.tp = inp.sp = 0;
  const fx = Math.sin(P.h), fz = Math.cos(P.h);
  // one-shot tricks
  if (P.tri > 0 && (P.tri -= dt) <= 0) { P.trick += 150; say('Барспин'); }
  if (P.sq > 0 && (P.sq -= dt) <= 0) { P.trick += 200; say('Тейлвип'); }
  if (P.gr) {
    const r = P.gr; P.v = Math.max(P.v, 5);
    P.x += fx * P.v * dt; P.z += fz * P.v * dt; P.y = r.y; P.trick += 100 * dt;
    const a = r.ax ? P.z - r.z : P.x - r.x;
    if (Math.abs(a) > r.len / 2) { P.gr = null; P.air = 1; P.vy = 0; }
    if (hop) { P.gr = null; P.air = 1; P.vy = 6; }
    return;
  }
  if (!P.air) { // manual
    if (O && P.v > 2.5 && !P.man) { P.man = 1; P.bal = 0; say('Мануал'); }
    if (P.man) {
      P.bal += dt * (P.bal * .9 + .5 * Math.sin(P.t * 1.9)) - dt * iy * 2.4;
      P.trick += 50 * dt;
      if (!O || P.v < 1.5) P.man = 0; else if (Math.abs(P.bal) > 1) bail();
    }
  }
  if (!P.man) P.v += (iy > 0 ? 7 * iy : 10 * iy) * dt;
  P.v -= P.v * .35 * dt; P.v = Math.max(0, Math.min(13, P.v));
  P.h -= ix * dt * (P.air ? 1.2 : 2.4 * Math.min(1, P.v / 3)) * (P.man ? .6 : 1);
  const nx = Math.max(-42, Math.min(42, P.x + fx * P.v * dt)), nz = Math.max(-42, Math.min(42, P.z + fz * P.v * dt));
  if (!P.air && heightAt(nx, nz) > P.y + .5) P.v *= .2; else { P.x = nx; P.z = nz; }
  const g = heightAt(P.x, P.z);
  if (!P.air) {
    if (g > P.y + .001) P.sl = (g - P.y) / Math.max(1e-3, P.v * dt);
    if (g < P.y - .08) { P.air = 1; P.vy = P.v * P.sl; P.man = 0; }
    else { P.y = g; if (g < .01) P.sl = 0; }
    if (hop) { P.air = 1; P.man = 0; P.vy = Math.max(P.vy, iy < -.5 ? 8.2 : 5.8); }
    if (!P.air && !P.man) { P.rest += dt; if (P.rest > .5 && P.trick > 5) { const n = Math.round(P.trick); score += n; say('+' + n); P.trick = 0; } } else P.rest = 0;
  }
  if (P.air) {
    P.rest = 0; P.vy -= 18 * dt; P.y += P.vy * dt; P.trick += 8 * dt;
    P.spin += sd * dt * 9; P.flip += dY * dt * 8;
    if (tri && !P.tri) P.tri = .45; if (sq && !P.sq) P.sq = .6;
    for (const r of rails) {
      const a = r.ax ? P.z - r.z : P.x - r.x, c = r.ax ? P.x - r.x : P.z - r.z;
      if (P.vy < 0 && (dX || dY || O) && Math.abs(a) < r.len / 2 && Math.abs(c) < .6 && Math.abs(P.y - r.y) < .45 && rotsOk()) {
        P.trick += rotCount() * 100; P.spin = P.flip = 0; P.gr = r; P.y = r.y; P.air = 0;
        const d = r.ax ? fz : fx; P.h = r.ax ? (d >= 0 ? 0 : Math.PI) : (d >= 0 ? PI2 / 4 : -PI2 / 4);
        say(dY > 0 ? 'Дабл-пег' : dY < 0 ? 'Айспик' : dX > 0 ? 'Смит' : dX < 0 ? 'Фибл' : 'Гринд'); return;
      }
    }
    if (P.y <= g && P.vy <= 0) {
      if (rotsOk()) { P.trick += rotCount() * 100; if (O && P.v > 2.5) { P.man = 1; P.bal = 0; } } else bail();
      P.spin = P.flip = 0; P.tri = P.sq = 0; P.y = g; P.vy = 0; P.air = 0;
    }
  }
}
let last = performance.now();
function loop(t) {
  const dt = Math.min(.05, (t - last) / 1000); last = t;
  if (!paused) step(dt);
  P.pit += ((P.man ? .5 + .25 * P.bal : 0) - P.pit) * Math.min(1, dt * 10);
  B.position.set(P.x, P.y, P.z); B.rotation.set(-P.flip - P.pit, P.h + P.spin, 0);
  bars.rotation.y = P.tri > 0 ? (1 - P.tri / .45) * PI2 * 2 : 0; F.rotation.y = P.sq > 0 ? (1 - P.sq / .6) * PI2 : 0;
  const fx = Math.sin(P.h), fz = Math.cos(P.h);
  cam.position.lerp(new T.Vector3(P.x - fx * 7, P.y + 3.4, P.z - fz * 7), 1 - Math.pow(.002, dt));
  cam.lookAt(P.x + fx * 3, P.y + 1, P.z + fz * 3);
  P.mt -= dt; $('sc').textContent = score; $('tr').textContent = P.trick > 5 ? Math.round(P.trick) : '';
  $('ms').textContent = paused ? 'Пауза' : P.mt > 0 ? P.msg : '';
  $('bal').style.visibility = P.man ? 'visible' : 'hidden'; $('bal').firstChild.style.left = 67 + P.bal * 67 + 'px';
  ren.render(scene, cam); requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
