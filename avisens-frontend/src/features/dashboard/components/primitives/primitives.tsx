import type { ReactNode, CSSProperties } from 'react'
import './primitives.css'

type CardProps = { children: ReactNode; style?: CSSProperties; id?: string }

export const Card = ({ children, style, id }: CardProps) => (
  <div className="dash-card" style={style} id={id}>{children}</div>
)

type CardTitleProps = { children: ReactNode; action?: ReactNode }

export const CardTitle = ({ children, action }: CardTitleProps) => (
  <div className="dash-card-title-row">
    <div className="dash-card-title">{children}</div>
    {action ?? <IcArrowUpSmall />}
  </div>
)

const IcArrowUpSmall = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text4)' }}>
    <path d="M7 17 17 7" />
    <path d="M9 7h8v8" />
  </svg>
)

export const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="dash-row">
    <span className="dash-row-label">{label}</span>
    <span className="mono dash-row-value">{value}</span>
  </div>
)
