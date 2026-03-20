import { Module } from '@nestjs/common';
import { ServicesModule } from '@/services/services.module';
import { RegionPublicController } from './controllers/region.controller';
import { CategoryPublicController } from './controllers/category.controller';
import { CityPublicController } from './controllers/city.controller';
import { PlacePublicController } from './controllers/place.controller';
import { TripPublicController } from './controllers/trip-public.controller';
import { RatingPublicController } from './controllers/rating.controller';
import { UserPublicController } from './controllers/user.controller';
import { AgentPublicController } from './controllers/agent.controller';
import { BookingPublicController } from './controllers/booking.controller';
import { GroupPublicController } from './controllers/group-public.controller';

@Module({
  imports: [ServicesModule],
  controllers: [
    RegionPublicController,
    CategoryPublicController,
    CityPublicController,
    PlacePublicController,
    TripPublicController,
    RatingPublicController,
    UserPublicController,
    AgentPublicController,
    BookingPublicController,
    GroupPublicController,
  ],
})
export class PublicModule {}
