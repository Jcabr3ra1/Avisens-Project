# Flujo de trabajo

## Nada se empuja directo a `develop`

**Siempre:** rama → `add` por ruta → `commit` → `push` → **Pull Request a `develop`**.

```bash
git checkout -b feat/lo-que-sea      # desde develop actualizado
git add <ruta> <ruta>                # NUNCA `git add -A`
git commit -m "feat(alcance): ..."   # español, Conventional Commits
git push -u origin feat/lo-que-sea
gh pr create --base develop
```

No importa que el cambio sea pequeño, que los gates estén verdes o que el
usuario haya dicho «súbelo»: **«súbelo» significa rama y PR**, no
`git push origin develop`. Empujar directo se salta la revisión y deja el
historial de `develop` sin puntos de reversión limpios.

`main` solo recibe merges desde `develop`.

## `git add` por ruta, nunca `-A`

Se añaden **solo los archivos que uno modificó**, nombrándolos uno por uno.
Nada de `git add -A`, `git add .` ni `git add <carpeta>`: una carpeta arrastra
archivos sin versionar de otra persona.

Esta regla nació de dos incidentes reales: un PR que se llevó 4.301 líneas
ajenas, y un commit que incluyó dos archivos que su autor no había escrito.

Si al hacer `git status` aparecen cambios que no son tuyos, **se dejan
quietos** y se le pregunta al usuario de quién son.

## Commits

- En **español**, Conventional Commits (`feat`, `fix`, `docs`, `style`,
  `refactor`, `test`, `chore`, `perf`, `ci`, `revert`).
- Descripción en minúsculas, sin punto final, máximo 72 caracteres.
- El cuerpo explica el **porqué**, no el qué.
- **Sin `Co-Authored-By`** ni menciones a herramientas.

## Al mergear un PR

Se borra la rama (`--delete-branch` es la norma). Una rama **sin mergear** no
se toca.

## Antes de abrir el PR

Los gates en verde, con la salida pegada como evidencia:

- **Frontend:** `npm run build`.
  `npx tsc --noEmit` **no comprueba nada** en este repo — el `tsconfig.json` de
  la raíz es un archivo de solución (`"files": []` + `references`).
- **Backend:** `tsc --noEmit` + `eslint` + `jest`.
- La ruta nueva se agrega a la colección de Bruno en `bruno/`.
