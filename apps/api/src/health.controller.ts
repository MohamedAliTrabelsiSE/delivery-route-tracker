import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { APP_CONFIG, type AppConfig } from './config/app-config';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  @Get()
  health(): {
    status: 'ok';
    routing: AppConfig['routingProvider'];
    geocoding: AppConfig['geocodingProvider'];
    simulateDriver: boolean;
    tourId: string;
  } {
    return {
      status: 'ok',
      routing: this.config.routingProvider,
      geocoding: this.config.geocodingProvider,
      simulateDriver: this.config.simulateDriver,
      tourId: this.config.tourId,
    };
  }
}
