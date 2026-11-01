"""
Servidor local para desarrollo del frontend.

    python servir.py        ->  http://localhost:5500

Por qué no usar simplemente `python -m http.server`:
  - En algunos Windows, Python entrega los .js con un tipo MIME incorrecto y el navegador
    se niega a cargar los módulos. Aquí lo fijamos.
  - Desactivamos la caché para que, al editar un archivo, veas el cambio al recargar.
"""
import http.server
import mimetypes
import socketserver
import sys

mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("text/css", ".css")

PUERTO = int(sys.argv[1]) if len(sys.argv) > 1 else 5500


class Manejador(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, formato, *args):  # menos ruido en la terminal
        if "favicon" not in (args[0] if args else ""):
            super().log_message(formato, *args)


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PUERTO), Manejador) as servidor:
    print(f"Frontend en http://localhost:{PUERTO}   (Ctrl+C para detener)")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
