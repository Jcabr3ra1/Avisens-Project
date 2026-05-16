# Guía de desarrollo — Avisens Mobile (Android + iOS)

---

## 1. Qué es este proyecto y para qué sirve

Este proyecto es la **app móvil de Avisens**. Con un solo código Kotlin produces:
- Una app para Android (APK)
- Una app para iPhone/iPad (via Xcode)

La tecnología se llama **Kotlin Multiplatform + Compose Multiplatform**.
- **Kotlin Multiplatform (KMP):** comparte la lógica (modelos, llamadas al backend, reglas de negocio)
- **Compose Multiplatform:** comparte también la UI (pantallas, botones, listas)

No es React Native ni Flutter. Es Kotlin nativo con UI propia de cada plataforma por debajo.

---

## 2. Mapa del proyecto — qué hace cada carpeta

```
avisens-android/
│
├── core/                            ← LÓGICA PURA compartida
│   └── src/commonMain/kotlin/       ← modelos, utilidades, reglas de negocio
│       └── GreetingUtil.kt          ← ejemplo: fun sayHello()
│
├── app/
│   ├── shared/                      ← UI + lógica de presentación compartida
│   │   └── src/
│   │       ├── commonMain/          ← pantallas, ViewModels (Android e iOS los usan igual)
│   │       │   ├── App.kt           ← pantalla raíz de la app
│   │       │   ├── Greeting.kt      ← lógica de saludo (ejemplo)
│   │       │   └── Platform.kt      ← expect fun getPlatform() ← ver sección 5
│   │       ├── androidMain/         ← código específico Android
│   │       │   └── Platform.android.kt  ← actual fun getPlatform() para Android
│   │       ├── iosMain/             ← código específico iOS
│   │       │   ├── Platform.ios.kt      ← actual fun getPlatform() para iOS
│   │       │   └── MainViewController.kt ← entrada de iOS a la app Compose
│   │       └── jvmMain/             ← (Desktop, puedes ignorarlo por ahora)
│   │
│   ├── androidApp/                  ← PUNTO DE ENTRADA Android
│   │   └── src/main/kotlin/
│   │       └── MainActivity.kt      ← abre la app y llama a App()
│   │
│   └── iosApp/                      ← PROYECTO XCODE (iPhone/iPad)
│       └── iosApp/
│           ├── iOSApp.swift         ← punto de entrada Swift
│           └── ContentView.swift    ← monta la UI de Kotlin dentro de iOS
│
├── gradle/
│   └── libs.versions.toml           ← AQUÍ se agregan todas las dependencias
│
└── settings.gradle.kts              ← lista los módulos del proyecto
```

### La regla de oro: ¿dónde escribo mi código?

| ¿Qué estás haciendo? | ¿Dónde va? |
|---|---|
| Modelo de datos (ej: `data class Sensor`) | `core/src/commonMain/` |
| Validación, utilidad, lógica de negocio | `core/src/commonMain/` |
| Pantalla Compose (ej: `PantallaSensores`) | `app/shared/src/commonMain/` |
| ViewModel, estado de UI | `app/shared/src/commonMain/` |
| Llamada al API (Ktor Client) | `app/shared/src/commonMain/` |
| Algo que solo existe en Android (Context, etc.) | `app/shared/src/androidMain/` |
| Algo que solo existe en iOS (UIDevice, etc.) | `app/shared/src/iosMain/` |
| **NUNCA** en `androidApp/MainActivity.kt` | `MainActivity` solo lanza `App()` |

---

## 3. Cómo corre el código — el flujo completo

### En Android

```
MainActivity.kt  →  setContent { App() }  →  App.kt (commonMain)
```

`MainActivity` no hace nada más que abrir la app. Todo el contenido está en `App.kt`.

```kotlin
// androidApp/src/main/kotlin/com/project/avisens/MainActivity.kt
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent {
            App()   // ← llama al App.kt de commonMain
        }
    }
}
```

### En iOS

```
iOSApp.swift  →  ContentView.swift  →  MainViewController (iosMain)  →  App.kt (commonMain)
```

El proyecto Xcode en Swift es solo un "contenedor". Todo el contenido real sigue siendo Kotlin.

```swift
// ContentView.swift — esto nunca lo tocas
struct ComposeView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIViewController {
        MainViewControllerKt.MainViewController()  // ← llama a Kotlin
    }
}
```

```kotlin
// iosMain/MainViewController.kt — esto tampoco lo tocas normalmente
fun MainViewController() = ComposeUIViewController { App() }  // ← llama a App.kt
```

