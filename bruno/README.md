# Colección Bruno — Avisens API

Colección de la API de Avisens en [Bruno](https://www.usebruno.com/), versionada en el
repo para trabajar en equipo: cada quien la obtiene con `git pull` y los cambios se
proponen por Pull Request, igual que el código.

## Instalar Bruno

- **App de escritorio:** descárgala en https://www.usebruno.com/downloads
- **macOS (Homebrew):** `brew install bruno`

## Abrir la colección

1. Abre Bruno → **Open Collection**.
2. Elige esta carpeta: `Avisens-Project/bruno`.
3. Arriba a la derecha, selecciona el environment **Local** (o **Produccion**).

## Environments

| Variable        | Local                     | Uso                                    |
|-----------------|---------------------------|----------------------------------------|
| `baseUrl`       | `http://localhost:3000`   | Base de la API                         |
| `token`         | (se llena solo)           | Access token (Bearer) de las rutas     |
| `refresh_token` | (se llena solo)           | Para renovar el token                  |
| `device_token`  | (vacío)                   | Rutas que lo requieran                 |

> Los tokens NO se versionan (van vacíos en el repo). Se llenan solos al hacer login.

## Flujo de uso

1. Corre **Auth → Iniciar sesión** (ajusta email/contraseña en el body). El script de
   post-respuesta guarda `token` y `refresh_token` en el environment automáticamente.
2. Ya puedes ejecutar cualquier otra ruta: todas usan `Bearer {{token}}`.
3. Cuando el token expire, corre **Auth → Renovar access token**.

## Convención de nombres

Cada ruta lleva al inicio el rol que la puede usar, entre corchetes:
`[Admin · Propietario] ...`, `[Admin] ...`, `[Público] ...`.

## Agregar una ruta nueva

Crea el `.bru` en la carpeta del módulo (o duplica una existente), commitea en una rama
y abre un PR. La colección es "colección como código": se revisa y versiona con Git.
