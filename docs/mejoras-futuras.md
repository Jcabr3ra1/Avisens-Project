# Mejoras futuras — Avisens

Lista de mejoras pendientes, ordenadas por prioridad. No son errores: el proyecto
funciona. Son el siguiente nivel de pulido y buenas prácticas.

> Última actualización: 2026-06-27

---

## 🔴 Prioridad alta

- [ ] **Proteger las rutas del frontend (guardia de sesión).**
  Hoy las páginas del panel (`/dashboard`, `/usuarios`, etc.) cargan aunque no
  hayas iniciado sesión; solo te redirige cuando una llamada a la API falla.
  → Crear un componente "ruta protegida" que mande a `/login` si no hay token.

- [ ] **Sacar los secretos del `docker-compose.yml`.**
  Los `JWT_SECRET` están escritos dentro del compose (y subidos al repo).
  → Moverlos a un archivo `.env` en la raíz (no versionado) y leerlos desde ahí.

---

## 🟡 Prioridad media

- [ ] **Agregar pruebas automatizadas.**
  Solo existe el test de ejemplo. Faltan pruebas del login y del CRUD de usuarios.
  → Unas pocas pruebas básicas suman mucho en la sustentación.

- [ ] **Conectar el botón de Logout en la interfaz.**
  La función `logout()` ya existe en `shared/api`; verificar que el botón del
  panel (Topbar) realmente la use y limpie la sesión.

- [ ] **Endpoint para listar roles.**
  Hoy los roles están "quemados" en el frontend (1=Admin, 2=Propietario, 3=Operario).
  → Crear `GET /roles` en el backend y consumirlo, para no depender de IDs fijos.

---

## 🟢 Prioridad baja (cosmético / limpieza)

- [ ] **Formatear el código con Prettier** (`npm run format` en el backend).
- [ ] **Resolver avisos de ESLint** (`react-refresh` en dashboard/landing,
  dependencia faltante en `Stats.tsx`, import `RefreshDto` sin usar).
- [ ] **Parametrizar el CORS** del backend (hoy fijo a `http://localhost:5173`).

---

## 📌 A tener presente (no es deuda, es estado del proyecto)

- Por ahora, **solo el módulo de usuarios está conectado al backend**. Las demás
  páginas (dashboard, granjas, finanzas, etc.) son **maquetas con datos de relleno**.
  El siguiente gran paso sería ir conectándolas una por una a datos reales.