**Conclusión:** Nunca tienes que tocar `MainActivity.kt`, `ContentView.swift` ni `iOSApp.swift`.
Solo trabajas en `commonMain`.

---

## 4. La pantalla raíz — App.kt

Este es el archivo que actualmente muestra la pantalla de inicio:

```kotlin
// app/shared/src/commonMain/kotlin/com/project/avisens/App.kt
@Composable
fun App() {
    MaterialTheme {
        var showContent by remember { mutableStateOf(false) }
        Column(
            modifier = Modifier
                .background(MaterialTheme.colorScheme.primaryContainer)
                .safeContentPadding()
                .fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Button(onClick = { showContent = !showContent }) {
                Text("Click me!")
            }
            AnimatedVisibility(showContent) {
                val greeting = remember { Greeting().greet() }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Image(painterResource(Res.drawable.compose_multiplatform), null)
                    Text("Compose: $greeting")
                }
            }
        }
    }
}
```

Este es tu lienzo en blanco. Aquí empieza todo. Cuando construyas navegación, `App()` será quien la contenga.

---

## 5. El mecanismo expect/actual — cómo funciona lo específico de cada plataforma

Cuando necesitas hacer algo que **varía entre Android e iOS** (obtener el nombre del sistema, acceder al GPS, generar un UUID, etc.) usas `expect` y `actual`.

### Cómo está implementado en tu proyecto hoy

**Paso 1 — En `commonMain` declaras QUÉ necesitas:**
```kotlin
// app/shared/src/commonMain/kotlin/com/project/avisens/Platform.kt
interface Platform {
    val name: String
}

expect fun getPlatform(): Platform   // solo la firma, sin cuerpo
```

**Paso 2 — En `androidMain` implementas el CÓMO para Android:**
```kotlin
// app/shared/src/androidMain/kotlin/com/project/avisens/Platform.android.kt
class AndroidPlatform : Platform {
    override val name: String = "Android ${Build.VERSION.SDK_INT}"
}
actual fun getPlatform(): Platform = AndroidPlatform()
```

**Paso 3 — En `iosMain` implementas el CÓMO para iOS:**
```kotlin
// app/shared/src/iosMain/kotlin/com/project/avisens/Platform.ios.kt
class IOSPlatform: Platform {
    override val name: String = UIDevice.currentDevice.systemName() + " " +
                                UIDevice.currentDevice.systemVersion
}
actual fun getPlatform(): Platform = IOSPlatform()
```

**Paso 4 — Lo usas desde `commonMain` sin saber en qué plataforma estás:**
```kotlin
// app/shared/src/commonMain/kotlin/com/project/avisens/Greeting.kt
class Greeting {
    private val platform = getPlatform()  // Kotlin elige el actual correcto
    fun greet(): String = sayHello(platform.name)
}
```

### ¿Cuándo necesito expect/actual?

| Caso | expect/actual? |
|---|---|
| Modelo de datos (`data class`) | No — va en `commonMain` directo |
| Pantalla Compose | No — va en `commonMain` directo |
| Llamada HTTP (Ktor) | Solo el motor HTTP (ver sección 8) |
| Permisos de cámara, GPS | Sí |
| Notificaciones push | Sí |
| UUID / ID único | Sí |
| Fecha y hora del sistema | No — usa `kotlinx-datetime` |
| Base de datos local | No — usa SQLDelight que ya lo maneja |

---

## 6. Compose Multiplatform — cómo hacer pantallas

Compose es el sistema de UI. Escribes pantallas en Kotlin con funciones `@Composable`.
La misma pantalla funciona en Android e iOS sin cambiar nada.

### Componentes básicos

```kotlin
// En commonMain — funciona igual en Android e iOS

// Texto
Text("Hola Avisens")

// Botón
Button(onClick = { /* acción */ }) {
    Text("Presionar")
}

// Columna vertical
Column(
    modifier = Modifier.fillMaxSize().padding(16.dp),
    verticalArrangement = Arrangement.spacedBy(8.dp)
) {
    Text("Elemento 1")
    Text("Elemento 2")
}

// Fila horizontal
Row(horizontalArrangement = Arrangement.SpaceBetween) {
    Text("Izquierda")
    Text("Derecha")
}

// Lista scrolleable
LazyColumn {
    items(listaDeSensores) { sensor ->
        Text(sensor.nombre)
    }
}

// Campo de texto
var texto by remember { mutableStateOf("") }
TextField(
    value = texto,
    onValueChange = { texto = it },
    label = { Text("Nombre") }
)
```

### Cómo agregar una pantalla nueva

1. Crea un archivo en `app/shared/src/commonMain/kotlin/com/project/avisens/`
2. Escribe una función `@Composable`
3. Llámala desde `App.kt`

