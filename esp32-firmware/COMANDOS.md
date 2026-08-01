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

## Salida esperada (todo funcionando)

```
=== Nodo ESP32 Avisens ===
[WiFi] Conectado. IP: 10.83.202.176
[Envío] galpon1 → temp=24.8 C  hum=69.2 %  ventilador=off
```

Prueba en vivo: calienta el DHT22 con la mano; al pasar de 30 °C, el relé hace
"clic" y el mensaje cambia a `ventilador=on`.
