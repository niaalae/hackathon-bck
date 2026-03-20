import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { CityService } from './city.service';
import { RegionService } from './region.service';
import { CategoryService } from './category.service';
import { PlaceService } from './place.service';
import { RatingService } from './rating.service';
import { TripService } from './trip.service';
import { TripPublicService } from './trip-public.service';
import { EmbeddingService } from './embedding.service';
import { HeroAgentService } from './hero-agent.service';
import { ChatService } from './chat.service';
import { BookingService } from './booking.service';
import { GroupPublicService } from './group-public.service';

const services = [
  UserService,
  CityService,
  RegionService,
  CategoryService,
  PlaceService,
  RatingService,
  TripService,
  TripPublicService,
  EmbeddingService,
  HeroAgentService,
  ChatService,
  BookingService,
  GroupPublicService,
];

@Module({
  providers: services,
  exports: services,
})
export class ServicesModule { }
