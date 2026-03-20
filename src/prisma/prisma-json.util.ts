import { Prisma } from '@prisma/client'

export type PrismaJsonInput =
  | Prisma.InputJsonValue
  | typeof Prisma.DbNull
  | typeof Prisma.JsonNull

const parseJsonString = (value: string): PrismaJsonInput => {
  try {
    const parsed = JSON.parse(value) as Prisma.InputJsonValue | null
    return parsed === null ? Prisma.JsonNull : parsed
  } catch {
    return { raw: value } as Prisma.InputJsonValue
  }
}

export const normalizeJsonInput = (
  value?: unknown
): PrismaJsonInput | undefined => {
  if (value === undefined) return undefined
  if (value === null) return Prisma.DbNull
  if (value === Prisma.DbNull || value === Prisma.JsonNull) return value

  if (typeof value === 'string') return parseJsonString(value)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'bigint') return value.toString()

  try {
    const parsed = JSON.parse(JSON.stringify(value)) as
      | Prisma.InputJsonValue
      | null
    return parsed === null ? Prisma.JsonNull : parsed
  } catch {
    return { raw: String(value) } as Prisma.InputJsonValue
  }
}
