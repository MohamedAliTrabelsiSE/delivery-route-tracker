import { Module } from '@nestjs/common';
import { routingProviders, RoutingService } from '../routing/routing.service';
import { TourStore } from './tour.store';
import { ToursController } from './tours.controller';
import { ToursService } from './tours.service';

@Module({
  controllers: [ToursController],
  providers: [TourStore, ToursService, RoutingService, ...routingProviders],
  exports: [TourStore, ToursService, RoutingService],
})
export class ToursModule {}
