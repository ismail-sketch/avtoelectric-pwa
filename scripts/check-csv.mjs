import { readFileSync } from 'node:fs'
import Papa from 'papaparse'

const file = process.argv[2]
const text = readFileSync(file, 'utf8')
const parsed = Papa.parse(text.trim(), { header: true, skipEmptyLines: true })

console.log('rows:', parsed.data.length)
console.log('errors:', parsed.errors)
console.log('fields:', parsed.meta.fields)
for (const [i, row] of parsed.data.entries()) {
  const missing = parsed.meta.fields.filter((f) => row[f] === undefined)
  console.log(i + 2, JSON.stringify({ id: row.id, type: row.type, missing }))
}
