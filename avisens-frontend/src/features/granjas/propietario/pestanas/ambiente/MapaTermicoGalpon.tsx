import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACESFilmicToneMapping,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  Raycaster,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { toast } from "sonner";
import { actualizarGalpon } from "@features/galpones/api/galpones";
import { listarZonas, type ZonaGalpon } from "@features/galpones/api/zonas";
import { actualizarSensor, crearSensor } from "@features/sensores/api/sensores";
import {
  listarDispositivos,
  type Dispositivo,
} from "@features/dispositivos/api/dispositivos";
import {
  cargarModeloGalpon,
  liberarGalpon,
  type GalponCargado,
} from "@features/dashboard/components/escena/modeloGalpon";
import {
  useMonitoreoAmbiental,
  type SensorVista,
} from "@features/monitoreo/hooks/useMonitoreoAmbiental";
import {
  construirTexturaTermica,
  esSensorTermicoConFalla,
  type PuntoTermico,
} from "@features/monitoreo/utils/texturaTermica";
import { getRol } from "@shared/api";
import { permisosOperativosDeGalpon } from "@shared/auth/permisos";
import { mensajeDeError } from "@shared/utils/errores";
import type { GalponConLotes } from "../../../hooks/useEstructuraGranjas";
import "./MapaTermicoGalpon.css";

// Medidas internas reales del nodo `piso` en galpon_low_poly mejorado.glb
const ANCHO_BASE_GLB = 12;
const LARGO_BASE_GLB = 30;
const ALTO_BASE_GLB = 7.33;
const COTA_PISO_TERMICO = 0.24;
const MATERIALES_TRANSLUCIDOS = new Set([
  "techo_verde",
  "cortina_amarilla",
  "muro_crema",
  "malla",
]);

interface EtiquetaPantalla {
  punto: PuntoTermico;
  x: number;
  y: number;
  visible: boolean;
}

type Props = {
  galpon: GalponConLotes;
  onIrABitacora?: (loteId: number) => void;
  onGuardado?: () => void;
};

function zonaPorCoordenadaZ(z: number, largo: number): string {
  const tercio = largo / 6;
  if (z > tercio) return "Zona 1 - Entrada";
  if (z < -tercio) return "Zona 3 - Fondo";
  return "Zona 2 - Centro";
}

