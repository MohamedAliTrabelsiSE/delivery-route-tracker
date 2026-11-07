import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { GeocodingModule } from './geocoding/geocoding.module';
import { HealthController } from './health.controller';
import { LiveModule } from './live/live.module';
import { TrackingModule } from './tracking/tracking.module';
import { ToursModule } from './tours/tours.module';

@Module({
  imports: [ConfigModule, ToursModule, GeocodingModule, TrackingModule, LiveModule],
  controllers: [HealthController],
})
export class AppModule {}
