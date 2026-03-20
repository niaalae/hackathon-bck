import { CanActivate, ExecutionContext, Injectable, mixin, NotFoundException, Type, UnauthorizedException } from '@nestjs/common'
import { Observable } from 'rxjs'
import { PrismaService } from '@/prisma/prisma.service'

export function RoleGuard(roles: string[]): Type<CanActivate> {
  @Injectable()
  class RoleGuardMixin implements CanActivate {
    constructor(private prismaService: PrismaService) {}
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
      const req = context.switchToHttp().getRequest()

      async function getUserAdmin(prisma: PrismaService): Promise<boolean> {
        const user = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { role: true }
        })
        if (!user) throw new NotFoundException('User Not Found')

        const allowedRoles = roles.map((role) => role.toUpperCase())
        return allowedRoles.includes(user.role)
      }

      try {
        return getUserAdmin(this.prismaService)
      } catch (e) {
        throw new UnauthorizedException('Invalid or expired token')
      }
    }
  }
  return mixin(RoleGuardMixin)
}
