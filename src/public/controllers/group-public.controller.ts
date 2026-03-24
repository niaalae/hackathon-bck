import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@/auth/auth.guard';
import { CreateGroupMessageDto } from '@/public/dto/group/create-group-message.dto';
import { CreateGroupDto } from '@/public/dto/group/create-group.dto';
import { ReviewGroupMembershipDto } from '@/public/dto/group/review-group-membership.dto';
import { SearchGroupsQueryDto } from '@/public/dto/group/search-groups.query.dto';
import { UpdateGroupDto } from '@/public/dto/group/update-group.dto';
import { UpdateGroupMemberRoleDto } from '@/public/dto/group/update-group-member-role.dto';
import { GroupPublicService } from '@/services/group-public.service';

@Controller('groups')
export class GroupPublicController {
  constructor(private readonly groupPublicService: GroupPublicService) {}

  @Get()
  findAll(@Query() query: SearchGroupsQueryDto) {
    return this.groupPublicService.search(query);
  }

  /**
   * GET /groups/search?city=&start=&end=&budget=
   *
   * Matching MVP:
   * - same city (by city id, slug, or exact name)
   * - overlapping date window
   * - optional budget within [budgetMin, budgetMax]
   *
   * Defaults:
   * - start: now (UTC)
   * - end: start + 7 days
   * - limit: 20 (max 50)
   */
  @Get('search')
  search(@Query() query: SearchGroupsQueryDto) {
    return this.groupPublicService.search(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: { user?: { id?: string } }) {
    return this.groupPublicService.findOne(id, req.user?.id);
  }

  @UseGuards(AuthGuard)
  @Post()
  async create(@Req() req: { user?: { id?: string } }, @Body() body: CreateGroupDto) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.groupPublicService.create(userId, body);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Req() req: { user?: { id?: string } },
    @Body() body: UpdateGroupDto,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.groupPublicService.updateGroup(id, userId, body);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.groupPublicService.deleteGroup(id, userId);
  }

  @UseGuards(AuthGuard)
  @Post(':id/join')
  async join(@Param('id') id: string, @Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.groupPublicService.join(id, userId);
  }

  @UseGuards(AuthGuard)
  @Delete(':id/join')
  async cancelJoin(@Param('id') id: string, @Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.groupPublicService.cancelJoin(id, userId);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/members/:userId/review')
  async reviewMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @Req() req: { user?: { id?: string } },
    @Body() body: ReviewGroupMembershipDto,
  ) {
    const reviewerId = req.user?.id;
    if (!reviewerId) throw new UnauthorizedException('User not authenticated');

    return this.groupPublicService.reviewMembership(id, reviewerId, targetUserId, body);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/members/:userId/role')
  async updateMemberRole(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @Req() req: { user?: { id?: string } },
    @Body() body: UpdateGroupMemberRoleDto,
  ) {
    const actorUserId = req.user?.id;
    if (!actorUserId) throw new UnauthorizedException('User not authenticated');

    return this.groupPublicService.updateMemberRole(id, actorUserId, targetUserId, body);
  }

  @UseGuards(AuthGuard)
  @Delete(':id/members/:userId')
  async removeMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @Req() req: { user?: { id?: string } },
  ) {
    const actorUserId = req.user?.id;
    if (!actorUserId) throw new UnauthorizedException('User not authenticated');

    return this.groupPublicService.removeMember(id, actorUserId, targetUserId);
  }

  @UseGuards(AuthGuard)
  @Get(':id/messages')
  async listMessages(@Param('id') id: string, @Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.groupPublicService.listMessages(id, userId);
  }

  @UseGuards(AuthGuard)
  @Post(':id/messages')
  async postMessage(
    @Param('id') id: string,
    @Req() req: { user?: { id?: string } },
    @Body() body: CreateGroupMessageDto,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.groupPublicService.sendMessage(id, userId, body.message);
  }
}
