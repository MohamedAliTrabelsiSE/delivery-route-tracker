import { Module } from '@nestjs/common';
import { DriverSimulator, SimulatorRunner } from '../simulator/driver-simulator';
import { TrackingModule } from '../tracking/tracking.module';
import { ToursModule } from '../tours/tours.module';
import { LiveGateway } from './live.gateway';
import { LiveService } from './live.service';
import { PositionController } from './position.controller';

@Module({
  imports: [ToursModule, TrackingModule],
  controllers: [PositionController],
  providers: [LiveService, LiveGateway, DriverSimulator, SimulatorRunner],
})
export class LiveModule {}
