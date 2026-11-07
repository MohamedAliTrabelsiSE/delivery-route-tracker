import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { GeocodingService } from './geocoding.service';
import type { Place } from './geocoder';

@ApiTags('geocoding')
@Controller('geocode')
export class GeocodingController {
  constructor(private readonly geocoding: GeocodingService) {}

  @Get('search')
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false })
  async search(@Query('q') query?: string, @Query('limit') limit?: string): Promise<{ results: Place[] }> {
    if (!query || query.trim().length < 2) throw new BadRequestException('q must be at least 2 characters');
    const parsed = limit === undefined ? 5 : Number(limit);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
      throw new BadRequestException('limit must be an integer from 1 to 10');
    }
    return { results: await this.geocoding.search(query.trim(), parsed) };
  }

  @Get('reverse')
  @ApiQuery({ name: 'lat', required: true })
  @ApiQuery({ name: 'lng', required: true })
  async reverse(@Query('lat') lat?: string, @Query('lng') lng?: string): Promise<{ result: Place | null }> {
    const parsedLat = Number(lat);
    const parsedLng = Number(lng);
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
      throw new BadRequestException('lat and lng must be numbers');
    }
    if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
      throw new BadRequestException('coordinates are out of range');
    }
    return { result: await this.geocoding.reverse(parsedLat, parsedLng) };
  }
}
