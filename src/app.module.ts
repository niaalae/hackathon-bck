import { Module } from '@nestjs/common'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { AdminModule } from './admin/admin.module'
import { PartnerModule } from './partner/partner.module'
import { PublicModule } from './public/public.module';


@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AdminModule,
    PartnerModule,
    PublicModule,
  ]
})
export class AppModule {}
