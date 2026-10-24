# Home

Dashboard personal para acceder rápidamente a sitios y servicios frecuentes desde una sola página.

## Descripción

Este proyecto es una página de inicio estilo "home" con una grilla de accesos directos a redes sociales, servicios de correo, streaming, banca, compras, entretenimiento y otras herramientas habituales.

Incluye:
- reloj en tiempo real en la parte superior derecha
- diseño oscuro con estética moderna
- iconos con acceso directo a cada servicio
- lista de enlaces configurados directamente en el archivo HTML

## Archivos

- `index.html`: página principal con la interfaz y los accesos directos
- `README.md`: documentación del proyecto

## Cómo usarlo

1. Abre `index.html` en tu navegador.
2. Haz clic en cualquiera de los íconos para abrir el sitio correspondiente.
3. Si deseas personalizar los accesos, edita el JSON embebido dentro de `index.html`.

## Personalización

Cada acceso se define con:
- nombre
- URL
- imagen/logo

Ejemplo:

```json
{
  "name": "Google",
  "url": "https://www.google.com",
  "img": "https://example.com/google-logo.png"
}
```

## Tecnologías

- HTML
- CSS
- Bootstrap 5
- JavaScript

## Nota

La página está pensada como una herramienta personal de acceso rápido y puede adaptarse fácilmente a tus sitios favoritos.

## Mantenedor

- `admin.html`: agrega, edita, elimina y ordena los sitios. Se entra con el código de 6 cifras de https://mcl-autenticator-code.netlify.app.
- Los sitios se guardan en Netlify Blobs mediante `netlify/functions/sitios.mjs` (`/api/sitios` y `/api/login`). `sitios.json` es la lista inicial y de respaldo.
- La clave TOTP va en la variable `TOTP_SECRET` (en Netlify y en `.env` local; ver `.env.example`).
- Local: `netlify dev --port 4200` o el launch de VS Code.

