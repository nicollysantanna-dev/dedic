import { describe, expect, it } from 'vitest'

import {
  emptyProgressEntryForm,
  entryToFormValues,
  parseProgressEntryForm,
} from '@/features/progress/progress-entry-form'

const base = { ...emptyProgressEntryForm('2026-10-02') }

describe('parseProgressEntryForm', () => {
  it('converte peso e medidas com vírgula', () => {
    const result = parseProgressEntryForm({
      ...base,
      weight: '68,5',
      measurements: { ...base.measurements, waist_cm: '74,2' },
      note: 'Manhã',
    })

    expect(result).toEqual({
      ok: true,
      value: {
        recordedOn: '2026-10-02',
        weightKg: 68.5,
        measurements: { waist_cm: 74.2 },
        note: 'Manhã',
      },
    })
  })

  it('exige peso ou ao menos uma medida', () => {
    expect(parseProgressEntryForm(base)).toEqual({
      ok: false,
      error: 'Informe o peso ou pelo menos uma medida.',
    })
  })

  it('rejeita peso fora de 20 a 400 kg', () => {
    expect(parseProgressEntryForm({ ...base, weight: '10' })).toEqual({
      ok: false,
      error: 'Informe um peso entre 20 e 400 kg.',
    })
  })

  it('rejeita medida inválida com o nome do campo', () => {
    expect(
      parseProgressEntryForm({
        ...base,
        measurements: { ...base.measurements, arm_cm: 'abc' },
      }),
    ).toEqual({ ok: false, error: 'Informe uma medida válida para braço.' })
  })
})

describe('entryToFormValues', () => {
  it('preenche o formulário a partir de um registro salvo', () => {
    expect(
      entryToFormValues({
        recorded_on: '2026-09-30',
        weight_kg: 67.9,
        measurements: { waist_cm: 73, ignored: 'x' },
        note: null,
      }),
    ).toEqual({
      recordedOn: '2026-09-30',
      weight: '67,9',
      measurements: {
        chest_cm: '',
        waist_cm: '73',
        hips_cm: '',
        arm_cm: '',
        thigh_cm: '',
      },
      note: '',
    })
  })
})
