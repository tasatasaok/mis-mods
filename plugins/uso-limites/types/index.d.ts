export type Tokens = { input: number; output: number; cacheRead: number; cacheWrite: number }

export type Limite = { kind: string; percentUsed: number; resetsAt?: string }

/** Último dato de límites: `at` en ms; `isFresh` false si viene de una sesión anterior. */
export type Limites = { items: Limite[]; at: number; isFresh: boolean }

declare module 'claude-code' {
  interface PluginState {
    'uso-limites': { tokens: Tokens; limites: Limites | null }
  }
}
