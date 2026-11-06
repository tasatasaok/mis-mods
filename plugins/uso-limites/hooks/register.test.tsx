import { expect, test } from 'claude-code/testing'

import { barra, faltaPara, formatoTokens } from './register'

const bandProps = (bodyColumns = 100) =>
  ({ isWorking: false, hasSurvey: false, maxRows: 20, bodyColumns, scroll: {}, view: {} }) as never

const AHORA = Date.parse('2026-11-06T12:00:00Z')

const SEMBRADO: Record<string, unknown> = {
  tokens: { input: 12_000, output: 45_000, cacheRead: 2_200_000, cacheWrite: 43_000 },
  limites: {
    isFresh: true,
    at: AHORA,
    items: [
      { kind: 'five_hour', percentUsed: 34, resetsAt: '2026-11-06T14:15:00Z' },
      { kind: 'seven_day', percentUsed: 88.5, resetsAt: '2026-11-09T16:00:00Z' },
    ],
  },
}

test('formatos', async () => {
  expect(formatoTokens(950)).toBe('950')
  expect(formatoTokens(1_234)).toBe('1.2k')
  expect(formatoTokens(2_300_000)).toBe('2.3M')
  expect(barra(50, 10).join('')).toBe('█████░░░░░')
  expect(faltaPara('2026-11-06T14:15:00Z', AHORA)).toBe('renueva en 2 h 15 min')
  expect(faltaPara('2026-11-09T16:00:00Z', AHORA)).toBe('renueva en 3 d 4 h')
})

for (const surface of ['terminal', 'desktop'] as const) {
  test(`la franja muestra tokens y las dos barras (${surface})`, async ($, on) => {
    on('state.get', (_, e) => {
      const key = (e as { key: string }).key
      return { value: { value: SEMBRADO[key], version: 1 } }
    })
    on('clock.now', () => ({ value: AHORA }))

    const v = await $.ui.mount({ plugin: 'uso-limites', surface, component: 'AbovePrompt', props: bandProps() })

    expect((await v.find({ type: 'Text', text: /Tokens sesión/ }))?.text).toBe('Tokens sesión: 2.3M')
    expect(await v.find({ type: 'Text', text: /34% usado/ })).toBeDefined()
    expect(await v.find({ type: 'Text', text: /88.5% usado/ })).toBeDefined()
    expect((await v.find({ type: 'Text', text: /66% libre/ }))?.text).toContain('renueva en 2 h 15 min')
    const rojo = (await v.findAll({ type: 'Text', text: /^█+$/ })).map(t => String(t.props.color))
    expect(rojo).toEqual(['#16a34a', '#dc2626'])
    await v.unmount()
  })
}

test('sin datos de límites lo dice', async ($, on) => {
  on('state.get', () => ({ value: { value: undefined, version: 0 } }))
  on('clock.now', () => ({ value: AHORA }))
  const v = await $.ui.mount({ plugin: 'uso-limites', surface: 'terminal', component: 'AbovePrompt', props: bandProps() })
  expect(await v.find({ type: 'Text', text: /sin datos todavía/ })).toBeDefined()
  expect((await v.find({ type: 'Text', text: /Tokens sesión/ }))?.text).toBe('Tokens sesión: 0')
  await v.unmount()
})
