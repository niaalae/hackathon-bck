import { BadRequestException, Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@/auth/auth.guard'
import { UserService } from '@/services/user.service'
import { LeaderboardService } from '@/services/leaderboard.service'
import { PlaceFeedbackDto } from '../dto/user/place-feedback.dto'

@Controller('users')
export class UserPublicController {
	constructor(
		private readonly userService: UserService,
		private readonly leaderboardService: LeaderboardService,
	) {}

	@UseGuards(AuthGuard)
	@Get('leaderboard')
	async getLeaderboard(@Req() req: { user: { id: string } }, @Query('category') category: string = 'global', @Query('cityId') cityId?: string) {
		if (category === 'city' && cityId) {
			return this.leaderboardService.getCityLeaderboard(req.user.id,cityId)
		} else if (category === 'friends' && req?.user?.id) {
			return this.leaderboardService.getFriendsLeaderboard(req.user.id)
		}

		return this.leaderboardService.getGlobalLeaderboard(req.user.id)
	}

	@UseGuards(AuthGuard)
	@Post('place-feedback')
	async placeFeedback(@Req() req: { user: { id: string } }, @Body() body: PlaceFeedbackDto) {
		const targetId = body.attractionId ?? body.placeId
		if (!targetId) throw new BadRequestException('Attraction not provided')

		return this.userService.applyPlaceFeedback(req.user.id, targetId, body.liked)
	}

	@UseGuards(AuthGuard)
	@Post('reset-vector')
	async resetVector(@Req() req: { user: { id: string } }) {
		return this.userService.resetUserVector(req.user.id)
	}
}
