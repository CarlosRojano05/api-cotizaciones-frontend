/**
 * Punto de entrada: arranca la aplicación.
 *
 * Aquí viven dos cosas:
 *   1. El ENRUTADOR: según la dirección (#/clientes, #/cotizaciones/5...) decide qué pantalla mostrar.
 *   2. El ESQUELETO (shell): el menú lateral y la barra superior que rodean a todas las pantallas.
 *
 * Se usa "#" en las direcciones (#/clientes) porque así funciona con cualquier servidor estático,
 * sin configuración extra.
 */
import { api } from './api.js';
import {
  cerrarSesion, esAdmin, guardarConfiguracion, guardarLogoURL, haySesion,
  obtenerConfiguracion, obtenerLogoURL, obtenerSesion,
} from './estado.js';
import { html, montar } from './utils/html.js';
import { icono } from './utils/iconos.js';
import { iniciales } from './utils/formato.js';
import { bloqueCargando, bloqueError, navegar, toast } from './utils/ui.js';

// Cada ruta: qué dirección reconoce y qué archivo de pantalla carga (solo se descarga cuando se visita).
const RUTAS = [
  { patron: /^\/login$/, publica: true, modulo: () => import('./pages/login.js'), datos: { modo: 'login' } },
  { patron: /^\/registro$/, publica: true, modulo: () => import('./pages/login.js'), datos: { modo: 'registro' } },
  { patron: /^\/dashboard$/, modulo: () => import('./pages/dashboard.js') },
  { patron: /^\/cotizaciones$/, modulo: () => import('./pages/cotizaciones.js') },
  { patron: /^\/cotizaciones\/nueva$/, modulo: () => import('./pages/cotizacion_nueva.js') },
  { patron: /^\/cotizaciones\/(\d+)$/, modulo: () => import('./pages/cotizacion_detalle.js') },
  { patron: /^\/clientes$/, modulo: () => import('./pages/clientes.js') },
  { patron: /^\/items$/, modulo: () => import('./pages/items.js') },
  { patron: /^\/usuarios$/, soloAdmin: true, modulo: () => import('./pages/usuarios.js') },
  { patron: /^\/configuracion$/, modulo: () => import('./pages/configuracion.js') },
  { patron: /^\/cuenta$/, modulo: () => import('./pages/cuenta.js') },
];

const MENU = [
  { ruta: '/dashboard', texto: 'Panel', icono: 'panel' },
  { ruta: '/cotizaciones', texto: 'Cotizaciones', icono: 'cotizaciones' },
  { ruta: '/clientes', texto: 'Clientes', icono: 'clientes' },
  { ruta: '/items', texto: 'Catálogo', icono: 'catalogo' },
  { ruta: '/usuarios', texto: 'Usuarios', icono: 'usuarios', soloAdmin: true },
  { ruta: '/configuracion', texto: 'Configuración', icono: 'config' },
  { ruta: '/cuenta', texto: 'Mi cuenta', icono: 'cuenta' },
];

const app = document.getElementById('app');
let shellMontado = false;
let versionPantalla = 0;   // evita que una pantalla lenta pise a otra más reciente

// ---------------------------------------------------------------- Utilidades de ruta
function leerHash() {
  const crudo = location.hash.slice(1) || '/';
  const [ruta, consulta = ''] = crudo.split('?');
  return { ruta: ruta.replace(/\/+$/, '') || '/', params: Object.fromEntries(new URLSearchParams(consulta)) };
}

// ---------------------------------------------------------------- Esqueleto (menú + barra superior)
function montarShell() {
  const sesion = obtenerSesion();
  const items = MENU.filter((m) => !m.soloAdmin || esAdmin());
  montar(app, html`
    <div class="app" id="app-shell">
      <aside class="barra-lateral" id="barra-lateral" aria-label="Menú principal">
        <div class="marca" id="marca"></div>
        <nav class="menu">
          ${items.map((m) => html`<a href="#${m.ruta}" data-ruta="${m.ruta}">${icono(m.icono)} ${m.texto}</a>`)}
        </nav>
        <div class="usuario-pie">
          <div class="avatar" aria-hidden="true">${iniciales(sesion.usuario.nombre)}</div>
          <div class="usuario-datos">
            <strong>${sesion.usuario.nombre}</strong>
            <span>${sesion.usuario.rol === 'admin' ? 'Administrador' : 'Vendedor'}</span>
          </div>
          <button type="button" class="btn-icono" id="btn-salir" title="Cerrar sesión" aria-label="Cerrar sesión">${icono('salir')}</button>
        </div>
      </aside>
      <div class="area">
        <header class="barra-superior">
          <button type="button" class="btn-icono" id="btn-menu" aria-label="Abrir menú">${icono('menu', 22)}</button>
          <span class="titulo-pagina" id="titulo-pagina"></span>
          <a class="btn btn-primario btn-sm" href="#/cotizaciones/nueva">${icono('plus', 16)} Nueva cotización</a>
        </header>
        <main id="contenido" tabindex="-1"></main>
      </div>
      <div class="velo" id="velo"></div>
    </div>`);

  const shell = document.getElementById('app-shell');
  const cerrarMenu = () => shell.classList.remove('menu-abierto');
  document.getElementById('btn-menu').addEventListener('click', () => shell.classList.toggle('menu-abierto'));
  document.getElementById('velo').addEventListener('click', cerrarMenu);
  document.querySelector('.menu').addEventListener('click', (e) => { if (e.target.closest('a')) cerrarMenu(); });
  document.getElementById('btn-salir').addEventListener('click', () => {
    cerrarSesion();
    navegar('/login');
  });
  pintarMarca();
  shellMontado = true;
}

