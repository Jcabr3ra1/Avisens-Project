export interface ChatMessage {
  role: 'user' | 'bot'
  content: string
  timestamp?: string
}

export interface Galpon {
  id: number
  x: number
  y: number
  w: number
  h: number
  score: number
  color: string
  label: string
  status: string
  sensors: Array<{ x: number; y: number; c: string }>
}

export interface FeatureItem {
  icon: string | string[]
  color: string
  bg: string
  title: string
  desc: string
}

export interface MetricItem {
  name: string
  value: string
  percent: number
  col: string
}

export interface PlanFeature {
  has: boolean
  label: string
}

export interface Plan {
  name: string
  desc: string
  monthly: number
  annual: number
  features: PlanFeature[]
  cta: string
  ctaClass: string
  featured: boolean
}

export interface Testimonial {
  text: string
  name: string
  role: string
  initials: string
}

export interface FaqItem {
  question: string
  answer: string
}