```kotlin
// app/shared/src/commonMain/kotlin/com/project/avisens/PantallaSensores.kt
@Composable
fun PantallaSensores() {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text(
            text = "Sensores",
            style = MaterialTheme.typography.headlineMedium
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text("Aquí irá la lista de sensores")
    }
}
```

Luego en `App.kt` simplemente la llamas:
```kotlin
@Composable
fun App() {
    MaterialTheme {
        PantallaSensores()  // ← reemplaza el contenido demo
    }
}
```

---

## 7. Cómo ejecutar la app

### Android — desde Android Studio

1. Abre Android Studio
2. En la barra superior selecciona la configuración `androidApp`
3. Selecciona un emulador o conecta tu teléfono
4. Presiona Run ▶

O desde terminal:
```bash
# Compilar el APK de debug
./gradlew :app:androidApp:assembleDebug

# El APK queda en:
# app/androidApp/build/outputs/apk/debug/androidApp-debug.apk
```

### iOS — desde Xcode (requiere Mac)

1. Primero compila el framework de Kotlin:
```bash
./gradlew :app:shared:assembleSharedDebugXCFramework
```
2. Abre Xcode: `app/iosApp/iosApp.xcodeproj`
3. Selecciona un simulador (ej: iPhone 16)
4. Presiona Run ▶ en Xcode

> Nota: Android Studio también puede abrir el simulador de iOS si tienes Xcode instalado.
> Busca la configuración `iosApp` en el selector de run.

---

## 8. Conectar la app al backend en Go

Para que la app consuma tu API en Go necesitas **Ktor Client**.

### Paso 1 — Agregar las dependencias en `libs.versions.toml`

Abre `gradle/libs.versions.toml` y agrega:

En la sección `[versions]`:
```toml
kotlinx-coroutines = "1.11.0"    # ya existe
ktor = "3.4.3"                   # ya existe — usaremos esto para el cliente también
```

En la sección `[libraries]` agrega estas líneas:
```toml
ktor-clientCore          = { module = "io.ktor:ktor-client-core",                    version.ref = "ktor" }
ktor-clientAndroid       = { module = "io.ktor:ktor-client-android",                 version.ref = "ktor" }
ktor-clientDarwin        = { module = "io.ktor:ktor-client-darwin",                  version.ref = "ktor" }
ktor-clientContentNeg    = { module = "io.ktor:ktor-client-content-negotiation",     version.ref = "ktor" }
ktor-serializationJson   = { module = "io.ktor:ktor-serialization-kotlinx-json",     version.ref = "ktor" }
kotlinx-coroutinesCore   = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-core", version.ref = "kotlinx-coroutines" }
kotlinx-serialization    = { module = "org.jetbrains.kotlinx:kotlinx-serialization-json", version = "1.7.1" }
```

### Paso 2 — Agregar el plugin de serialización en `build.gradle.kts` raíz

Abre `build.gradle.kts` (el de la raíz del proyecto) y agrega:
```kotlin
alias(libs.plugins.kotlinSerialization) apply false
```

Y en `libs.versions.toml` sección `[plugins]`:
```toml
kotlinSerialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
```

### Paso 3 — Agregar las dependencias en `app/shared/build.gradle.kts`

```kotlin
sourceSets {
    commonMain.dependencies {
        api(projects.core)
        // ... dependencias existentes ...

        // AGREGAR ESTAS:
        implementation(libs.ktor.clientCore)
        implementation(libs.ktor.clientContentNeg)
        implementation(libs.ktor.serializationJson)
        implementation(libs.kotlinx.coroutinesCore)
        implementation(libs.kotlinx.serialization)
    }
    androidMain.dependencies {
        implementation(libs.compose.uiToolingPreview)
        implementation(libs.ktor.clientAndroid)  // AGREGAR
    }
    iosMain.dependencies {
        implementation(libs.ktor.clientDarwin)   // AGREGAR
    }
}
```

### Paso 4 — Crear el cliente HTTP en `commonMain`

```kotlin
// app/shared/src/commonMain/kotlin/com/project/avisens/network/HttpClient.kt
import io.ktor.client.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json

val httpClient = HttpClient {
    install(ContentNegotiation) {
        json(Json { ignoreUnknownKeys = true })
    }
}
```

### Paso 5 — La URL del servidor por plataforma

El emulador de Android NO puede usar `localhost` para el servidor de tu Mac.
Usa `expect/actual` para manejar esto:

```kotlin
// commonMain/kotlin/com/project/avisens/network/BaseUrl.kt
expect val BASE_URL: String
```

