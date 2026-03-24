import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@/auth/auth.guard';
import { GroupPublicService } from '@/services/group-public.service';

@UseGuards(AuthGuard)
@Controller('user/groups')
export class UserGroupsPublicController {
  constructor(private readonly groupPublicService: GroupPublicService) {}

  @Get()
  async listForCurrentUser(@Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.groupPublicService.listUserGroups(userId);
  }
}
