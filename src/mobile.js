import { icon } from './icons.js';

export class MobileControls {
  constructor({ enabled, canvas, camera, settings, joystick, isBlocked, onReset, onOrientation, onInteract, onMenu }) {
    Object.assign(this, { enabled, canvas, camera, settings, joystick, isBlocked, onReset, onOrientation });
    this.portrait = false; this.sprinting = false; this.stickPointer = null; this.lookPointer = null; this.sprintPointer = null;
    this.stick = document.getElementById('joystick'); this.thumb = document.getElementById('joystick-thumb');
    this.action = document.getElementById('mobile-interact'); this.sprint = document.getElementById('mobile-sprint');
    if (!enabled) return;
    document.body.classList.add('touch-game');
    this.action.onclick = () => { if (!this.isBlocked()) onInteract(); };
    document.getElementById('mobile-menu').onclick = onMenu;
    for (const id of ['mobile-fullscreen', 'orientation-fullscreen']) document.getElementById(id).onclick = () => this.fullscreen();
    this.stick.addEventListener('pointerdown', event => {
      event.preventDefault();
      if (this.isBlocked() || this.stickPointer !== null) return;
      this.stickPointer = event.pointerId; this.stick.setPointerCapture(event.pointerId); this.moveStick(event);
    });
    this.stick.addEventListener('pointermove', event => { if (event.pointerId === this.stickPointer && !this.isBlocked()) this.moveStick(event); });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) this.stick.addEventListener(type, event => {
      if (event.pointerId === this.stickPointer) this.resetStick();
    });
    canvas.addEventListener('pointerdown', event => {
      const bounds = canvas.getBoundingClientRect();
      if (event.pointerType !== 'touch' || this.isBlocked() || this.lookPointer !== null || event.clientX < bounds.left + bounds.width * .42) return;
      this.lookPointer = event.pointerId; this.lookPoint = { x: event.clientX, y: event.clientY }; canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      if (event.pointerId !== this.lookPointer || this.isBlocked()) return;
      const dx = event.clientX - this.lookPoint.x, dy = event.clientY - this.lookPoint.y;
      camera.rotation.y -= dx * .004 * this.settings().sensitivity;
      camera.rotation.x = Math.max(-1.4, Math.min(1.4, camera.rotation.x - dy * .004 * this.settings().sensitivity));
      this.lookPoint = { x: event.clientX, y: event.clientY };
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, event => {
      if (event.pointerId === this.lookPointer) this.lookPointer = null;
    });
    this.sprint.addEventListener('pointerdown', event => {
      event.preventDefault(); if (this.isBlocked() || this.sprintPointer !== null) return;
      this.sprintPointer = event.pointerId; this.sprint.setPointerCapture(event.pointerId); this.setSprint(true);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) this.sprint.addEventListener(type, event => {
      if (event.pointerId === this.sprintPointer) { this.sprintPointer = null; this.setSprint(false); }
    });
    for (const target of [canvas, this.stick, this.action, this.sprint]) target.addEventListener('contextmenu', event => event.preventDefault());
    window.addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => this.reset());
    const resize = () => {
      this.reset(); this.portrait = window.innerHeight > window.innerWidth;
      document.body.classList.toggle('mobile-portrait', this.portrait);
      document.getElementById('orientation-prompt').hidden = !this.portrait;
      this.onOrientation(this.portrait);
    };
    window.addEventListener('resize', resize); window.visualViewport?.addEventListener('resize', resize);
    document.addEventListener('fullscreenchange', resize); resize();
  }
  moveStick(event) {
    const rect = this.stick.getBoundingClientRect(), radius = rect.width * .32;
    const dx = event.clientX - rect.left - rect.width / 2, dy = event.clientY - rect.top - rect.height / 2;
    const length = Math.hypot(dx, dy), scale = Math.min(1, radius / (length || 1));
    this.joystick.x = length < 6 ? 0 : dx * scale / radius;
    this.joystick.y = length < 6 ? 0 : -dy * scale / radius;
    this.thumb.style.transform = `translate(${dx * scale}px,${dy * scale}px)`;
  }
  setSprint(active) { this.sprinting = active; this.sprint.classList.toggle('active', active); this.sprint.setAttribute('aria-pressed', String(active)); }
  resetStick() { this.stickPointer = null; this.joystick.x = this.joystick.y = 0; this.thumb.style.transform = ''; }
  reset() {
    const captures = [[this.stick, this.stickPointer], [this.canvas, this.lookPointer], [this.sprint, this.sprintPointer]];
    this.resetStick(); this.lookPointer = this.sprintPointer = null; this.setSprint(false); this.onReset?.();
    for (const [element, pointer] of captures) if (pointer !== null && element.hasPointerCapture(pointer)) element.releasePointerCapture(pointer);
  }
  async fullscreen() {
    const message = document.getElementById('orientation-message');
    try {
      if (document.fullscreenElement) { await document.exitFullscreen(); return; }
      if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      if (screen.orientation?.lock) await screen.orientation.lock('landscape');
    } catch {
      message.textContent = 'Putar ponsel secara manual dan aktifkan rotasi otomatis pada perangkat.';
    }
    this.reset();
  }
  render({ hit, carrying, moving, distance, busy, outdoor }) {
    if (!this.enabled) return;
    let label = 'Dekati objek', symbol = 'scan';
    if (carrying || moving) { label = 'Letakkan'; symbol = 'box'; }
    else if (hit?.id === 'gate') { label = 'Gerbang'; symbol = 'home'; }
    else if (['exit', 'entrance'].includes(hit?.id)) { label = 'Buka'; symbol = 'home'; }
    else if (hit?.id === 'dirt') { label = 'Bersihkan'; symbol = 'brush'; }
    else if (hit) label = 'Periksa';
    if (busy) label = 'Tunggu';
    if (this.action.dataset.action !== label) { this.action.dataset.action = label; this.action.innerHTML = `${icon(symbol)}<span>${label}</span>`; this.action.setAttribute('aria-label', label); }
    this.action.disabled = this.isBlocked() || busy || (!hit && !carrying && !moving) || (carrying && distance > 1.8) || (moving && !moving.valid);
    this.sprint.hidden = !outdoor || carrying || !!moving;
  }
}
