import type { CSSProperties } from 'react'

interface IcProps {
  d: string | string[]
  size?: number
  style?: CSSProperties
}

function Ic({ d, size = 20, style }: IcProps) {
  const paths = Array.isArray(d) ? d : [d]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {paths.map((x, i) => (
        <path key={i} d={x} />
      ))}
    </svg>
  )
}

export default Ic
