/** Pantalla de acceso: iniciar sesión o registrar una empresa nueva. */
import { api } from '../api.js';
import { guardarSesion } from '../estado.js';
import { html, montar } from '../utils/html.js';
import { conBoton, errorForm, navegar } from '../utils/ui.js';

export const titulo = 'Acceso';

export default function render({ contenedor, datos }) {
  const esRegistro = datos?.modo === 'registro';

  montar(contenedor, html`
    <div class="acceso">
      <div class="acceso-marca">
        <div class="marca-logo" aria-hidden="true">C</div>
        <h1>${esRegistro ? 'Crea tu cuenta' : 'Bienvenido'}</h1>
        <p>${esRegistro ? 'Registra tu negocio y empieza a cotizar en minutos.' : 'Inicia sesión para gestionar tus cotizaciones.'}</p>
      </div>
      <div class="tarjeta">
        ${esRegistro ? html`
          <form class="formulario" novalidate id="form-acceso">
            <div class="campo"><label for="r-empresa">Nombre del negocio *</label>
              <input class="entrada" id="r-empresa" name="empresa_nombre" maxlength="150" autocomplete="organization" required></div>
            <div class="campo"><label for="r-nit">NIT (opcional)</label>
              <input class="entrada" id="r-nit" name="nit" maxlength="30"></div>
            <div class="campo"><label for="r-nombre">Tu nombre *</label>
              <input class="entrada" id="r-nombre" name="nombre" maxlength="100" autocomplete="name" required></div>
            <div class="campo"><label for="r-email">Correo electrónico *</label>
              <input class="entrada" id="r-email" name="email" type="email" maxlength="100" autocomplete="email" required></div>
            <div class="campo"><label for="r-pass">Contraseña * <span class="ayuda">(mínimo 8 caracteres)</span></label>
              <input class="entrada" id="r-pass" name="password" type="password" minlength="8" maxlength="128" autocomplete="new-password" required></div>
            <div class="campo"><label for="r-pass2">Repite la contraseña *</label>
              <input class="entrada" id="r-pass2" name="password2" type="password" maxlength="128" autocomplete="new-password" required></div>
            <p class="error-form" role="alert" hidden></p>
            <button type="submit" class="btn btn-primario btn-bloque">Crear cuenta</button>
          </form>` : html`
          <form class="formulario" novalidate id="form-acceso">
            <div class="campo"><label for="l-email">Correo electrónico</label>
              <input class="entrada" id="l-email" name="email" type="email" autocomplete="username" required autofocus></div>
            <div class="campo"><label for="l-pass">Contraseña</label>
              <input class="entrada" id="l-pass" name="password" type="password" autocomplete="current-password" required></div>
            <p class="error-form" role="alert" hidden></p>
            <button type="submit" class="btn btn-primario btn-bloque">Iniciar sesión</button>
          </form>`}
      </div>
      <p class="acceso-pie">
        ${esRegistro ? html`¿Ya tienes cuenta? <a href="#/login">Inicia sesión</a>` : html`¿Eres nuevo? <a href="#/registro">Registra tu negocio</a>`}
      </p>
    </div>`);

  const form = contenedor.querySelector('#form-acceso');
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    errorForm(form);
    const campos = Object.fromEntries(new FormData(form));
    const email = (campos.email || '').trim();

    if (esRegistro) {
      if (!campos.empresa_nombre.trim() || !campos.nombre.trim() || !email || !campos.password) {
        return errorForm(form, 'Completa los campos obligatorios.');
      }
      if (campos.password.length < 8) return errorForm(form, 'La contraseña debe tener al menos 8 caracteres.');
      if (campos.password !== campos.password2) return errorForm(form, 'Las contraseñas no coinciden.');
    } else if (!email || !campos.password) {
      return errorForm(form, 'Escribe tu correo y tu contraseña.');
    }

    await conBoton(form.querySelector('button[type=submit]'), async () => {
      try {
        const respuesta = esRegistro
          ? await api.registro({
            empresa_nombre: campos.empresa_nombre.trim(), nit: campos.nit.trim() || undefined,
            nombre: campos.nombre.trim(), email, password: campos.password,
          })
          : await api.login(email, campos.password);
        guardarSesion(respuesta);
        navegar('/dashboard');
      } catch (error) {
        errorForm(form, error.message);
      }
    });
  });
}
