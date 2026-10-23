/**
 * Hover and press states as plain CSS. The base rule carries `transition`;
 * the states are separate rules on `.class:hover` and `.class:active`.
 */

import type { CssBag } from './layout'

export interface InteractionState {
  backgroundColor?: string
  opacity?: number
  /** Uniform scale. 1 means no transform. */
  scale?: number
}

export interface Interactions {
  transitionMs: number
  hover: InteractionState
  press: InteractionState
}

export interface InteractionCss {
  transition: string | null
  hover: { selector: string; styles: CssBag } | null
  press: { selector: string; styles: CssBag } | null
}

export function emptyInteractions(): Interactions {
  return { transitionMs: 180, hover: {}, press: {} }
}

export function interactionsToCss(classSelector: string, interactions: Interactions): InteractionCss {
  const hover = stateToCss(interactions.hover)
  const press = stateToCss(interactions.press)
  const active = Object.keys(hover).length > 0 || Object.keys(press).length > 0
  return {
    transition: active && interactions.transitionMs > 0
      ? `background-color ${Math.round(interactions.transitionMs)}ms ease, opacity ${Math.round(interactions.transitionMs)}ms ease, transform ${Math.round(interactions.transitionMs)}ms ease`
      : null,
    hover: Object.keys(hover).length > 0 ? { selector: `${classSelector}:hover`, styles: hover } : null,
    press: Object.keys(press).length > 0 ? { selector: `${classSelector}:active`, styles: press } : null,
  }
}

export function readInteractions(
  base: Record<string, unknown> | undefined,
  hover: Record<string, unknown> | undefined,
  press: Record<string, unknown> | undefined,
): Interactions {
  return {
    transitionMs: readTransitionMs(base?.transition),
    hover: readState(hover),
    press: readState(press),
  }
}

function stateToCss(state: InteractionState): CssBag {
  const css: CssBag = {}
  if (state.backgroundColor) css.backgroundColor = state.backgroundColor
  if (state.opacity !== undefined) css.opacity = state.opacity
  if (state.scale !== undefined && state.scale !== 1) css.transform = `scale(${state.scale})`
  return css
}

function readState(styles: Record<string, unknown> | undefined): InteractionState {
  if (!styles) return {}
  const state: InteractionState = {}
  if (typeof styles.backgroundColor === 'string') state.backgroundColor = styles.backgroundColor
  if (typeof styles.opacity === 'number') state.opacity = styles.opacity
  if (typeof styles.transform === 'string') {
    const match = /^scale\(([0-9.]+)\)$/.exec(styles.transform.trim())
    if (match) state.scale = Number(match[1])
  }
  return state
}

function readTransitionMs(value: unknown): number {
  if (typeof value !== 'string') return 180
  const match = /(\d+(?:\.\d+)?)ms/.exec(value)
  return match ? Number(match[1]) : 180
}