```kotlin
// androidMain/kotlin/com/project/avisens/network/BaseUrl.android.kt
actual val BASE_URL = "http://10.0.2.2:8080"
// 10.0.2.2 es cómo el emulador accede a tu Mac
```

```kotlin
// iosMain/kotlin/com/project/avisens/network/BaseUrl.ios.kt
actual val BASE_URL = "http://localhost:8080"
// el simulador de iOS sí puede usar localhost directamente
```

### Paso 6 — Hacer una llamada real al API

```kotlin
// commonMain/kotlin/com/project/avisens/network/SensorApi.kt
import io.ktor.client.call.*
import io.ktor.client.request.*

class SensorApi {
    suspend fun obtenerSensores(): List<Sensor> {
        return httpClient.get("$BASE_URL/api/sensores").body()
    }
}
```

---

## 9. Agregar modelos de datos

Los modelos van en `core/src/commonMain/`. Deben tener `@Serializable` para poder
convertirlos a/desde JSON automáticamente.

```kotlin
// core/src/commonMain/kotlin/com/project/avisens/Sensor.kt
import kotlinx.serialization.Serializable

@Serializable
data class Sensor(
    val id: String,
    val nombre: String,
    val tipo: String,
    val activo: Boolean
)
```

Para que funcione `@Serializable`, el módulo `core` necesita el plugin.
Agrega en `core/build.gradle.kts`:

```kotlin
plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.androidMultiplatformLibrary)
    alias(libs.plugins.kotlinSerialization)   // ← agregar
}

sourceSets {
    commonMain.dependencies {
        implementation(libs.kotlinx.serialization)   // ← agregar
    }
}
```

---

## 10. ViewModels — cómo manejar el estado de la UI

Un ViewModel guarda el estado de una pantalla y sobrevive rotaciones de pantalla y navegación.
En KMP usas `ViewModel` de AndroidX Lifecycle (ya está en tus dependencias).

```kotlin
// app/shared/src/commonMain/kotlin/com/project/avisens/SensorViewModel.kt
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class SensorViewModel : ViewModel() {

    private val api = SensorApi()

    private val _sensores = MutableStateFlow<List<Sensor>>(emptyList())
    val sensores: StateFlow<List<Sensor>> = _sensores

    private val _cargando = MutableStateFlow(false)
    val cargando: StateFlow<Boolean> = _cargando

    init {
        cargar()
    }

    fun cargar() {
        viewModelScope.launch {
            _cargando.value = true
            try {
                _sensores.value = api.obtenerSensores()
            } catch (e: Exception) {
                // manejar error
            } finally {
                _cargando.value = false
            }
        }
    }
}
```

Úsalo en una pantalla:

```kotlin
// app/shared/src/commonMain/kotlin/com/project/avisens/PantallaSensores.kt
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.runtime.collectAsState

@Composable
fun PantallaSensores(
    viewModel: SensorViewModel = viewModel { SensorViewModel() }
) {
    val sensores by viewModel.sensores.collectAsState()
    val cargando by viewModel.cargando.collectAsState()

    if (cargando) {
        CircularProgressIndicator()
    } else {
        LazyColumn {
            items(sensores) { sensor ->
                SensorItem(sensor)
            }
        }
    }
}

@Composable
private fun SensorItem(sensor: Sensor) {
    Card(modifier = Modifier.fillMaxWidth().padding(8.dp)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(sensor.nombre, style = MaterialTheme.typography.titleMedium)
            Text(sensor.tipo, style = MaterialTheme.typography.bodySmall)
        }
    }
}
```

---

## 11. Agregar una dependencia nueva

Todas las dependencias se manejan en `gradle/libs.versions.toml`. Nunca escribas versiones a mano en los `build.gradle.kts`.

### Pasos:

