import { describe, expect, it } from 'vitest'
import { CSV_TEMPLATE, parseOptions, treeFromCsv } from './treeImport'

describe('parseOptions', () => {
  it('разбирает "Да=>n1; Нет=>n2"', () => {
    expect(parseOptions('Да=>n1; Нет=>n2')).toEqual([
      { label: 'Да', next: 'n1' },
      { label: 'Нет', next: 'n2' },
    ])
  })
  it('пустая строка → []', () => {
    expect(parseOptions('')).toEqual([])
  })
  it('кривой вариант → ошибка', () => {
    expect(() => parseOptions('Да n1')).toThrow()
  })
})

describe('treeFromCsv', () => {
  it('шаблон импортируется', () => {
    const doc = treeFromCsv(CSV_TEMPLATE, { slug: 't', title: 'Тест' })
    expect(doc.rootId).toBe('q1')
    expect(Object.keys(doc.nodes)).toHaveLength(4)
    expect(doc.nodes.c1.type).toBe('check')
  })

  it('ловит битую ссылку', () => {
    const csv = `id,type,text,options,next
q1,question,Вопрос,Да=>nope,
o1,outcome,Финал,,
`
    expect(() => treeFromCsv(csv, { slug: 't', title: 'T' })).toThrow(/несуществующий/)
  })

  it('ловит дубль id', () => {
    const csv = `id,type,text,options,next
q1,question,Вопрос,Да=>o1,
q1,outcome,Финал,,
`
    expect(() => treeFromCsv(csv, { slug: 't', title: 'T' })).toThrow(/дубль/)
  })

  it('ловит неизвестный type', () => {
    const csv = `id,type,text
q1,whatever,Текст
`
    expect(() => treeFromCsv(csv, { slug: 't', title: 'T' })).toThrow(/неизвестный type/)
  })
})
