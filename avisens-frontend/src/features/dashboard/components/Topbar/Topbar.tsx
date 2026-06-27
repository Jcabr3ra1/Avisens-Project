import {
  IcLeaf, IcChevronDown, IcChevronRight, IcPlus, IcClose,
  IcSearch, IcBell, IcUserCircle, IcSettings,
} from '@shared/ui/icons/icons'
import { GRANJAS, QUICK_ACTION_CATALOG, MAX_QUICK_ACTIONS } from '../../model'
import type { Granja } from '../../model'
import { useDismissable } from '@shared/hooks/useDismissable'
import './Topbar.css'

type Props = {
  granja: Granja
  granjaId: number
  setGranjaId: (id: number) => void
  granjaOpen: boolean
  setGranjaOpen: (v: boolean | ((p: boolean) => boolean)) => void

  quickActions: string[]
  addQuickAction: (id: string) => void
  removeQuickAction: (id: string) => void
  atLimit: boolean
  adderOpen: boolean
  setAdderOpen: (v: boolean | ((p: boolean) => boolean)) => void
  availableToAdd: typeof QUICK_ACTION_CATALOG

  profileOpen: boolean
  setProfileOpen: (v: boolean | ((p: boolean) => boolean)) => void
  onLogout: () => void
}

const Topbar = ({
  granja, granjaId, setGranjaId, granjaOpen, setGranjaOpen,
  quickActions, addQuickAction, removeQuickAction, atLimit, adderOpen, setAdderOpen, availableToAdd,
  profileOpen, setProfileOpen, onLogout,
}: Props) => {
  const granjaRef  = useDismissable<HTMLDivElement>(granjaOpen,  () => setGranjaOpen(false))
  const adderRef   = useDismissable<HTMLDivElement>(adderOpen,   () => setAdderOpen(false))
  const profileRef = useDismissable<HTMLDivElement>(profileOpen, () => setProfileOpen(false))

  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform)
  const cmdKey = isMac ? '⌘' : 'Ctrl'

  return (
    <header className="dash-topbar">
      {/* ── Izquierda: scope (Granja) ─────────────── */}
      <div className="dash-topbar-section dash-topbar-section-left">
        <div className="dash-granja-block" ref={granjaRef}>
          <button
            className="dash-granja-trigger"
            onClick={() => setGranjaOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={granjaOpen}
          >
            <span className="dash-granja-icon">
              <IcLeaf size={14} />
            </span>
            <div className="dash-granja-text">
              <div className="dash-granja-label">Su granja</div>
              <div className="dash-granja-name">
                {granja.nombre} <IcChevronDown size={11} />
              </div>
            </div>
          </button>
          {granjaOpen && (
            <div className="dash-granja-dropdown" role="listbox">
              <div className="dash-dropdown-label">Sus granjas</div>
              {GRANJAS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    setGranjaId(g.id)
                    setGranjaOpen(false)
                  }}
                  className={`dash-dropdown-item${g.id === granjaId ? ' dash-dropdown-item-active' : ''}`}
                  role="option"
                  aria-selected={g.id === granjaId}
                >
                  <div className={`dash-dropdown-icon${g.id === granjaId ? ' active' : ''}`}>
                    <IcLeaf size={14} />
                  </div>
                  <div className="dash-dropdown-text">
                    <div className="dash-dropdown-title">{g.nombre}</div>
                    <div className="dash-dropdown-meta">
                      {g.municipio} · {g.galpones} galpones
                    </div>
                  </div>
                </button>
              ))}
              <div className="dash-dropdown-divider">
                <button className="dash-dropdown-add">
                  <IcPlus size={14} /> Agregar otra granja
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Centro: command bar ───────────────────── */}
      <div className="dash-topbar-section dash-topbar-section-center">
        <button
          className="dash-cmdbar"
          aria-label="Buscar (atajo de comando)"
          title={`Buscar o ejecutar comando (${cmdKey}+K)`}
        >
          <IcSearch size={15} />
          <span className="dash-cmdbar-placeholder">¿Qué necesita buscar?</span>
          <span className="dash-cmdbar-kbd mono">{cmdKey}K</span>
        </button>
      </div>

      {/* ── Derecha: acciones + notif + perfil ────── */}
      <div className="dash-topbar-section dash-topbar-section-right">
        <div className="dash-quick-bar">
          {quickActions.map((id) => {
            const action = QUICK_ACTION_CATALOG.find((a) => a.id === id)
            if (!action) return null
            return (
              <div className="dash-quick-chip-wrap" key={id}>
                <button className="dash-quick-chip" style={{ color: action.color }}>
                  {action.icon}
                  <span>{action.label}</span>
                </button>
                <button
                  className="dash-quick-chip-remove"
                  onClick={() => removeQuickAction(id)}
                  aria-label={`Quitar ${action.label}`}
                  title="Quitar"
                >
                  <IcClose size={9} />
                </button>
              </div>
            )
          })}
          <div className="dash-quick-add-wrap" ref={adderRef}>
            <button
              className={`dash-quick-add${atLimit ? ' disabled' : ''}`}
              onClick={() => !atLimit && setAdderOpen((v) => !v)}
              disabled={atLimit}
              title={atLimit ? `Límite alcanzado (${MAX_QUICK_ACTIONS})` : 'Agregar acceso rápido'}
              aria-label="Agregar acceso rápido"
              aria-haspopup="menu"
              aria-expanded={adderOpen}
            >
              <IcPlus size={13} />
            </button>
            {adderOpen && (
              <div className="dash-quick-adder" role="menu">
                <div className="dash-quick-adder-head">
                  <span>Acceso rápido</span>
                  <span className="mono">
                    {quickActions.length}/{MAX_QUICK_ACTIONS}
                  </span>
                </div>
                {availableToAdd.length === 0 ? (
                  <div className="dash-quick-empty">No quedan acciones por agregar.</div>
                ) : (
                  availableToAdd.map((a) => (
                    <button
                      key={a.id}
                      className="dash-dropdown-item"
                      onClick={() => addQuickAction(a.id)}
                      role="menuitem"
                    >
                      <div className="dash-dropdown-icon" style={{ color: a.color }}>
                        {a.icon}
                      </div>
                      <div className="dash-dropdown-text">
                        <div className="dash-dropdown-title">{a.label}</div>
                      </div>
                      <IcPlus size={12} style={{ color: 'var(--text3)' }} />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <button className="dash-icon-btn" title="Notificaciones" aria-label="Notificaciones">
          <IcBell size={16} />
          <span className="dash-icon-dot" />
        </button>

        <div className="dash-topbar-profile-block" ref={profileRef}>
          <button
            className="dash-topbar-profile"
            onClick={() => setProfileOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
          >
            <div className="dash-topbar-profile-avatar">
              <span>JM</span>
              <span className="dash-topbar-profile-online" />
            </div>
            <div className="dash-topbar-profile-info">
              <div className="dash-topbar-profile-name">Juan Méndez</div>
              <div className="dash-topbar-profile-rol">Administrador</div>
            </div>
            <IcChevronDown size={12} className="dash-topbar-profile-chevron" />
          </button>
          {profileOpen && (
            <div className="dash-topbar-profile-dropdown">
              <div className="dash-topbar-profile-card">
                <div className="dash-topbar-profile-card-avatar">
                  <span>JM</span>
                  <span className="dash-topbar-profile-online" />
                </div>
                <div className="dash-topbar-profile-card-info">
                  <div className="dash-topbar-profile-card-name">Juan Méndez</div>
                  <div className="dash-topbar-profile-card-email">juanjaller7@gmail.com</div>
                </div>
              </div>
              <button className="dash-profile-item">
                <IcUserCircle size={14} /> Mi cuenta
              </button>
              <button className="dash-profile-item">
                <IcSettings size={14} /> Preferencias
              </button>
              <div className="dash-profile-divider" />
              <button
                className="dash-profile-item dash-profile-logout"
                onClick={onLogout}
              >
                <IcChevronRight size={14} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Topbar
