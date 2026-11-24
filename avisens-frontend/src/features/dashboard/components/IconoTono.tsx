import { Icon, IcCheck, IcEgg, IcRefresh } from '@shared/ui/icons/icons'

export type TonoVisual = 'ok' | 'atencion' | 'critico' | 'sin_datos' | 'vacio' | 'revisando'

type Props = { tono: TonoVisual; size?: number }

function IconoTono({ tono, size = 22 }: Props) {
  switch (tono) {
    case 'ok':
      return (
        <Icon size={size}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12.5 3 3 5-6" />
        </Icon>
      )
    case 'atencion':
      return (
        <Icon size={size}>
          <path d="M12 4l9 16H3L12 4Z" />
          <path d="M12 10v4M12 17v.5" />
        </Icon>
      )
    case 'critico':
      return (
        <Icon size={size}>
          <path d="M8.5 3h7L21 8.5v7L15.5 21h-7L3 15.5v-7L8.5 3Z" />
          <path d="M12 8v5M12 16v.5" />
        </Icon>
      )
    case 'sin_datos':
      return (
        <Icon size={size}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8M12 16.5v.5" />
        </Icon>
      )
    case 'vacio':
      return <IcEgg size={size} />
    case 'revisando':
      return <IcRefresh size={size} />
    default:
      return <IcCheck size={size} />
  }
}

export default IconoTono
