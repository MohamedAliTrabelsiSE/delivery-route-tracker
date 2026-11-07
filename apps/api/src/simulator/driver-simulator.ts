import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { decodePolyline, pathLengthKm, pointAlongKm } from '@tracker/geo';
import { APP_CONFIG, type AppConfig } from '../config/app-config';
import { LiveService } from '../live/live.service';
import { TourStore } from '../tours/tour.store';

/** Walks the demo driver along the current route, one tick at a time. */
@Injectable()
export class DriverSimulator {
  private cursorKm = 0;

  constructor(
    private readonly store: TourStore,
    private readonly live: LiveService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async step(): Promise<{ lat: number; lng: number } | null> {
    const tour = this.store.mutable(this.config.tourId);
    const line = tour?.route ? decodePolyline(tour.route.polyline) : [];
    if (!tour || line.length < 2) return null;
    const length = Math.max(pathLengthKm(line), 0.001);
    const advanceKm = (this.config.averageSpeedKmh / 3600) * (this.config.simulatorIntervalMs / 1000);
    this.cursorKm = (this.cursorKm + advanceKm) % length;
    const point = pointAlongKm(line, this.cursorKm);
    await this.live.updatePosition(tour.driverId, { lat: point.lat, lng: point.lng });
    return point;
  }
}

@Injectable()
export class SimulatorRunner implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SimulatorRunner.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly simulator: DriverSimulator,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  onModuleInit(): void {
    if (!this.config.simulateDriver) return;
    this.logger.log(`Simulating driver ${this.config.driverId} every ${this.config.simulatorIntervalMs}ms`);
    this.timer = setInterval(() => {
      void this.simulator.step().catch((error: Error) => this.logger.warn(error.message));
    }, this.config.simulatorIntervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
