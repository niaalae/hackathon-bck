import '../env'
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
    super({ adapter })
  }

  async onModuleInit() {
    if (!process.env.DATABASE_URL) return
    try {
      await Promise.race([
        this.$connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Prisma connect timeout')), 2000),
        ),
      ])
    } catch (error) {
      // Allow app to boot even if DB is unreachable (local/dev)
      // eslint-disable-next-line no-console
      console.warn('Prisma connect failed, continuing without DB.', error)
    }
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
