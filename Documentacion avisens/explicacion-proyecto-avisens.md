# Cómo funciona Avisens — explicación para todos

> Documento para explicar, de forma sencilla, qué construimos y cómo funciona.
> No necesitas ser programador para entenderlo. Usamos comparaciones de la vida real.

---

## 1. ¿Qué construimos? (resumen en una frase)

Una aplicación web donde un administrador puede **iniciar sesión** y **gestionar usuarios**
(crear, ver, editar, desactivar y volver a activar), guardando todo en una **base de datos** real.

---

## 2. Las 3 piezas del proyecto (la analogía del restaurante)

Imagina un restaurante. Nuestra aplicación tiene 3 partes que trabajan igual que un restaurante:

| Pieza del proyecto | En el restaurante es... | ¿Qué hace? | Tecnología |
|--------------------|-------------------------|------------|------------|
| **Frontend** | El **mesero / el salón** | Lo que el usuario ve y toca (botones, formularios, tablas) | React |
| **Backend** | La **cocina** | Recibe los pedidos, aplica las reglas y prepara las respuestas | NestJS |
| **Base de datos** | La **bodega / despensa** | Guarda toda la información de forma permanente | PostgreSQL |

**¿Cómo conversan entre ellos?**

```
  Usuario  →  FRONTEND  →  BACKEND  →  BASE DE DATOS
 (persona)   (el salón)   (la cocina)  (la bodega)
```

1. El usuario hace clic en un botón (ej: "Crear usuario") en el **frontend**.
2. El frontend le manda el pedido al **backend**.
3. El backend revisa que todo esté bien y guarda/consulta en la **base de datos**.
4. La respuesta regresa por el mismo camino hasta la pantalla del usuario.

> Regla de oro: **el frontend nunca toca la base de datos directamente.** Siempre pasa por el
> backend, igual que un cliente no entra a la bodega: le pide al mesero, que va a la cocina.

---

## 3. ¿Qué es Docker y por qué lo usamos?

**El problema que resuelve:** "en mi computador funciona, pero en el tuyo no". Esto pasa porque
cada quien tiene versiones distintas de los programas.

**La solución (Docker):** empaquetar cada pieza dentro de una **"caja" idéntica** que incluye
todo lo que necesita para funcionar. Esa caja se llama **contenedor**.

> Analogía: Docker es como un **contenedor de barco**. No importa en qué barco lo pongas, por
> dentro siempre va igual. Así, el proyecto corre igual en cualquier computador.

En Avisens tenemos **3 contenedores** (uno por cada pieza):

- 📦 Contenedor de la **base de datos** (PostgreSQL)
- 📦 Contenedor del **backend** (NestJS)
- 📦 Contenedor del **frontend** (servido con nginx)

Y un archivo llamado **`docker-compose.yml`** que es como el **director de orquesta**: enciende
las 3 cajas en el orden correcto y las conecta entre sí con un solo comando.

---

## 4. El detalle importante: ¿por qué "localhost" no servía?

Cuando todo corre en Docker, cada contenedor está "aislado". El navegador del usuario **no puede
ver** al backend por su nombre interno.

**La solución:** usamos **nginx** (un programa que sirve la página web) como **intermediario**.
El frontend pide los datos a una dirección que termina en `/api`, y nginx reenvía esa petición
al backend.

```
Navegador → http://localhost:8080 (nginx)
                 ├── "/"        → muestra la página web (React)
                 └── "/api/..." → reenvía a la cocina (backend)
```

> Analogía: nginx es la **recepción de un edificio**. Tú no vas directo a la oficina del fondo;
> le dices a recepción "esto es para la oficina de pedidos" y ellos lo llevan.

---

## 5. El inicio de sesión (login) y los "tokens"

Cuando inicias sesión, el sistema debe asegurarse de que eres quien dices ser, y luego
"recordarte" sin pedirte la contraseña en cada clic.

**¿Cómo lo hace? Con un "token" (una especie de pulsera de evento):**

1. Escribes tu correo y contraseña → el frontend los manda al backend.
2. El backend revisa en la base de datos que la contraseña sea correcta.
   - Las contraseñas **nunca** se guardan tal cual; se guardan **encriptadas** (con `bcrypt`),
     de modo que ni nosotros podemos leerlas. Solo se comparan.
3. Si todo está bien, el backend te entrega un **token** (un código firmado).
4. A partir de ahí, el frontend muestra ese token en cada pedido, como quien muestra la
   **pulsera** para entrar a las zonas del evento sin volver a hacer fila.

> Esta tecnología se llama **JWT** (token firmado). Lo importante: **el token reemplaza a estar
> mandando la contraseña todo el tiempo**, y es más seguro.

