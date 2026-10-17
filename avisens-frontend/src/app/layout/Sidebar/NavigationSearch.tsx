import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import { IcArrowRight, IcClose, IcSearch } from '@shared/ui/icons/icons'
import { esGrupo, type NavSection } from './navConfig'
import { LINK_DETAILS, descripcionDe, navigationFilter } from './navigation'
import './NavigationSearch.css'

type Props = {
  sections: NavSection[]
  rol: string | null
  onClose: () => void
}

export default function NavigationSearch({ sections, rol, onClose }: Props) {
  const navigate = useNavigate()

  return (
    <Command.Dialog
      open
      onOpenChange={(open) => { if (!open) onClose() }}
      label="Buscar en Avisens"
      contentClassName="navigation-search-dialog"
      overlayClassName="navigation-search-overlay"
      filter={navigationFilter}
      loop
      vimBindings={false}
    >
      <div className="navigation-search-input">
        <IcSearch size={21} />
        <Command.Input autoFocus placeholder="¿A dónde quieres ir?" />
        <button type="button" onClick={onClose} aria-label="Cerrar búsqueda"><IcClose size={17} /></button>
      </div>
      <Command.List label="Secciones disponibles">
        <Command.Empty>
          <strong>No encontramos esa sección.</strong>
          <span>Prueba con «peso», «sensores» o el nombre de una sección disponible para tu rol.</span>
        </Command.Empty>
        {sections.map((section) => (
          <Command.Group key={section.label} heading={section.label}>
            {section.items.flatMap((item) => esGrupo(item) ? item.children : [item]).map((item) => (
              <Command.Item
                key={item.path}
                value={item.path}
                keywords={[item.label, ...(LINK_DETAILS[item.path]?.keywords ?? [])]}
                onSelect={() => {
                  onClose()
                  if (item.nuevaPestana) window.open(item.path, '_blank', 'noopener,noreferrer')
                  else navigate(item.path)
                }}
              >
                <span className="navigation-search-icon">{item.icon}</span>
                <span><strong>{item.label}</strong><small>{descripcionDe(item.path, rol)}</small></span>
                <IcArrowRight size={17} />
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>
      <footer className="navigation-search-footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> explorar <kbd>↵</kbd> abrir</span>
        <span><kbd>esc</kbd> cerrar</span>
      </footer>
    </Command.Dialog>
  )
}
