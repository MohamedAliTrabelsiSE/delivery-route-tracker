import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LocationDto } from './location.dto';
import { TrackingService, type TrackingSnapshot } from './tracking.service';

@ApiTags('tracking')
@Controller('tracking')
export class TrackingController {
  constructor(private readonly tracking: TrackingService) {}

  @Get(':code')
  get(@Param('code') code: string): TrackingSnapshot {
    return this.tracking.get(code);
  }

  @Put(':code/location')
  setLocation(@Param('code') code: string, @Body() body: LocationDto): Promise<TrackingSnapshot> {
    return this.tracking.setLocation(code, body.lat, body.lng, body.label);
  }
}
