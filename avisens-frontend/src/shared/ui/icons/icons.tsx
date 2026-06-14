import type { ReactNode, SVGProps } from 'react'

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  size?: number
  children?: ReactNode
}

const iconBase = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const Icon = ({ children, size = 18, style, ...rest }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    {...iconBase}
    style={{ display: 'block', ...style }}
    {...rest}
  >
    {children}
  </svg>
)

type P = Omit<IconProps, 'children'>

export const IcGrid = (p: P) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.4" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.4" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.4" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.4" />
  </Icon>
)

export const IcLeaf = (p: P) => (
  <Icon {...p}>
    <path d="M4 20c0-8 6-14 16-15-1 10-7 16-15 16-.4 0-1 0-1-1Z" />
    <path d="M4 20c4-4 8-7 14-12" />
  </Icon>
)

export const IcChart = (p: P) => (
  <Icon {...p}>
    <path d="M4 19V5" />
    <path d="M4 19h16" />
    <path d="M8 16v-4" />
    <path d="M12 16V9" />
    <path d="M16 16v-6" />
  </Icon>
)

export const IcHeart = (p: P) => (
  <Icon {...p}>
    <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.7A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z" />
  </Icon>
)

export const IcDoc = (p: P) => (
  <Icon {...p}>
    <path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20V4a.5.5 0 0 1 .5-.5Z" />
    <path d="M14 3.5V8h4" />
    <path d="M9 13h6M9 16h4" />
  </Icon>
)

export const IcBell = (p: P) => (
  <Icon {...p}>
    <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </Icon>
)

export const IcChat = (p: P) => (
  <Icon {...p}>
    <path d="M4.5 5.5h15v11h-9l-4 3.5V5.5Z" />
    <circle cx="9" cy="11" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="12" cy="11" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="15" cy="11" r="0.8" fill="currentColor" stroke="none" />
  </Icon>
)

export const IcThermo = (p: P) => (
  <Icon {...p}>
    <path d="M10 4.5a2 2 0 1 1 4 0v8.7a3.5 3.5 0 1 1-4 0V4.5Z" />
    <path d="M12 8v6" />
  </Icon>
)

export const IcDrop = (p: P) => (
  <Icon {...p}>
    <path d="M12 3.5c3.5 4 6 7.3 6 10.5a6 6 0 1 1-12 0c0-3.2 2.5-6.5 6-10.5Z" />
  </Icon>
)

export const IcFan = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="1.7" />
    <path d="M12 4.5c-.6 2.5-.6 4.4 0 5.6.6 1.2 2.3 1.8 5 1.6 0 2.4-1 4-3 5.2-2-.4-3.6-1.5-4.6-3.2-1 1.8-2.6 2.8-4.6 3.2-2-1.2-3-2.8-3-5.2 2.7.2 4.4-.4 5-1.6.6-1.2.6-3.1 0-5.6Z" />
  </Icon>
)

export const IcSeed = (p: P) => (
  <Icon {...p}>
    <path d="M7 6h10l-1 3H8L7 6Z" />
    <path d="M8 9l1.5 10.5h5L16 9" />
  </Icon>
)

export const IcSun = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3.6" />
    <path d="M12 4V2.5M12 21.5V20M20 12h1.5M2.5 12H4M17.5 6.5l1-1M5.5 18.5l1-1M17.5 17.5l1 1M5.5 5.5l1 1" />
  </Icon>
)

export const IcWind = (p: P) => (
  <Icon {...p}>
    <path d="M4 9h11a2.5 2.5 0 1 0-2.5-2.5" />
    <path d="M4 14h15a2.5 2.5 0 1 1-2.5 2.5" />
    <path d="M4 12h7" />
  </Icon>
)

export const IcCloud = (p: P) => (
  <Icon {...p}>
    <path d="M6 16.5a3.5 3.5 0 0 1 .5-7 5 5 0 0 1 9.6 1 3.5 3.5 0 0 1-.6 6.9H6Z" />
  </Icon>
)

export const IcAlert = (p: P) => (
  <Icon {...p}>
    <path d="M12 4l9 16H3L12 4Z" />
    <path d="M12 10v4M12 17v.5" />
  </Icon>
)

export const IcCal = (p: P) => (
  <Icon {...p}>
    <rect x="4" y="5" width="16" height="15" rx="1.5" />
    <path d="M4 10h16M9 3v4M15 3v4" />
  </Icon>
)

export const IcArrowUp = (p: P) => (
  <Icon {...p}>
    <path d="M7 17 17 7" />
    <path d="M9 7h8v8" />
  </Icon>
)

export const IcSend = (p: P) => (
  <Icon {...p}>
    <path d="M4 12 20 4l-3.5 16-4-7-8.5-1Z" />
  </Icon>
)

export const IcMic = (p: P) => (
  <Icon {...p}>
    <rect x="9" y="3" width="6" height="12" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
    <path d="M12 17.5V21" />
  </Icon>
)

export const IcMicOff = (p: P) => (
  <Icon {...p}>
    <path d="M3 3l18 18" />
    <path d="M9 9.5V12a3 3 0 0 0 5.1 2.1M15 11V6a3 3 0 0 0-5.7-1.3" />
    <path d="M5.5 11A6.5 6.5 0 0 0 12 17.5M18.5 11a6.5 6.5 0 0 1-1.3 3.9" />
    <path d="M12 17.5V21" />
  </Icon>
)

export const IcClose = (p: P) => (
  <Icon {...p}>
    <path d="M6 6l12 12M6 18 18 6" />
  </Icon>
)

