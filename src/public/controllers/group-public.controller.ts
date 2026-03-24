import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@/auth/auth.guard';
import { CreateGroupMessageDto } from '@/public/dto/group/create-group-message.dto';
import { SearchGroupsQueryDto } from '@/public/dto/group/search-groups.query.dto';
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
  findOne(@Param('id') id: string) {
    return this.groupPublicService.findOne(id);
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
