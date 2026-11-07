import { BadRequestException, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import type { ComputedRoute } from '../routing/route.types';
import { ToursService, type NavigationLeg } from './tours.service';
import type { Tour } from './tour.types';

@ApiTags('tours')
@Controller('tours')
export class ToursController {
  constructor(private readonly tours: ToursService) {}

  @Get()
  list(): Tour[] {
    return this.tours.list();
  }

  @Get(':id')
  get(@Param('id') id: string): Tour {
    return this.tours.get(id);
  }

  @Get(':id/route')
  route(@Param('id') id: string): ComputedRoute {
    return this.tours.route(id);
  }

  @Post(':id/optimize')
  optimize(@Param('id') id: string): Promise<Tour> {
    return this.tours.optimize(id);
  }

  @Post(':id/reverse')
  reverse(@Param('id') id: string): Promise<Tour> {
    return this.tours.reverse(id);
  }

  @Post(':id/recalculate')
  recalculate(@Param('id') id: string): Promise<Tour> {
    return this.tours.recalculate(id);
  }

  @Get(':id/navigation')
  @ApiQuery({ name: 'stopId', required: true })
  @ApiQuery({ name: 'originLat', required: false })
  @ApiQuery({ name: 'originLng', required: false })
  navigation(
    @Param('id') id: string,
    @Query('stopId') stopId?: string,
    @Query('originLat') originLat?: string,
    @Query('originLng') originLng?: string,
  ): Promise<NavigationLeg> {
    if (!stopId) throw new BadRequestException('stopId is required');
    return this.tours.navigation(id, stopId, readOrigin(originLat, originLng));
  }
}

function readOrigin(lat?: string, lng?: string): { lat: number; lng: number } | undefined {
  if (lat === undefined && lng === undefined) return undefined;
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
    throw new BadRequestException('originLat and originLng must be numbers');
  }
  if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
    throw new BadRequestException('origin is out of range');
  }
  return { lat: parsedLat, lng: parsedLng };
}
