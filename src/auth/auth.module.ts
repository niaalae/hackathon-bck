import { Global, Module } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { AuthGuard } from './auth.guard'
import { EmbeddingService } from '@/services/embedding.service'

@Global()
@Module({
  providers: [AuthService, AuthGuard, JwtService, EmbeddingService],
  controllers: [AuthController],
  exports: [AuthGuard, JwtService]
})
export class AuthModule {}
