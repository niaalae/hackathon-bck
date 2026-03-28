import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@/auth/auth.guard';
import { UserService } from '@/services/user.service';
import { LeaderboardService } from '@/services/leaderboard.service';
import { PlaceFeedbackDto } from '../dto/user/place-feedback.dto';

@Controller('users')
export class UserPublicController {
  constructor(
    private readonly userService: UserService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  /**
   * GET /users/leaderboard
   * Get the global leaderboard with top users ranked by score
   *
   * Query Parameters:
   * - limit (number, optional, default: 50, max: 100) - Number of entries to return
   * - offset (number, optional, default: 0) - Pagination offset
   * - category (string, optional) - 'global' (default), 'city', 'friends'
   * - cityId (string, optional) - Required when category is 'city'
   *
   * Response:
   * [
   *   {
   *     "rank": 1,
   *     "userId": "uuid",
   *     "userName": "John Doe",
   *     "userAvatar": "https://...",
   *     "totalScore": 5000,
   *     "totalXp": 1250,
   *     "level": 3,
   *     "groupsCreated": 2,
   *     "groupsJoined": 5
   *   }
   * ]
   */
  @Get('leaderboard')
  async getLeaderboard(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('category') category: string = 'global',
    @Query('cityId') cityId?: string,
    @Req() req?: any,
  ) {
    const limitNum = limit ? Math.min(Math.max(1, parseInt(limit)), 100) : 50;
    const offsetNum = offset ? Math.max(0, parseInt(offset)) : 0;

    if (category === 'city' && cityId) {
      return this.leaderboardService.getCityLeaderboard(cityId, limitNum, offsetNum);
    } else if (category === 'friends' && req?.user?.id) {
      return this.leaderboardService.getFriendsLeaderboard(req.user.id, limitNum, offsetNum);
    }

    return this.leaderboardService.getGlobalLeaderboard(limitNum, offsetNum);
  }

  @UseGuards(AuthGuard)
  @Post('place-feedback')
  async placeFeedback(@Req() req: { user?: { id?: string } }, @Body() body: PlaceFeedbackDto) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    const targetId = body.attractionId ?? body.placeId;
    if (!targetId) throw new BadRequestException('Attraction not provided');

    return this.userService.applyPlaceFeedback(userId, targetId, body.liked);
  }

  @UseGuards(AuthGuard)
  @Post('reset-vector')
  async resetVector(@Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.userService.resetUserVector(userId);
  }
}
