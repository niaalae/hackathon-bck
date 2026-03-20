import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { RatingService } from '@/services/rating.service';
import { CreateRatingDto } from '../dto/rating/create-rating.dto';
import { UpdateRatingDto } from '../dto/rating/update-rating.dto';

@Controller('admin/ratings')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Post()
  create(@Body() createRatingDto: CreateRatingDto) {
    return this.ratingService.create(createRatingDto);
  }

  @Get()
  findAll() {
    return this.ratingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ratingService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRatingDto: UpdateRatingDto) {
    return this.ratingService.update(id, updateRatingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ratingService.remove(id);
  }
}
