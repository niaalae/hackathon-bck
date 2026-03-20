import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { CategoryService } from '@/services/category.service';
import { PaginationQueryDto } from '@/public/dto/common/pagination-query.dto';

@Controller('categories')
export class CategoryPublicController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.categoryService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.categoryService.findOne(id);
  }
}
