import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@/auth/auth.guard';
import { GamificationService } from '@/services/gamification.service';
import { TrackGamificationEventDto } from '../dto/gamification/track-gamification-event.dto';
import { UpdateGamificationSettingsDto } from '../dto/gamification/update-gamification-settings.dto';

@UseGuards(AuthGuard)
@Controller('gamification')
export class GamificationPublicController {
  constructor(
    private readonly gamificationService: GamificationService,
  ) {}

  @Get('overview')
  async overview(@Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.gamificationService.getOverview(userId);
  }

  @Get('settings')
  async settings(@Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.gamificationService.getSettings(userId);
  }

  @Patch('settings')
  async updateSettings(
    @Req() req: { user?: { id?: string } },
    @Body() body: UpdateGamificationSettingsDto,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.gamificationService.updateSettings(userId, body);
  }

  @Post('events')
  async trackEvent(
    @Req() req: { user?: { id?: string } },
    @Body() body: TrackGamificationEventDto,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.gamificationService.trackEvent(userId, body);
  }
}
