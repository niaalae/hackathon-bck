import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { PlaceService } from '@/services/place.service';
import { PaginationQueryDto } from '@/public/dto/common/pagination-query.dto';

@Controller('places')
export class PlacePublicController {
  constructor(private readonly placeService: PlaceService) {}

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.placeService.findAll(query);
  }

  @Get('recommendations/:userId')
  findRecommendations(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.placeService.findRecommendedForUser(userId);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.placeService.findOne(id);
  }
}
