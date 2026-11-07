import { Module } from '@nestjs/common';
import { GeocodingController } from './geocoding.controller';
import { geocodingProviders, GeocodingService } from './geocoding.service';

@Module({
  controllers: [GeocodingController],
  providers: [GeocodingService, ...geocodingProviders],
  exports: [GeocodingService],
})
export class GeocodingModule {}
