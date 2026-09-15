// Creeky - Auth (Sign In / Sign Up) solo front-end
import { db } from './store.js?v=31';

export const Auth = {
  get state() { return db.load(); },
  currentUser() {
    const s = db.load();
    if (!s.session) return null;
    return s.users.find(u => u.id === s.session) || null;
  },
  signUp(name, email, pass) {
    const s = db.load();
    if (s.users.some(u => u.email === email)) throw new Error('Ese correo ya está registrado.');
    const user = { id: 'u_' + Date.now(), name, email, pass: btoa(pass), created: Date.now() };
    s.users.push(user); s.session = user.id; db.save(s);
    return user;
  },
  signIn(email, pass) {
    const s = db.load();
    const u = s.users.find(x => x.email === email && x.pass === btoa(pass));
    if (!u) throw new Error('Credenciales incorrectas.');
    s.session = u.id; db.save(s);
    return u;
  },
  signOut() { const s = db.load(); s.session = null; db.save(s); },

  renderTabs(mode, err='') {
    return `
    <div class="auth-tabs" role="tablist">
      <button data-auth-tab="signin" class="${mode==='signin'?'active':''}">Sign In</button>
      <button data-auth-tab="signup" class="${mode==='signup'?'active':''}">Sign Up</button>
    </div>
    <h2 id="auth-title">${mode==='signin' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}</h2>
    <p class="auth-sub">${mode==='signin' ? 'Organiza tu día al estilo TickTick.' : 'Solo para tu uso personal. Sin servidores.'}</p>
    ${err ? `<div class="auth-error">${err}</div>` : ''}
    ${mode==='signin' ? `
    <form id="signin-form" class="auth-form">
      <div class="form-group"><label class="form-label" for="si-email">Correo</label>
        <input class="form-input" id="si-email" type="email" required placeholder="tu@correo.com"></div>
      <div class="form-group"><label class="form-label" for="si-pass">Contraseña</label>
        <input class="form-input" id="si-pass" type="password" required placeholder="••••••••"></div>
      <button class="btn btn-primary" type="submit">Entrar</button>
    </form>` : `
    <form id="signup-form" class="auth-form">
      <div class="form-group"><label class="form-label" for="su-name">Nombre</label>
        <input class="form-input" id="su-name" type="text" required placeholder="Tu nombre"></div>
      <div class="form-group"><label class="form-label" for="su-email">Correo</label>
        <input class="form-input" id="su-email" type="email" required placeholder="tu@correo.com"></div>
      <div class="form-group"><label class="form-label" for="su-pass">Contraseña</label>
        <input class="form-input" id="su-pass" type="password" required minlength="4" placeholder="Mínimo 4 caracteres"></div>
      <button class="btn btn-primary" type="submit">Crear cuenta</button>
    </form>`}
    <div class="auth-divider">Creeky • distintivo: calma y foco</div>
    <p class="text-center text-sm" style="color:var(--text-tertiary)">Tus datos se guardan solo en este navegador (localStorage).</p>`;
  }
};