**Credenciales de prueba que ya existen en la base de datos:**

```
Correo:     admin@avisens.com
Contraseña: Admin1234!
```

---

## 6. El CRUD de usuarios (el corazón de lo que hicimos)

**CRUD** son las 4 operaciones básicas sobre cualquier información. La sigla viene del inglés,
pero significa esto:

| Letra | Inglés | En español | En nuestra app | Botón en pantalla |
|-------|--------|------------|----------------|-------------------|
| **C** | Create | Crear      | Registrar un usuario nuevo | "+ Nuevo usuario" |
| **R** | Read   | Leer       | Ver la lista de usuarios | (la tabla) |
| **U** | Update | Actualizar | Editar los datos de un usuario | "Editar" |
| **D** | Delete | Eliminar   | Desactivar / volver a activar | "Desactivar" / "Activar" |

**Un detalle de diseño importante (borrado lógico):**
Cuando "eliminamos" un usuario, **no lo borramos de verdad** de la base de datos. Solo lo
marcamos como **inactivo** (`activo = false`). Esto se llama **borrado lógico** y es una buena
práctica: permite **volver a activarlo** después y no se pierde el historial.

> Analogía: en vez de **romper** la ficha de un empleado, la guardas en el cajón de "inactivos".
> Si vuelve, sacas su ficha de nuevo.

---

## 7. ¿Dónde vive cada cosa? (mapa de carpetas)

```
Avisens-Project/
├── docker-compose.yml      ← el "director de orquesta" (enciende todo)
├── database/               ← la base de datos (PostgreSQL)
│   ├── Dockerfile
│   └── init/01-init.sql    ← crea las tablas y el usuario admin inicial
├── avisens-backend/        ← la "cocina" (NestJS)
│   └── src/modules/usuarios ← las reglas del CRUD de usuarios
└── avisens-frontend/       ← el "salón" (React)
    ├── nginx.conf          ← la "recepción" que conecta front y back
    └── src/features/usuarios/UsuariosPage.tsx  ← la pantalla del CRUD
```

---

## 8. Cómo encender el proyecto (paso a paso)

Solo se necesita tener **Docker** instalado. Luego, en una terminal dentro de la carpeta
`Avisens-Project`:

```bash
# Enciende las 3 piezas (base de datos, backend y frontend)
docker compose up --build
```

Cuando termine, abrir en el navegador:

| Para ver... | Dirección |
|-------------|-----------|
| La aplicación (login, usuarios) | http://localhost:8080 |
| La documentación de la API (Swagger) | http://localhost:3000/docs |

Para apagar todo: `docker compose down`

> **Tip:** si cambias código y quieres ver el cambio en Docker, hay que reconstruir con
> `docker compose up --build`. (Sin `--build` usa la versión anterior.)

---

## 9. Glosario rápido (palabras que pueden sonar raras)

| Palabra | Qué significa, en simple |
|---------|--------------------------|
| **Frontend** | La parte visual; lo que el usuario ve y usa. |
| **Backend** | La parte "del fondo"; las reglas y la lógica. |
| **Base de datos** | El lugar donde se guarda la información permanentemente. |
| **API** | El "menú" de pedidos que el backend ofrece al frontend. |
| **Endpoint** | Una dirección específica de un pedido (ej: "crear usuario"). |
| **Docker / contenedor** | Una caja que empaqueta un programa con todo lo que necesita. |
| **nginx** | La "recepción" que muestra la web y reenvía pedidos al backend. |
| **JWT / token** | La "pulsera" que prueba que ya iniciaste sesión. |
| **bcrypt** | El método para guardar contraseñas encriptadas (ilegibles). |
| **CRUD** | Crear, Leer, Actualizar y Eliminar información. |
| **Borrado lógico** | "Eliminar" marcando como inactivo, sin borrar de verdad. |
| **Prisma** | La herramienta que el backend usa para hablar con la base de datos. |

---

## 10. Resumen para la sustentación (las 5 ideas clave)

1. El proyecto tiene **3 piezas**: frontend (lo visual), backend (las reglas) y base de datos
   (donde se guarda todo). Se comunican en cadena.
2. Usamos **Docker** para que el proyecto corra igual en cualquier computador, con un solo comando.
3. El **login** verifica la identidad y entrega un **token** que evita mandar la contraseña en
   cada acción. Las contraseñas se guardan **encriptadas**.
4. Construimos un **CRUD completo de usuarios**: crear, leer, editar, desactivar y reactivar.
5. "Eliminar" no borra de verdad: usa **borrado lógico** (marca inactivo) para poder revertirlo.
```
