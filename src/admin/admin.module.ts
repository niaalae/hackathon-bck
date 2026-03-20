import { Module } from '@nestjs/common';
import { ServicesModule } from '@/services/services.module';
import { UserController } from './controllers/user.controller';
import { CityController } from './controllers/city.controller';
import { RegionController } from './controllers/region.controller';
import { CategoryController } from './controllers/category.controller';
import { PlaceController } from './controllers/place.controller';
import { RatingController } from './controllers/rating.controller';
import { TripController } from './controllers/trip.controller';

@Module({
  imports: [ServicesModule],
  controllers: [
    UserController,
    CityController,
    RegionController,
    CategoryController,
    PlaceController,
    RatingController,
    TripController,
  ],
})
export class AdminModule {}
