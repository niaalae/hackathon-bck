import { CHUNK_SIZE, IMAGE_POOL } from './constants'

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const rand = mulberry32(42)

export function randInt(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min
}

export function pick<T>(items: readonly T[]): T {
  return items[randInt(0, items.length - 1)]
}

export function pickManyUnique<T>(items: readonly T[], count: number) {
  const result = new Set<T>()
  const max = Math.min(count, items.length)
  while (result.size < max) {
    result.add(pick(items))
  }
  return Array.from(result)
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

export async function createManyInBatches<T>(
  label: string,
  items: T[],
  action: (data: T[]) => Promise<unknown>,
) {
  for (const batch of chunk(items, CHUNK_SIZE)) {
    await action(batch)
  }
  console.log(`${label}: ${items.length}`)
}

export function imageFor(index: number) {
  return IMAGE_POOL[index % IMAGE_POOL.length]
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86400000)
}

export function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 3600000)
}

export function toMoney(value: number) {
  return Number(value.toFixed(2))
}
