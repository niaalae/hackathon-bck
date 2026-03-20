import { Controller, Get, Param } from '@nestjs/common';
import { TripService } from '@/services/trip.service';

@Controller('trips')
export class TripPublicController {
  constructor(private readonly tripService: TripService) {}

  @Get()
  findAll() {
    return this.tripService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tripService.findOne(id);
  }
}
