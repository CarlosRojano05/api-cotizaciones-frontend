/**
 * TODA la comunicación con el backend pasa por este archivo.
 *
 * Ventaja: si mañana cambia la dirección del servidor, o cómo se envía el token, o cómo se muestran
 * los errores, se cambia AQUÍ y nada más. (Cuando hagas la versión en React, este archivo casi
 * se copia tal cual: no depende de la pantalla.)
 *
 * Uso:   const clientes = await api.clientes.listar();
 */
import { API_URL } from './config.js';
import { cerrarSesion, obtenerSesion } from './estado.js';

export class ErrorApi extends Error {
  constructor(mensaje, status) {
    super(mensaje);
    this.status = status;
  }
}

async function pedir(ruta, { metodo = 'GET', cuerpo, formData, params, auth = true, tipo = 'json' } = {}) {
  const url = new URL(API_URL + ruta);
  if (params) {
    Object.entries(params).forEach(([clave, valor]) => {
      if (valor !== '' && valor !== null && valor !== undefined) url.searchParams.set(clave, valor);
    });
  }

  const encabezados = {};
  const sesion = obtenerSesion();
  if (auth && sesion?.token) encabezados.Authorization = `Bearer ${sesion.token}`;

  let body;
  if (formData) {
    body = formData;                    // NO se pone Content-Type: el navegador agrega el "boundary" solo
  } else if (cuerpo !== undefined) {
    encabezados['Content-Type'] = 'application/json';
    body = JSON.stringify(cuerpo);
  }

  let respuesta;
  try {
    respuesta = await fetch(url, { method: metodo, headers: encabezados, body });
  } catch {
    throw new ErrorApi('No se pudo conectar con el servidor. Verifica que el backend esté encendido.', 0);
  }

  if (!respuesta.ok) {
    let mensaje = `Error del servidor (${respuesta.status})`;
    try {
      const datos = await respuesta.json();
      if (datos?.error) mensaje = datos.error;
    } catch { /* la respuesta no era JSON */ }

    // 401 con sesión abierta = el token venció. (En el login no: ahí 401 significa "clave incorrecta".)
    if (respuesta.status === 401 && auth) {
      cerrarSesion();
      window.dispatchEvent(new CustomEvent('sesion-vencida'));
    }
    throw new ErrorApi(mensaje, respuesta.status);
  }

  return tipo === 'blob' ? respuesta.blob() : respuesta.json();
}

export const api = {
  // ---------- Autenticación ----------
  login: (email, password) => pedir('/auth/login', { metodo: 'POST', cuerpo: { email, password }, auth: false }),
  registro: (datos) => pedir('/auth/registro', { metodo: 'POST', cuerpo: datos, auth: false }),
  perfil: () => pedir('/auth/me'),
  cambiarPassword: (actual, nueva) =>
    pedir('/auth/password', { metodo: 'PUT', cuerpo: { password_actual: actual, password_nueva: nueva } }),

  // ---------- Usuarios (solo admin) ----------
  usuarios: {
    listar: () => pedir('/usuarios'),
    crear: (datos) => pedir('/usuarios', { metodo: 'POST', cuerpo: datos }),
    desactivar: (id) => pedir(`/usuarios/${id}`, { metodo: 'DELETE' }),
    restablecerPassword: (id, nueva) =>
      pedir(`/usuarios/${id}/password`, { metodo: 'PUT', cuerpo: { password_nueva: nueva } }),
  },

  // ---------- Empresa ----------
  empresa: {
    configuracion: () => pedir('/empresa/configuracion'),
    actualizar: (datos) => pedir('/empresa/configuracion', { metodo: 'PUT', cuerpo: datos }),
    logo: () => pedir('/empresa/logo', { tipo: 'blob' }),
    subirLogo: (archivo) => {
      const formData = new FormData();
      formData.append('logo', archivo);
      return pedir('/empresa/logo', { metodo: 'POST', formData });
    },
    eliminarLogo: () => pedir('/empresa/logo', { metodo: 'DELETE' }),
  },

  // ---------- Clientes ----------
  clientes: {
    listar: () => pedir('/clientes'),
    crear: (datos) => pedir('/clientes', { metodo: 'POST', cuerpo: datos }),
    actualizar: (id, datos) => pedir(`/clientes/${id}`, { metodo: 'PUT', cuerpo: datos }),
    desactivar: (id) => pedir(`/clientes/${id}`, { metodo: 'DELETE' }),
  },

  // ---------- Catálogo ----------
  items: {
    listar: () => pedir('/items'),
    crear: (datos) => pedir('/items', { metodo: 'POST', cuerpo: datos }),
    actualizar: (id, datos) => pedir(`/items/${id}`, { metodo: 'PUT', cuerpo: datos }),
    desactivar: (id) => pedir(`/items/${id}`, { metodo: 'DELETE' }),
  },

  // ---------- Cotizaciones ----------
  cotizaciones: {
    listar: (filtros) => pedir('/cotizaciones', { params: filtros }),
    crear: (datos) => pedir('/cotizaciones', { metodo: 'POST', cuerpo: datos }),
    obtener: (id) => pedir(`/cotizaciones/${id}`),
    cambiarEstado: (id, estado, comentario) =>
      pedir(`/cotizaciones/${id}/estado`, { metodo: 'PATCH', cuerpo: { estado, comentario: comentario || undefined } }),
    historial: (id) => pedir(`/cotizaciones/${id}/historial`),
    pdf: (id) => pedir(`/cotizaciones/${id}/pdf`, { tipo: 'blob' }),
    anular: (id) => pedir(`/cotizaciones/${id}`, { metodo: 'DELETE' }),
  },

  // ---------- Panel ----------
  dashboard: () => pedir('/dashboard'),
};