1. Busca la librería en [search.maven.org](https://search.maven.org)
2. Agrega la versión en `[versions]`
3. Agrega la referencia en `[libraries]`
4. Úsala en el `build.gradle.kts` correspondiente
5. Haz Gradle Sync (el botón del elefante en Android Studio, o `./gradlew build`)

### Ejemplo — agregar Koin (inyección de dependencias)

En `libs.versions.toml`:
```toml
[versions]
koin = "4.0.0"

[libraries]
koin-core = { module = "io.insert-koin:koin-core", version.ref = "koin" }
koin-compose = { module = "io.insert-koin:koin-compose", version.ref = "koin" }
```

En `app/shared/build.gradle.kts`:
```kotlin
commonMain.dependencies {
    implementation(libs.koin.core)
    implementation(libs.koin.compose)
}
```

---

## 12. Flujo completo para agregar una feature — ejemplo: pantalla de alertas

Este es el orden correcto cada vez que agregas algo nuevo:

```
1. Modelo      →  core/src/commonMain/           data class Alerta(...)
2. API call    →  app/shared/src/commonMain/      AlertaApi.kt
3. ViewModel   →  app/shared/src/commonMain/      AlertaViewModel.kt
4. Pantalla    →  app/shared/src/commonMain/      PantallaAlertas.kt
5. Conectar    →  app/shared/src/commonMain/      App.kt  (agrega la pantalla)
```

Nada de esto toca Android o iOS directamente. Las dos plataformas lo reciben gratis.

---

## 13. Navegación entre pantallas

Para navegar entre pantallas necesitas una librería de navegación. La más usada en KMP es **Voyager**.

Agrega en `libs.versions.toml`:
```toml
[versions]
voyager = "1.1.0-beta03"

[libraries]
voyager-navigator    = { module = "cafe.adriel.voyager:voyager-navigator",     version.ref = "voyager" }
voyager-screenmodel  = { module = "cafe.adriel.voyager:voyager-screenmodel",   version.ref = "voyager" }
```

En `app/shared/build.gradle.kts` → `commonMain.dependencies`:
```kotlin
implementation(libs.voyager.navigator)
implementation(libs.voyager.screenmodel)
```

Uso básico:
```kotlin
// App.kt — configura el navigator
@Composable
fun App() {
    MaterialTheme {
        Navigator(PantallaInicio())
    }
}

// Pantalla de inicio
class PantallaInicio : Screen {
    @Composable
    override fun Content() {
        val navigator = LocalNavigator.currentOrThrow
        Column {
            Text("Inicio")
            Button(onClick = { navigator.push(PantallaSensores()) }) {
                Text("Ver sensores")
            }
        }
    }
}

// Pantalla de sensores
class PantallaSensores : Screen {
    @Composable
    override fun Content() {
        val navigator = LocalNavigator.currentOrThrow
        Column {
            Button(onClick = { navigator.pop() }) {
                Text("← Volver")
            }
            Text("Lista de sensores")
        }
    }
}
```

---

## 14. Comandos útiles del día a día

```bash
# Compilar todo para verificar que no hay errores
./gradlew build

# Limpiar caché (cuando algo no funciona y no sabes por qué)
./gradlew clean

# Instalar la app en el emulador/teléfono Android conectado
./gradlew :app:androidApp:installDebug

# Ejecutar los tests
./gradlew :core:test
./gradlew :app:shared:test

# Compilar el framework para iOS (necesario antes de abrir Xcode)
./gradlew :app:shared:assembleSharedDebugXCFramework
```

---

## 15. Errores comunes y cómo resolverlos

### "Unresolved reference: X" en commonMain
Estás usando una clase que no existe en KMP puro (ej: `java.util.UUID`, `Context`).
→ Usa `expect/actual` o busca la alternativa KMP (`kotlinx-datetime`, etc.)

### El emulador Android no se conecta al servidor
El emulador usa `10.0.2.2` para acceder a tu Mac, no `localhost`.
→ Asegúrate de tener `actual val BASE_URL = "http://10.0.2.2:8080"` en `androidMain`.

### Gradle sync falla después de agregar dependencia
→ Verifica que el nombre en `libs.versions.toml` coincida exactamente con el que usas en `build.gradle.kts`.
→ Corre `./gradlew clean` y vuelve a sincronizar.

### "No actual for expect declaration"
Declaraste un `expect` en `commonMain` pero te faltó el `actual` en `androidMain` o `iosMain`.
→ Agrega el `actual` faltante.

### iOS no compila en Xcode ("module Shared not found")
→ Primero corre: `./gradlew :app:shared:assembleSharedDebugXCFramework`
→ Luego abre Xcode.

---

## 16. Resumen visual — dónde va cada cosa

```
¿Nuevo modelo de datos?
  └→ core/src/commonMain/

¿Nueva pantalla o componente visual?
  └→ app/shared/src/commonMain/

¿Nueva llamada al API?
  └→ app/shared/src/commonMain/

¿Algo que usa APIs de Android (Context, Intent, etc.)?
  └→ app/shared/src/androidMain/
     (declarar expect en commonMain primero)

¿Algo que usa APIs de iOS (UIDevice, CoreLocation, etc.)?
  └→ app/shared/src/iosMain/
     (declarar expect en commonMain primero)

¿Agregar una librería?
  └→ gradle/libs.versions.toml  (versión + referencia)
  └→ build.gradle.kts del módulo correspondiente (usarla)
```
