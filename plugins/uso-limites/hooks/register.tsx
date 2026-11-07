import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionRateLimit } from 'claude-code'

import type { Limite, Limites, Tokens } from '../types'

const CERO: Tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }

const tokens = atom({ plugin: 'uso-limites', key: 'tokens' } as const, CERO)
const limites = atom({ plugin: 'uso-limites', key: 'limites' } as const, null)
const activo = atom({ plugin: 'uso-limites', key: 'activo' } as const, true)

/** Clave de $.store del interruptor On/Off, para que se recuerde entre sesiones. */
const STORE_ACTIVO = 'activo'

/** Clave de $.store donde queda el último dato de límites, para que una sesión nueva lo muestre enseguida. */
const STORE_LIMITES = 'ultimosLimites'

const NOMBRES: Record<string, string> = { five_hour: '5 h', seven_day: 'Semana' }

export function formatoTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return String(n)
}

export function barra(pct: number, ancho: number): [string, string] {
  const lleno = Math.max(0, Math.min(ancho, Math.round((pct / 100) * ancho)))
  return ['█'.repeat(lleno), '░'.repeat(ancho - lleno)]
}

export function colorDe(pct: number): string {
  if (pct >= 85) return '#dc2626'
  if (pct >= 60) return '#eab308'
  return '#16a34a'
}

/** "en 2 h 15 min" / "en 3 d 4 h" hasta el reinicio. */
export function faltaPara(resetsAt: string | undefined, ahora: number): string {
  if (!resetsAt) return ''
  const t = Date.parse(resetsAt)
  if (Number.isNaN(t)) return ''
  const min = Math.max(0, Math.round((t - ahora) / 60_000))
  if (min < 60) return `renueva en ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `renueva en ${h} h ${min % 60} min`
  return `renueva en ${Math.floor(h / 24)} d ${h % 24} h`
}

function aLimites(rl: readonly SessionRateLimit[]): Limite[] {
  return rl
    .filter(r => r.kind in NOMBRES)
    .map(r => ({ kind: r.kind, percentUsed: r.percentUsed, resetsAt: r.resetsAt }))
    .sort((a, b) => (a.kind === 'five_hour' ? -1 : b.kind === 'five_hour' ? 1 : 0))
}

async function guardarLimites($: EngineInterface, rl: readonly SessionRateLimit[]) {
  const items = aLimites(rl)
  if (items.length === 0) return
  const valor: Limites = { items, at: await $.clock.now(), isFresh: true }
  await update($, limites, () => valor)
  await $.store.set(STORE_LIMITES, valor)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    if ((await $.store.get(STORE_ACTIVO)) === false) await update($, activo, () => false)
    const usage = await $.session.usage()
    if (usage.rateLimits.length > 0) {
      await guardarLimites($, usage.rateLimits)
    } else if ((await read($, limites)) === null) {
      // Sin lectura todavía: mostramos la última conocida (de cualquier sesión), marcada como anterior.
      const previo = (await $.store.get(STORE_LIMITES)) as Limites | undefined
      if (previo && Array.isArray(previo.items)) {
        await update($, limites, () => ({ ...previo, isFresh: false }))
      }
    }
    return r
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) await guardarLimites($, e.rateLimits)
    return next(e)
  })

  // Suma lo que consumió cada turno, del hilo principal y de los subagentes.
  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    const u = r.usage ?? e.usage
    if (u) {
      await update($, tokens, t => ({
        input: t.input + u.input_tokens,
        output: t.output + u.output_tokens,
        cacheRead: t.cacheRead + u.cache_read_input_tokens,
        cacheWrite: t.cacheWrite + u.cache_creation_input_tokens,
      }))
    }
    return r
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const t = await read($, tokens)
    const l = await read($, limites)
    const on_ = await read($, activo)
    const ahora = await $.clock.now()
    const { Box, Button, Text } = $.ui.resolve(e)

    const alternar = async () => {
      const nuevo = !(await read($, activo))
      await update($, activo, () => nuevo)
      await $.store.set(STORE_ACTIVO, nuevo)
    }

    if (!on_) {
      return (
        <Box>
          <Text dimColor>Uso y límites: apagado </Text>
          <Button key="toggle" label="On" onPress={alternar} />
        </Box>
      )
    }

    const cols = e.props.bodyColumns
    const total = t.input + t.output + t.cacheRead + t.cacheWrite
    const angosto = cols < 70
    const anchoBarra = Math.max(8, Math.min(24, Math.floor((cols - 40) / 2)))

    return (
      <Box flexDirection="column">
        <Box>
          <Text bold>Tokens sesión: {formatoTokens(total)}</Text>
          <Text> </Text>
          <Button key="toggle" label="Off" onPress={alternar} />
          {angosto ? null : (
            <Text dimColor>
              {'  '}entrada {formatoTokens(t.input)} · salida {formatoTokens(t.output)} · caché {formatoTokens(t.cacheRead + t.cacheWrite)}
            </Text>
          )}
        </Box>
        {l === null ? (
          <Text dimColor>Límites: sin datos todavía (aparecen tras la primera respuesta)</Text>
        ) : (
          l.items.map(lim => {
            const [lleno, vacio] = barra(lim.percentUsed, anchoBarra)
            const color = colorDe(lim.percentUsed)
            const libre = Math.max(0, Math.round((100 - lim.percentUsed) * 10) / 10)
            return (
              <Box key={lim.kind}>
                <Text>{(NOMBRES[lim.kind] ?? lim.kind).padEnd(7)}</Text>
                <Text color={color}>{lleno}</Text>
                <Text dimColor>{vacio}</Text>
                <Text color={color} bold>
                  {' '}
                  {lim.percentUsed}% usado
                </Text>
                <Text dimColor>
                  {' '}({libre}% libre){angosto ? '' : ` · ${faltaPara(lim.resetsAt, ahora)}`}
                  {l.isFresh ? '' : ' · dato anterior'}
                </Text>
              </Box>
            )
          })
        )}
      </Box>
    )
  })
}