export function MapaTermicoGalpon({
  galpon,
  onIrABitacora,
  onGuardado,
}: Props) {
  const puedeEditar = permisosOperativosDeGalpon(getRol()).configurar;
  const { galpones: galponesMonitoreo, recargar: recargarMonitoreo } =
    useMonitoreoAmbiental();

  const galponVivo = useMemo(
    () => galponesMonitoreo.find((g) => g.id === galpon.id) ?? null,
    [galponesMonitoreo, galpon.id],
  );

  const anchoInicial =
    galponVivo?.anchoMetros ?? ANCHO_BASE_GLB;
  const largoInicial =
    galponVivo?.largoMetros ?? LARGO_BASE_GLB;

  const [modoEdicion, setModoEdicion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [zonas, setZonas] = useState<ZonaGalpon[]>([]);
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [dimensiones, setDimensiones] = useState({
    ancho: anchoInicial,
    largo: largoInicial,
    alto: ALTO_BASE_GLB,
  });
  const [puntosEditados, setPuntosEditados] = useState<PuntoTermico[]>([]);
  const [sensorSeleccionadoId, setSensorSeleccionadoId] = useState<
    number | null
  >(null);
  const [etiquetas, setEtiquetas] = useState<EtiquetaPantalla[]>([]);

  // Formulario nuevo sensor
  const [mostrandoNuevo, setMostrandoNuevo] = useState(false);
  const [nuevoCodigo, setNuevoCodigo] = useState("");
  const [nuevoDispositivoId, setNuevoDispositivoId] = useState<number>(0);
  const [nuevaAltura, setNuevaAltura] = useState(1.8);

  const contenedorRef = useRef<HTMLDivElement>(null);
  const escenaRef = useRef<{
    mundo: Scene;
    camara: PerspectiveCamera;
    renderer: WebGLRenderer;
    controls: OrbitControls;
    galpon3D: GalponCargado;
    planoTermico: Mesh;
    esferas: Map<number, Mesh>;
  } | null>(null);

  // Puntos base desde monitoreo en vivo
  const puntosBase = useMemo<PuntoTermico[]>(() => {
    const sensoresFuente: SensorVista[] = galponVivo?.sensores ?? [];
    const sensoresTemp = sensoresFuente.filter(
      (s) =>
        s.variableUmbral === "temperatura" ||
        s.tipo.toLowerCase().includes("temp"),
    );
    const lista = sensoresTemp.length > 0 ? sensoresTemp : sensoresFuente;

    return lista.map((s, idx) => {
      const col = idx % 2 === 0 ? -2.4 : 2.4;
      const fila = ((idx % 3) - 1) * (largoInicial / 3);
      return {
        id: s.id,
        codigo: s.codigo,
        x: s.x ?? col,
        z: s.y ?? fila,
        altura: s.alturaMetros ?? 1.8,
        valor: s.valor,
        minUmbral: s.minUmbral,
        maxUmbral: s.maxUmbral,
        estado: s.estado,
        sinCalibrar: s.sinCalibrar,
        antiguedadSegundos: s.antiguedadSegundos ?? null,
      };
    });
  }, [galponVivo, largoInicial]);

  useEffect(() => {
    if (!modoEdicion) {
      setDimensiones({
        ancho: anchoInicial,
        largo: largoInicial,
        alto: ALTO_BASE_GLB,
      });
      setPuntosEditados(puntosBase);
    }
  }, [anchoInicial, largoInicial, puntosBase, modoEdicion]);

  useEffect(() => {
    void listarZonas(galpon.id)
      .then(setZonas)
      .catch(() => setZonas([]));
    if (puedeEditar) {
      void listarDispositivos()
        .then((lista) => {
          const delGalpon = lista.filter((d) => d.galpon?.id === galpon.id);
          setDispositivos(delGalpon);
          if (delGalpon[0]) setNuevoDispositivoId(delGalpon[0].id);
        })
        .catch(() => setDispositivos([]));
    }
  }, [galpon.id, puedeEditar]);

  const puntosActivos = modoEdicion ? puntosEditados : puntosBase;

  // KPIs del HUD
  const metricas = useMemo(() => {
    const operativos = puntosActivos.filter((p) => !esSensorTermicoConFalla(p));
    if (operativos.length === 0) {
      return { promedio: null, porcentajeRango: null };
    }
    const suma = operativos.reduce((acc, p) => acc + (p.valor ?? 0), 0);
    const enRango = operativos.filter((p) => p.estado === "optimo").length;
    return {
      promedio: suma / operativos.length,
      porcentajeRango: Math.round((enRango / operativos.length) * 100),
    };
  }, [puntosActivos]);

  // Inicialización de escena Three.js + OrbitControls
  useEffect(() => {
    const caja = contenedorRef.current;
    if (!caja) return;

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    caja.appendChild(renderer.domElement);

    const mundo = new Scene();
    const camara = new PerspectiveCamera(34, 1, 0.1, 400);
    camara.position.set(18, 15, 22);

    const controls = new OrbitControls(camara, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 6;
    controls.maxDistance = 65;
    controls.target.set(0, 1.5, 0);

    const ambiente = new HemisphereLight(0xf2f6fb, 0x94a3b8, 1.25);
    const sol = new DirectionalLight(0xffeccb, 1.6);
    sol.position.set(16, 26, 14);
    mundo.add(ambiente, sol);

    let cancelado = false;
    let animId = 0;

    const encuadrar = () => {
      const w = caja.clientWidth;
      const h = caja.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camara.aspect = w / h;
      camara.updateProjectionMatrix();
    };
    const obs = new ResizeObserver(encuadrar);
    obs.observe(caja);

    void cargarModeloGalpon().then((cargado) => {
      if (cancelado || !cargado) return;

      // Clonar materiales translúcidos para no alterar la vista del Dashboard
      cargado.modelo.traverse((obj) => {
        if (!(obj instanceof Mesh) || Array.isArray(obj.material)) return;
        if (MATERIALES_TRANSLUCIDOS.has(obj.material.name)) {
          const matClon = obj.material.clone();
          matClon.transparent = true;
          matClon.opacity = 0.18;
          matClon.depthWrite = false;
          matClon.needsUpdate = true;
          obj.material = matClon;
        }
      });

      const geoPlano = new PlaneGeometry(ANCHO_BASE_GLB, LARGO_BASE_GLB);
      const matPlano = new MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      });
      const planoTermico = new Mesh(geoPlano, matPlano);
      planoTermico.rotation.x = -Math.PI / 2;
      planoTermico.position.set(0, COTA_PISO_TERMICO, 0);

      mundo.add(cargado.escenario, cargado.modelo, planoTermico);
      escenaRef.current = {
        mundo,
        camara,
        renderer,
        controls,
        galpon3D: cargado,
        planoTermico,
        esferas: new Map(),
      };
      encuadrar();

      const vec = new Vector3();
      const bucle = () => {
        controls.update();
        renderer.render(mundo, camara);

        const rect = renderer.domElement.getBoundingClientRect();
        const estadoActual = escenaRef.current;
        if (estadoActual && rect.width > 0 && rect.height > 0) {
          const nuevasEtiquetas: EtiquetaPantalla[] = [];
          estadoActual.esferas.forEach((esfera) => {
            const punto = esfera.userData.punto as PuntoTermico | undefined;
            if (!punto) return;
            vec
              .set(
                esfera.position.x,
                esfera.position.y + 0.42,
                esfera.position.z,
              )
              .project(camara);
            const sx = (vec.x * 0.5 + 0.5) * rect.width;
            const sy = (-vec.y * 0.5 + 0.5) * rect.height;
            nuevasEtiquetas.push({
              punto,
              x: sx,
              y: sy,
              visible:
                vec.z <= 1 &&
                sx >= 0 &&
                sx <= rect.width &&
                sy >= 0 &&
                sy <= rect.height,
            });
          });
          setEtiquetas(nuevasEtiquetas);
        }
        animId = requestAnimationFrame(bucle);
      };
      animId = requestAnimationFrame(bucle);
    });

    return () => {
      cancelado = true;
      cancelAnimationFrame(animId);
      obs.disconnect();
      controls.dispose();
      if (escenaRef.current) {
        escenaRef.current.esferas.forEach((m) => {
          m.geometry.dispose();
          (m.material as MeshStandardMaterial).dispose();
        });
        escenaRef.current.planoTermico.geometry.dispose();
        const mat = escenaRef.current.planoTermico
          .material as MeshBasicMaterial;
        mat.map?.dispose();
        mat.dispose();
        liberarGalpon(escenaRef.current.galpon3D.modelo);
        liberarGalpon(escenaRef.current.galpon3D.escenario);
      }
      renderer.dispose();
      renderer.domElement.remove();
      escenaRef.current = null;
    };
  }, []);

  // Actualizar escala del galpón, textura térmica IDW y nodos 3D de sensores
  useEffect(() => {
    const ctx = escenaRef.current;
    if (!ctx) return;

    const sx = dimensiones.ancho / ANCHO_BASE_GLB;
    const sy = dimensiones.alto / ALTO_BASE_GLB;
    const sz = dimensiones.largo / LARGO_BASE_GLB;

    ctx.galpon3D.modelo.scale.set(sx, sy, sz);
    ctx.planoTermico.scale.set(sx, sz, 1);
    ctx.planoTermico.position.y = COTA_PISO_TERMICO * sy;

    const matPlano = ctx.planoTermico.material as MeshBasicMaterial;
    matPlano.map?.dispose();
    matPlano.map = construirTexturaTermica({
      anchoMetros: dimensiones.ancho,
      largoMetros: dimensiones.largo,
      puntos: puntosActivos,
      zonas,
      mostrarCuadricula: modoEdicion,
    });
    matPlano.needsUpdate = true;

    // Sincronizar esferas 3D de sensores
    const idsActuales = new Set(puntosActivos.map((p) => p.id));
    ctx.esferas.forEach((malla, id) => {
      if (!idsActuales.has(id)) {
        ctx.mundo.remove(malla);
        malla.geometry.dispose();
        (malla.material as MeshStandardMaterial).dispose();
        ctx.esferas.delete(id);
      }
    });

    puntosActivos.forEach((punto) => {
      let malla = ctx.esferas.get(punto.id);
      if (!malla) {
        malla = new Mesh(
          new SphereGeometry(0.26, 16, 16),
          new MeshStandardMaterial({ emissiveIntensity: 0.65 }),
        );
        ctx.mundo.add(malla);
        ctx.esferas.set(punto.id, malla);
      }
      malla.position.set(punto.x, Math.max(0.35, punto.altura), punto.z);
      malla.userData.punto = punto;
      const falla = esSensorTermicoConFalla(punto);
      const mat = malla.material as MeshStandardMaterial;
      mat.color.setHex(
        falla
          ? 0xf59e0b
          : punto.id === sensorSeleccionadoId
            ? 0x38bdf8
            : 0xffffff,
      );
      mat.emissive.setHex(falla ? 0xd97706 : 0x0284c7);
    });
  }, [dimensiones, puntosActivos, zonas, modoEdicion, sensorSeleccionadoId]);

  // Raycaster para arrastrar sensores en el plano X/Z durante Modo Edición
  useEffect(() => {
    const ctx = escenaRef.current;
    if (!modoEdicion || !puedeEditar || !ctx) return;

    const dom = ctx.renderer.domElement;
    const raycaster = new Raycaster();
    const puntero = new Vector2();
    const planoArrastre = new Plane(new Vector3(0, 1, 0), -1.8);
    const interseccion = new Vector3();
    let arrastrandoId: number | null = null;

    const actualizarPuntero = (e: globalThis.PointerEvent) => {
      const rect = dom.getBoundingClientRect();
      puntero.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      puntero.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onDown = (e: globalThis.PointerEvent) => {
      actualizarPuntero(e);
      raycaster.setFromCamera(puntero, ctx.camara);
      const hits = raycaster.intersectObjects(
        Array.from(ctx.esferas.values()),
        false,
      );
      if (hits.length > 0) {
        const punto = hits[0].object.userData.punto as PuntoTermico;
        arrastrandoId = punto.id;
        setSensorSeleccionadoId(punto.id);
        ctx.controls.enabled = false;
        planoArrastre.constant = -Math.max(0.35, punto.altura);
      }
    };

    const onMove = (e: globalThis.PointerEvent) => {
      if (arrastrandoId === null) return;
      actualizarPuntero(e);
      raycaster.setFromCamera(puntero, ctx.camara);
      if (raycaster.ray.intersectPlane(planoArrastre, interseccion)) {
        const limX = dimensiones.ancho / 2 - 0.4;
        const limZ = dimensiones.largo / 2 - 0.4;
        const nx = Number(
          Math.max(-limX, Math.min(limX, interseccion.x)).toFixed(2),
        );
        const nz = Number(
          Math.max(-limZ, Math.min(limZ, interseccion.z)).toFixed(2),
        );
        setPuntosEditados((prev) =>
          prev.map((p) =>
            p.id === arrastrandoId ? { ...p, x: nx, z: nz } : p,
          ),
        );
      }
    };

    const onUp = () => {
      if (arrastrandoId !== null) {
        arrastrandoId = null;
        ctx.controls.enabled = true;
      }
    };

    dom.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      dom.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [modoEdicion, puedeEditar, dimensiones]);

  const sensorSeleccionado =
    puntosEditados.find((p) => p.id === sensorSeleccionadoId) ?? null;

  async function handleGuardarCambios() {
    if (!puedeEditar) return;
    setGuardando(true);
    try {
      await actualizarGalpon(galpon.id, {
        ancho_metros: dimensiones.ancho,
        largo_metros: dimensiones.largo,
      });

      await Promise.all(
        puntosEditados.map((p) =>
          actualizarSensor(p.id, {
            coordenada_x: p.x,
            coordenada_y: p.z,
            altura_metros: p.altura,
          }),
        ),
      );

      await recargarMonitoreo();
      onGuardado?.();
      setModoEdicion(false);
      toast.success("Configuración térmica y ubicación de sensores guardadas.");
    } catch (err) {
      toast.error(
        mensajeDeError(err, "No se pudieron guardar los cambios del galpón."),
      );
    } finally {
      setGuardando(false);
    }
  }

  function handleCancelarEdicion() {
    setDimensiones({
      ancho: anchoInicial,
      largo: largoInicial,
      alto: ALTO_BASE_GLB,
    });
    setPuntosEditados(puntosBase);
    setSensorSeleccionadoId(null);
    setMostrandoNuevo(false);
    setModoEdicion(false);
  }

  async function handleCrearSensor() {
    if (!puedeEditar || !nuevoDispositivoId) return;
    setGuardando(true);
    try {
      const creado = await crearSensor({
        galpon_id: galpon.id,
        dispositivo_id: nuevoDispositivoId,
        codigo: nuevoCodigo.trim() || `TEMP-${Date.now().toString().slice(-4)}`,
        tipo: "temperatura",
        unidad_medida: "°C",
        coordenada_x: 0,
        coordenada_y: 0,
        altura_metros: nuevaAltura,
      });
      await recargarMonitoreo();
      onGuardado?.();
      setPuntosEditados((prev) => [
        ...prev,
        {
          id: creado.id,
          codigo: creado.codigo,
          x: creado.coordenada_x ?? 0,
          z: creado.coordenada_y ?? 0,
          altura: creado.altura_metros ?? nuevaAltura,
          valor: null,
          minUmbral: null,
          maxUmbral: null,
          estado: "offline",
          sinCalibrar: false,
          antiguedadSegundos: null,
        },
      ]);
      setSensorSeleccionadoId(creado.id);
      setMostrandoNuevo(false);
      setNuevoCodigo("");
      toast.success(
        `Sensor ${creado.codigo} registrado. Arrástralo en el plano para ubicarlo.`,
      );
    } catch (err) {
      toast.error(mensajeDeError(err, "No se pudo registrar el sensor."));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="mt-contenedor" aria-label="Mapa térmico 3D del galpón">
      <div className="mt-visor-wrap">
        <div ref={contenedorRef} className="mt-canvas" />

        {/* HUD Superior Izquierdo */}
        <div className="mt-hud">
          <span className="mt-hud-eyebrow">
            {modoEdicion
              ? "MODO EDICIÓN · PROPIETARIO"
              : `MAPA TÉRMICO EN TIEMPO REAL · ${galpon.nombre.toUpperCase()}`}
          </span>
          <div className="mt-hud-metricas">
            <div>
              <span>Promedio</span>
              <strong>
                {metricas.promedio !== null
                  ? `${metricas.promedio.toFixed(1)} °C`
                  : "Sin lectura"}
              </strong>
            </div>
            <div>
              <span>% En Rango</span>
              <strong>
                {metricas.porcentajeRango !== null
                  ? `${metricas.porcentajeRango}%`
                  : "—"}
              </strong>
            </div>
            <div>
              <span>Lote activo</span>
              <strong>
                {galpon.loteEnCurso
                  ? `${galpon.loteEnCurso.codigo} (${galponVivo?.diaVida ?? 1} d)`
                  : "Sin lote"}
              </strong>
            </div>
          </div>
        </div>

        {/* Barra de acciones Propietario */}
        {puedeEditar && (
          <div className="mt-acciones-top">
            {!modoEdicion ? (
              <button
                type="button"
                className="mt-btn mt-btn--primario"
                onClick={() => setModoEdicion(true)}
              >
                Modo Edición
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="mt-btn mt-btn--guardar"
                  onClick={() => void handleGuardarCambios()}
                  disabled={guardando}
                >
                  {guardando ? "Guardando…" : "Guardar Cambios"}
                </button>
                <button
                  type="button"
                  className="mt-btn mt-btn--cancelar"
                  onClick={handleCancelarEdicion}
                  disabled={guardando}
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        )}

        {/* Etiquetas flotantes proyectadas desde 3D */}
        <div className="mt-overlay-badges">
          {etiquetas.map(({ punto, x, y, visible }) => {
            if (!visible) return null;
            const falla = esSensorTermicoConFalla(punto);
            return (
              <div
                key={punto.id}
                className="mt-badge-anchor"
                style={{
                  transform: `translate(-50%, -100%) translate(${x}px, ${y}px)`,
                }}
              >
                {falla ? (
                  <div className="mt-badge mt-badge--alerta">
                    <span>
                      ⚠️ {punto.codigo}: Sensor sin señal - Requiere
                      mantenimiento
                    </span>
                    {galpon.loteEnCurso && onIrABitacora && (
                      <button
                        type="button"
                        className="mt-badge-bitacora"
                        onClick={() => onIrABitacora(galpon.loteEnCurso!.id)}
                      >
                        Bitácora
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSensorSeleccionadoId(punto.id)}
                    className={`mt-badge mt-badge--ok${sensorSeleccionadoId === punto.id ? " is-selected" : ""}`}
                  >
                    <span>🌡️ {punto.valor?.toFixed(1)} °C</span>
                    <small>{punto.codigo}</small>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Leyenda de escala térmica */}
        <div className="mt-leyenda">
          <span>Frío</span>
          <div className="mt-leyenda-barra" />
          <span>Óptimo</span>
          <div className="mt-leyenda-barra mt-leyenda-barra--calor" />
          <span>Crítico</span>
        </div>
      </div>

      {/* Panel lateral de Ajuste (Solo Propietario en Modo Edición) */}
      {puedeEditar && modoEdicion && (
        <aside
          className="mt-panel-edicion"
          aria-label="Ajustar galpón y sensores"
        >
          <h3>Ajustar Galpón y Sensores</h3>
          <p className="mt-panel-ayuda">
            Ajusta las dimensiones métricas y arrastra los nodos en el plano 3D
            para calibrar su ubicación.
          </p>

          <label className="mt-campo">
            <span>
              Largo (Z): <strong>{dimensiones.largo} m</strong>
            </span>
            <input
              type="range"
              min={15}
              max={60}
              step={1}
              value={dimensiones.largo}
              onChange={(e) =>
                setDimensiones((d) => ({ ...d, largo: Number(e.target.value) }))
              }
            />
          </label>

          <label className="mt-campo">
            <span>
              Ancho (X): <strong>{dimensiones.ancho} m</strong>
            </span>
            <input
              type="range"
              min={8}
              max={24}
              step={0.5}
              value={dimensiones.ancho}
              onChange={(e) =>
                setDimensiones((d) => ({ ...d, ancho: Number(e.target.value) }))
              }
            />
          </label>

          <label className="mt-campo">
            <span>
              Alto estructural: <strong>{dimensiones.alto.toFixed(1)} m</strong>
            </span>
            <input
              type="range"
              min={3.5}
              max={9}
              step={0.2}
              value={dimensiones.alto}
              onChange={(e) =>
                setDimensiones((d) => ({ ...d, alto: Number(e.target.value) }))
              }
            />
          </label>

          <hr className="mt-separador" />

          {sensorSeleccionado && (
            <div className="mt-editor-sensor">
              <h4>Sensor seleccionado: {sensorSeleccionado.codigo}</h4>
              <p className="mt-zona-tag">
                {zonaPorCoordenadaZ(sensorSeleccionado.z, dimensiones.largo)}
              </p>
              <label className="mt-campo">
                <span>
                  Altura instalación (Y):{" "}
                  <strong>{sensorSeleccionado.altura.toFixed(1)} m</strong>
                </span>
                <input
                  type="range"
                  min={0.4}
                  max={4.0}
                  step={0.1}
                  value={sensorSeleccionado.altura}
                  onChange={(e) => {
                    const nuevaY = Number(e.target.value);
                    setPuntosEditados((prev) =>
                      prev.map((p) =>
                        p.id === sensorSeleccionado.id
                          ? { ...p, altura: nuevaY }
                          : p,
                      ),
                    );
                  }}
                />
              </label>
              <small>
                Coordenadas: X {sensorSeleccionado.x} m · Z{" "}
                {sensorSeleccionado.z} m
              </small>
            </div>
          )}

          {!mostrandoNuevo ? (
            <button
              type="button"
              className="mt-btn mt-btn--secundario"
              onClick={() => setMostrandoNuevo(true)}
            >
              + Añadir Sensor
            </button>
          ) : (
            <div className="mt-nuevo-sensor">
              <h4>Nuevo sensor de temperatura</h4>
              <input
                type="text"
                placeholder="Código (ej. DHT22-05)"
                value={nuevoCodigo}
                onChange={(e) => setNuevoCodigo(e.target.value)}
              />
              {dispositivos.length > 0 ? (
                <select
                  value={nuevoDispositivoId}
                  onChange={(e) =>
                    setNuevoDispositivoId(Number(e.target.value))
                  }
                >
                  {dispositivos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre} ({d.codigo_topic})
                    </option>
                  ))}
                </select>
              ) : (
                <small className="mt-aviso-disp">
                  Registra primero un nodo ESP32 en el galpón para vincular
                  sensores.
                </small>
              )}
              <label className="mt-campo">
                <span>Altura inicial: {nuevaAltura.toFixed(1)} m</span>
                <input
                  type="range"
                  min={0.4}
                  max={4.0}
                  step={0.1}
                  value={nuevaAltura}
                  onChange={(e) => setNuevaAltura(Number(e.target.value))}
                />
              </label>
              <div className="mt-nuevo-acciones">
                <button
                  type="button"
                  className="mt-btn mt-btn--primario"
                  disabled={guardando || !nuevoDispositivoId}
                  onClick={() => void handleCrearSensor()}
                >
                  Registrar
                </button>
                <button
                  type="button"
                  className="mt-btn mt-btn--cancelar"
                  onClick={() => setMostrandoNuevo(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </aside>
      )}
    </section>
  );
}
