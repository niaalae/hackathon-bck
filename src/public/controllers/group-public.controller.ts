import { Controller, Get, Query } from '@nestjs/common';
import { SearchGroupsQueryDto } from '@/public/dto/group/search-groups.query.dto';
import { GroupPublicService } from '@/services/group-public.service';

@Controller('groups')
export class GroupPublicController {
  constructor(private readonly groupPublicService: GroupPublicService) {}

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
}
