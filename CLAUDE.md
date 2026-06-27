# Avisens Project — Guía para Claude Code

## Convenciones de commits

Todos los commits deben estar **en español** siguiendo el estándar Conventional Commits.

### Formato

```
<tipo>(<alcance opcional>): <descripción en español>

[cuerpo opcional]

[nota de pie opcional]
```

### Tipos permitidos

| Tipo       | Cuándo usarlo                                      |
|------------|----------------------------------------------------|
| `feat`     | Nueva funcionalidad                                |
| `fix`      | Corrección de errores                              |
| `docs`     | Cambios en documentación                           |
| `style`    | Formato, estilos visuales (sin lógica)             |
| `refactor` | Refactorización sin cambio de comportamiento       |
| `test`     | Agregar o corregir pruebas                         |
| `chore`    | Tareas de mantenimiento, dependencias, config      |
| `perf`     | Mejoras de rendimiento                             |
| `ci`       | Cambios en CI/CD                                   |
| `revert`   | Revertir un commit anterior                        |

### Ejemplos correctos

```
feat(auth): agregar login con Google OAuth
fix(api): corregir error 500 al consultar sensores sin datos
docs: actualizar README con instrucciones de instalación
chore: actualizar dependencias de frontend
refactor(farm3d): extraer lógica de animación a hook separado
```

### Reglas

- Descripción en **minúsculas**, sin punto al final
- Máximo 72 caracteres en la primera línea
- Cuerpo opcional para explicar el **por qué**, no el qué
- No incluir `Co-Authored-By` ni menciones a herramientas

## Idioma general

- Código: inglés (variables, funciones, comentarios técnicos)
- Commits, PRs, issues, comentarios en GitHub: **español**
- Mensajes de UI hacia el usuario final: español
