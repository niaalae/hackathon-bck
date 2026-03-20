import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { RatingService } from '@/services/rating.service';
import { PaginationQueryDto } from '@/public/dto/common/pagination-query.dto';

@Controller('ratings')
export class RatingPublicController {
  constructor(private readonly ratingService: RatingService) {}

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.ratingService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.ratingService.findOne(id);
  }
}
