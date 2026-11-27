import { Icon } from '@shared/ui/icons/icons'

type Props = { size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }

export function IcPollo(props: Props) {
  return (
    <Icon {...props}>
      <circle cx="15" cy="7.5" r="3" />
      <path d="M18 7.2h2.5l-2.2 1.4" />
      <path d="M12.4 9.3C8.2 9.2 4 11.2 4 14.6 4 17.5 6.7 19 10 19h2c3.3 0 5.6-2.3 5.6-5.6 0-1.3-.4-2.5-1.1-3.4" />
      <path d="M7.2 13.6c1.5 1 3.4 1 4.9 0" />
      <path d="M10 19v2M13 19v2" />
    </Icon>
  )
}
