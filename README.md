# Frontend de Cotizaciones (JavaScript puro)

Interfaz web para la API de cotizaciones. Sin frameworks ni herramientas de compilación:
HTML + CSS + módulos de JavaScript. Sirve para entender cómo funciona todo antes de pasar a React.

## Cómo ejecutarlo

1. Enciende el **backend** (en su carpeta): `python app.py`  →  http://localhost:5000
2. En ESTA carpeta: `python servir.py`  →  http://localhost:5500
3. Abre http://localhost:5500 en el navegador.

> No abras `index.html` con doble clic: los módulos de JS no funcionan desde `file://`.
> `servir.py` existe porque en algunos Windows `python -m http.server` entrega los `.js` con un tipo
> incorrecto, y además desactiva la caché para que veas tus cambios al recargar.

Si tu backend corre en otra dirección, cámbiala en `js/config.js`.
Usuarios de prueba (base de datos de ejemplo): `carlos@eltornillo.com` (admin) y `laura@eltornillo.com` (vendedor), clave `Clave12345`.

## Estructura

```
frontend_cotizaciones/
├── index.html              Página única: solo trae el CSS y arranca main.js
├── servir.py               Servidor local de desarrollo
├── css/
│   ├── base.css            Colores (variables), tipografía, reinicio
│   ├── layout.css          Estructura: menú lateral, barra superior, pantalla de acceso
│   └── componentes.css     Botones, formularios, tablas, etiquetas, ventanas, gráfica…
└── js/
    ├── config.js           Dirección del backend
    ├── main.js             Enrutador + esqueleto (menú). Decide qué pantalla mostrar
    ├── api.js              ÚNICO archivo que habla con el backend (token, errores, sesión vencida)
    ├── estado.js           Sesión, configuración de la empresa, logo y color de marca
    ├── pages/              Una pantalla por archivo
    │   ├── login.js            Iniciar sesión / registrar negocio
    │   ├── dashboard.js        Panel: cifras, alertas, gráfica
    │   ├── clientes.js         Lista, búsqueda, crear/editar/desactivar
    │   ├── items.js            Catálogo (solo lectura para vendedores)
    │   ├── cotizaciones.js     Lista con filtros
    │   ├── cotizacion_nueva.js Editor con líneas y totales en vivo (también "Duplicar")
    │   ├── cotizacion_detalle.js  Detalle, cambio de estado, historial, PDF, anular
    │   ├── configuracion.js    Datos del negocio, color, logo, IVA, prefijo, condiciones
    │   ├── usuarios.js         Gestión de usuarios (admin)
    │   └── cuenta.js           Mis datos y cambio de contraseña
    └── utils/
        ├── html.js         Plantillas seguras (escapan todo por defecto)
        ├── iconos.js       Iconos SVG
        ├── formato.js      Dinero, fechas, etiquetas de estado
        ├── calculos.js     Totales de una cotización (mismas reglas que el backend)
        └── ui.js           Avisos, ventanas, confirmaciones, botones "cargando"
```

## Cómo funciona (lo esencial)

**Una pantalla = una función.** Cada archivo de `pages/` exporta `render({ contenedor, params, id })`:
pide datos a `api.js`, dibuja HTML dentro de `contenedor` y conecta los eventos.

**Navegación.** Las direcciones usan `#` (`#/clientes`, `#/cotizaciones/5`). `main.js` escucha el cambio de
dirección, comprueba permisos (sesión, rol) y carga la pantalla que corresponde. Cada pantalla se descarga
solo cuando se visita (`import()` dinámico).

**Seguridad de lo que se muestra.** `html\`...\`` escapa todo lo que insertas con `${...}`. Un cliente llamado
`<img onerror=...>` aparece como texto y no se ejecuta. Regla: los datos del usuario SIEMPRE entran por `${...}`;
nunca los concatenes como texto dentro de `innerHTML`.

**Estado.** En el editor de cotizaciones el estado es un objeto de JavaScript; al escribir se actualiza ese objeto
y solo se tocan los números que cambian (así el cursor no se pierde).

**Color de marca.** `estado.js` toma `color_primario` de la empresa y lo aplica a toda la app. Si el color es
claro (amarillo), el texto sobre él pasa a negro automáticamente.

**PDF y logo.** Necesitan el token, y una etiqueta `<img>` o `window.open` no puede enviarlo. Por eso se piden con
`fetch`, se convierten en un archivo temporal (`blob`) y se muestran con `URL.createObjectURL`.

## Equivalencias para cuando pases a React

| Aquí (JS puro) | En React |
|---|---|
| `html\`...\`` + `montar()` | JSX |
| objeto `estado` + `recalcular()` a mano | `useState` / `useReducer` |
| `main.js` (rutas con `#`) | React Router |
| `pages/*.js` | componentes de página |
| `api.js` | se copia casi igual |
| `estado.js` (sesión) | Context o un store |
| `utils/formato.js`, `calculos.js` | se copian igual |
| `data-accion` + delegación de eventos | `onClick` en cada botón |

## Agregar una pantalla nueva

1. Crea `js/pages/mi_pantalla.js` con `export const titulo = '...'` y `export default async function render({ contenedor }) {...}`.
2. Agrega la ruta en `RUTAS` de `main.js` (y en `MENU` si va en el menú).
3. Si necesita datos nuevos, agrega la función en `api.js`.

## Antes de publicarlo

- Cambia `API_URL` en `js/config.js` por la dirección real del backend (con **HTTPS**).
- En el backend, `CORS_ORIGINS` debe ser el dominio exacto de este frontend (no `*`).
- Sirve esta carpeta como sitio estático (Netlify, Vercel, Cloudflare Pages, Nginx…). Funciona sin configuración
  adicional porque las rutas usan `#`.

## Límites conocidos

- La sesión se guarda en `localStorage`; por eso todo texto de usuarios se escapa.
- No se pueden editar cotizaciones ya creadas (el backend no lo ofrece): se usa **Duplicar**.
- Las listas no tienen paginación (suficiente para una microempresa; se agrega si el volumen crece).
- Un usuario desactivado conserva su sesión hasta que el token expire (limitación del backend).
