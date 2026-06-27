// How health verdicts and signals are presented in the UI. Kept in one place so
// both screens stay consistent. Status is conveyed by icon SHAPE and a text
// label, not colour alone — that keeps it readable for colour-blind users.

import type { SignalStatus, VerdictLevel } from './health'

// Verdict colours are the exact union v-alert's `type` prop expects, so the
// alert needs no cast. Signal colours additionally allow 'grey' (neutral).
type AlertColor = 'success' | 'warning' | 'error'

export const LEVEL_COLOR: Record<VerdictLevel, AlertColor> = {
  healthy: 'success',
  caution: 'warning',
  risky: 'error',
}

export const LEVEL_ICON: Record<VerdictLevel, string> = {
  healthy: 'mdi-check-circle',
  caution: 'mdi-alert-circle',
  risky: 'mdi-close-circle',
}

export const LEVEL_LABEL: Record<VerdictLevel, string> = {
  healthy: 'Healthy',
  caution: 'Caution',
  risky: 'Risky',
}

export const STATUS_COLOR: Record<SignalStatus, AlertColor | 'grey'> = {
  good: 'success',
  warn: 'warning',
  bad: 'error',
  neutral: 'grey',
}

export const STATUS_ICON: Record<SignalStatus, string> = {
  good: 'mdi-check-circle',
  warn: 'mdi-alert-circle',
  bad: 'mdi-close-circle',
  neutral: 'mdi-circle-outline',
}
