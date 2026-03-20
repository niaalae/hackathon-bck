import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { RegionService } from '@/services/region.service';
import { PaginationQueryDto } from '@/public/dto/common/pagination-query.dto';

@Controller('regions')
export class RegionPublicController {
  constructor(private readonly regionService: RegionService) {}

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.regionService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.regionService.findOne(id);
  }
}
