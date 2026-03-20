import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { CityService } from '@/services/city.service';
import { PaginationQueryDto } from '@/public/dto/common/pagination-query.dto';

@Controller('cities')
export class CityPublicController {
  constructor(private readonly cityService: CityService) {}

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.cityService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.cityService.findOne(id);
  }
}