/** Nombre y logo de la empresa arriba del menú. */
function pintarMarca() {
  const zona = document.getElementById('marca');
  if (!zona) return;
  const nombre = obtenerConfiguracion()?.nombre ?? obtenerSesion()?.empresa?.nombre ?? '';
  const logo = obtenerLogoURL();
  montar(zona, html`
    <div class="marca-logo">${logo ? html`<img src="${logo}" alt="Logo de ${nombre}">` : iniciales(nombre)}</div>
    <div><div class="marca-nombre">${nombre}</div><div class="marca-sub">Cotizaciones</div></div>`);
}

function marcarMenuActivo(ruta) {
  document.querySelectorAll('.menu a').forEach((a) => {
    const destino = a.dataset.ruta;
    // "Cotizaciones" queda marcado también en /cotizaciones/nueva y /cotizaciones/5
    a.classList.toggle('activo', ruta === destino || ruta.startsWith(`${destino}/`));
  });
}

/** Carga la configuración de la empresa (color, moneda, IVA...) y su logo. Se hace una vez por sesión. */
async function prepararSesion() {
  if (obtenerConfiguracion()) return;
  const config = await api.empresa.configuracion();
  guardarConfiguracion(config);
  if (config.tiene_logo) {
    try { guardarLogoURL(URL.createObjectURL(await api.empresa.logo())); } catch { /* sin logo: no pasa nada */ }
  }
}

// ---------------------------------------------------------------- Enrutador
async function enrutar() {
  const version = ++versionPantalla;
  const { ruta, params } = leerHash();

  if (ruta === '/') { navegar(haySesion() ? '/dashboard' : '/login'); return; }

  const definicion = RUTAS.find((r) => r.patron.test(ruta));

  // Reglas de acceso
  if (!definicion) {
    if (!haySesion()) { navegar('/login'); return; }
  } else if (!definicion.publica && !haySesion()) {
    navegar('/login'); return;
  } else if (definicion.publica && haySesion()) {
    navegar('/dashboard'); return;
  } else if (definicion.soloAdmin && !esAdmin()) {
    toast('No tienes permisos para entrar a esa sección.', 'error');
    navegar('/dashboard'); return;
  }

  // ----- Pantallas públicas (login / registro): sin menú
  if (definicion?.publica) {
    shellMontado = false;
    montar(app, html`<div class="pagina-publica" id="vista-publica"></div>`);
    const modulo = await definicion.modulo();
    if (version !== versionPantalla) return;
    document.title = `${modulo.titulo ?? 'Acceso'} · Cotizaciones`;
    await modulo.default({ contenedor: document.getElementById('vista-publica'), params, datos: definicion.datos });
    return;
  }

  // ----- Pantallas privadas: con menú
  if (!shellMontado || !document.getElementById('contenido')) {
    montar(app, html`<div class="bloque-estado" style="min-height:60vh">${bloqueCargando('Preparando tu espacio…')}</div>`);
    try {
      await prepararSesion();
    } catch (error) {
      if (version !== versionPantalla) return;
      if (!haySesion()) return;   // el token venció: el aviso de "sesión vencida" ya redirige al login
      montar(app, bloqueError(error.message));
      app.querySelector('[data-accion="reintentar"]')?.addEventListener('click', enrutar);
      return;
    }
    if (version !== versionPantalla) return;
    montarShell();
  }

  marcarMenuActivo(ruta);
  const contenido = document.getElementById('contenido');
  const vista = document.createElement('div');      // un contenedor NUEVO por pantalla: así no se acumulan eventos viejos
  vista.className = 'vista';
  contenido.replaceChildren(vista);
  window.scrollTo(0, 0);

  if (!definicion) {
    document.getElementById('titulo-pagina').textContent = 'No encontrado';
    montar(vista, html`<div class="bloque-estado vacio"><h3>Esta página no existe</h3><p>La dirección que abriste no corresponde a ninguna sección.</p>
      <a class="btn btn-primario" href="#/dashboard">Ir al panel</a></div>`);
    return;
  }

  montar(vista, bloqueCargando());
  try {
    const modulo = await definicion.modulo();
    if (version !== versionPantalla) return;
    const empresa = obtenerConfiguracion()?.nombre ?? '';
    document.title = `${modulo.titulo ?? ''} · ${empresa}`;
    document.getElementById('titulo-pagina').textContent = modulo.titulo ?? '';
    const coincidencia = ruta.match(definicion.patron);
    await modulo.default({ contenedor: vista, params, id: coincidencia?.[1] ? Number(coincidencia[1]) : null });
  } catch (error) {
    if (version !== versionPantalla || !haySesion()) return;
    console.error(error);
    montar(vista, bloqueError(error.message || 'Ocurrió un error inesperado.'));
    vista.querySelector('[data-accion="reintentar"]')?.addEventListener('click', enrutar);
  }
}

// ---------------------------------------------------------------- Eventos globales
window.addEventListener('hashchange', enrutar);

// Las pantallas avisan cuando cambian el nombre, el color o el logo de la empresa.
window.addEventListener('marca-actualizada', pintarMarca);

// El token venció (lo detecta api.js)
window.addEventListener('sesion-vencida', () => {
  toast('Tu sesión expiró. Inicia sesión nuevamente.', 'info');
  navegar('/login');
});

enrutar();
