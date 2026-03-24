import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@/auth/auth.guard';
import { SearchNotificationsQueryDto } from '@/public/dto/group/search-notifications.query.dto';
import { GroupPublicService } from '@/services/group-public.service';

@UseGuards(AuthGuard)
@Controller('notifications')
export class UserNotificationsController {
  constructor(private readonly groupPublicService: GroupPublicService) {}

  @Get()
  async list(
    @Req() req: { user?: { id?: string } },
    @Query() query: SearchNotificationsQueryDto,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.groupPublicService.listNotifications(userId, query);
  }

  @Patch(':id/read')
  async markRead(@Req() req: { user?: { id?: string } }, @Param('id') id: string) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.groupPublicService.markNotificationRead(userId, id);
  }

  @Patch('read-all')
  async markAllRead(@Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.groupPublicService.markAllNotificationsRead(userId);
  }
}
