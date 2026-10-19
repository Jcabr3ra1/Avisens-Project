# Comandos — Firmware ESP32 (terminal)

Recetario para compilar, subir y monitorear el nodo ESP32 desde la terminal con
PlatformIO. (En VS Code, con la extensión PlatformIO IDE, tienes los mismos como
botones: ✓ Build, → Upload, 🔌 Monitor.)

---

## Preparar la terminal (una vez por sesión)

```bash
source ~/pio-venv/bin/activate    # activa pio → verás (pio-venv) en el prompt
cd ~/programacion/Proyecto-Sena/Avisens-Project/esp32-firmware
```

Con el entorno activado, los comandos son cortos (`pio ...`).

---

## Comandos

| Qué hace | Comando |
|---|---|
| **Compilar** (verifica que no hay errores) | `pio run` |
| **Subir** al ESP32 | `pio run -t upload` |
| **Ver los datos** (monitor serie) | `pio device monitor` |
| **Subir y ver de una** (lo más usado) | `pio run -t upload -t monitor` |
| **Ver qué placa detecta el Mac** | `pio device list` |
| **Limpiar la compilación** | `pio run -t clean` |

- **Salir del monitor:** `Ctrl + C`
- El monitor toma la velocidad (115200) y el puerto automáticamente porque lee
  `platformio.ini` estando dentro de la carpeta del proyecto.

---

## Sin activar el entorno (ruta completa)

Subir + ver sin `cd` ni `activate`:

```bash
~/pio-venv/bin/pio run -t upload -t monitor \
  -d ~/programacion/Proyecto-Sena/Avisens-Project/esp32-firmware
```

Atajo de una palabra para el monitor (créalo una sola vez):

```bash
echo "alias esp32mon='~/pio-venv/bin/pio device monitor -p /dev/cu.usbserial-0001 -b 115200'" >> ~/.zshrc
source ~/.zshrc
# luego, solo:  esp32mon
```

---

## Flujo típico de trabajo

```bash
# 1. editas main.cpp ...
# 2. subes y ves el resultado de una:
pio run -t upload -t monitor
# 3. Ctrl+C cuando termines
```

---

## ⚠️ Notas

- **Un solo monitor a la vez.** Si tienes el monitor de VS Code abierto, ciérralo
  antes de abrir uno en terminal (o sale el error *"Could not exclusively lock
  port ... Resource temporarily unavailable"*). Al terminar, cierra el monitor
  con `Ctrl + C` para liberar el puerto.
- Puerto de esta placa: `/dev/cu.usbserial-0001` (chip CP2102).
- Si el upload se queda en `Connecting....`, mantén pulsado el botón **BOOT** de
  la placa hasta que empiece a escribir.

---

## Comandos del monitor serie (firmware modular de esta rama)

Con el monitor abierto se puede escribir (una línea y Enter):

| Comando | Efecto |
|---|---|
| `TARA` | Calibra el cero del HX711 con la celda vacía |
| `RELES` | Lista el estado de K1-K4 y si están en manual |
| `K1 ON`, `K2 OFF`, `BOMBA AUTO`… | Fuerza un relé o lo devuelve al automático (`K1`-`K4`, `CALEFACTOR`, `VENTILADOR`, `EXTRACTOR`, `BOMBA`) |
| `REARME` o `RESET` | Reinicia la máquina de estados desde `INIT` |

Un relé forzado por aquí queda en **manual local**: la web no puede cambiarlo.

---

## Salida esperada (todo funcionando)

> **Alcance:** la salida de ejemplo y la «prueba en vivo» de abajo son las del
> firmware monolítico de `develop` (un DHT22 y un ventilador). El firmware
> modular de esta rama imprime más información por ciclo; descríbelo según lo
> que veas en el monitor, no según este ejemplo.

```
=== Nodo ESP32 Avisens ===
[WiFi] Conectado. IP: 10.83.202.176
[Envío] GPIO 18: temp=24.8 C  hum=69.2 %
```

Prueba en vivo: calienta el DHT22 con la mano; al pasar de 30 °C, el relé hace
"clic" y el mensaje cambia a `ventilador=on`.
