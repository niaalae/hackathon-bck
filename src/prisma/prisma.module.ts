import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {
  constructor() {
    if (!process.env.DATABASE_URL)
      throw Error('no database url defined in the env');
  }
}