export const IcSparkle = (p: P) => (
  <Icon {...p}>
    <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" />
    <path d="M19 16l.7 1.8L21.5 18.5l-1.8.7L19 21l-.7-1.8L16.5 18.5l1.8-.7L19 16Z" />
  </Icon>
)

export const IcUsers = (p: P) => (
  <Icon {...p}>
    <circle cx="9" cy="9" r="3.5" />
    <path d="M3 19a6 6 0 0 1 12 0" />
    <circle cx="17" cy="8" r="2.8" />
    <path d="M15.5 13.5A5 5 0 0 1 21 18" />
  </Icon>
)

export const IcChevronRight = (p: P) => (
  <Icon {...p}>
    <path d="M9 6l6 6-6 6" />
  </Icon>
)

export const IcChevronDown = (p: P) => (
  <Icon {...p}>
    <path d="M6 9l6 6 6-6" />
  </Icon>
)

export const IcPlus = (p: P) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const IcPaperclip = (p: P) => (
  <Icon {...p}>
    <path d="M20 11.5 12.5 19a5 5 0 0 1-7-7L13 4.5a3.5 3.5 0 0 1 5 5L10.5 17a2 2 0 0 1-3-3L14 7.5" />
  </Icon>
)

export const IcRefresh = (p: P) => (
  <Icon {...p}>
    <path d="M20 11a8 8 0 1 1-2.5-5.8L20 8" />
    <path d="M20 4v4h-4" />
  </Icon>
)

export const IcEgg = (p: P) => (
  <Icon {...p}>
    <path d="M12 3c4 0 7 6 7 11a7 7 0 1 1-14 0c0-5 3-11 7-11Z" />
  </Icon>
)

export const IcSearch = (p: P) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4-4" />
  </Icon>
)

export const IcSettings = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="2.5" />
    <path d="M19.4 14a1.5 1.5 0 0 0 .3 1.7l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.5 1.5 0 0 0-1.7-.3 1.5 1.5 0 0 0-.9 1.4V20a2 2 0 1 1-4 0v-.1a1.5 1.5 0 0 0-1-1.4 1.5 1.5 0 0 0-1.7.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.5 1.5 0 0 0 .3-1.7 1.5 1.5 0 0 0-1.4-.9H4a2 2 0 1 1 0-4h.1A1.5 1.5 0 0 0 5.5 9a1.5 1.5 0 0 0-.3-1.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.5 1.5 0 0 0 9.7 5 1.5 1.5 0 0 0 10.6 3.5V4a2 2 0 1 1 4 0v.1a1.5 1.5 0 0 0 .9 1.4 1.5 1.5 0 0 0 1.7-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.5 1.5 0 0 0-.3 1.7v0a1.5 1.5 0 0 0 1.4.9H20a2 2 0 1 1 0 4h-.1a1.5 1.5 0 0 0-1.4.9Z" />
  </Icon>
)

export const IcStop = (p: P) => (
  <Icon {...p}>
    <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" />
  </Icon>
)

export const IcPlay = (p: P) => (
  <Icon {...p}>
    <path d="M7 5v14l12-7L7 5Z" />
  </Icon>
)

export const IcEye = (p: P) => (
  <Icon {...p}>
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
)

export const IcCoin = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.2 14.2a2.5 2.5 0 0 0 5 0c0-1.5-1.1-2-3-2s-3-.6-3-2a2.5 2.5 0 0 1 5 0" />
    <path d="M12 7.2v9.6" />
  </Icon>
)

export const IcBox = (p: P) => (
  <Icon {...p}>
    <path d="M3.5 7.5v11a.5.5 0 0 0 .5.5h16a.5.5 0 0 0 .5-.5v-11" />
    <path d="M3 7.5l9-4 9 4-9 4-9-4Z" />
    <path d="M12 11.5v8" />
  </Icon>
)

export const IcServer = (p: P) => (
  <Icon {...p}>
    <rect x="3.5" y="4" width="17" height="7" rx="1.4" />
    <rect x="3.5" y="13" width="17" height="7" rx="1.4" />
    <path d="M7 7.5h.5M7 16.5h.5" />
    <circle cx="17" cy="7.5" r="0.4" fill="currentColor" stroke="none" />
    <circle cx="17" cy="16.5" r="0.4" fill="currentColor" stroke="none" />
  </Icon>
)

export const IcUserCircle = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="10" r="3" />
    <path d="M5.8 19a7 7 0 0 1 12.4 0" />
  </Icon>
)

export const IcSidebar = (p: P) => (
  <Icon {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <path d="M9.5 4.5v15" />
  </Icon>
)

export const IcScale = (p: P) => (
  <Icon {...p}>
    <path d="M12 4v16" />
    <path d="M8 20h8" />
    <path d="M7 8h10" />
    <path d="M5 14a3 3 0 0 0 5 0L7 8z" />
    <path d="M14 14a3 3 0 0 0 5 0l-3-6z" />
  </Icon>
)

export const IcPhone = (p: P) => (
  <Icon {...p}>
    <path d="M5 4.5h3l1.8 4.2-2.2 1.5a11 11 0 0 0 5.2 5.2l1.5-2.2 4.2 1.8v3a2 2 0 0 1-2 2A14 14 0 0 1 3 6.5a2 2 0 0 1 2-2z" />
  </Icon>
)

export const IcNote = (p: P) => (
  <Icon {...p}>
    <path d="M5 4.5h11l4 4V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1z" />
    <path d="M16 4.5v4h4" />
    <path d="M8 13h7" />
    <path d="M8 16.5h5" />
  </Icon>
)
