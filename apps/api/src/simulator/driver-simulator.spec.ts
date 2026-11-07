import { fixedClock } from '../config/clock';
import { loadConfig } from '../config/app-config';
import { OsrmRouter } from '../routing/osrm-router';
import { RoutingService } from '../routing/routing.service';
import { MockRouter, StraightLineRouter } from '../routing/straight-line';
import { TrackingService } from '../tracking/tracking.service';
import { LiveService } from '../live/live.service';
import { TourStore } from '../tours/tour.store';
import { ToursService } from '../tours/tours.service';
import { DriverSimulator, SimulatorRunner } from './driver-simulator';

describe('DriverSimulator', () => {
  async function build(simulate: boolean): Promise<{ simulator: DriverSimulator; runner: SimulatorRunner; store: TourStore }> {
    const config = loadConfig({
      ROUTING_PROVIDER: 'mock',
      SIMULATE_DRIVER: simulate ? 'true' : 'false',
      SIMULATOR_INTERVAL_MS: '2000',
      POSITION_MIN_INTERVAL_MS: '0',
      AVERAGE_SPEED_KMH: '25',
    });
    const store = new TourStore();
    const tours = new ToursService(
      store,
      new RoutingService(config, new OsrmRouter('http://unused', jest.fn()), new StraightLineRouter(25), new MockRouter(25)),
    );
    await tours.onModuleInit();
    const live = new LiveService(store, tours, new TrackingService(store, tours, config), config, fixedClock(0));
    const simulator = new DriverSimulator(store, live, config);
    return { simulator, runner: new SimulatorRunner(simulator, config), store };
  }

  it('does nothing until a route exists, then advances the driver', async () => {
    const { simulator, store } = await build(false);
    const moved = await simulator.step();
    expect(moved).not.toBeNull();
    expect(store.fix('driver-1')?.lat).toBeCloseTo(moved!.lat, 5);

    store.mutable('tour-paris')!.route = null;
    await expect(simulator.step()).resolves.toBeNull();
  });

  it('starts and stops the interval only when simulation is enabled', () => {
    jest.useFakeTimers();
    return build(true).then(({ runner, simulator }) => {
      const step = jest.spyOn(simulator, 'step').mockResolvedValue(null);
      runner.onModuleInit();
      jest.advanceTimersByTime(2000);
      expect(step).toHaveBeenCalled();
      runner.onModuleDestroy();
      step.mockClear();
      jest.advanceTimersByTime(4000);
      expect(step).not.toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  it('stays idle when simulation is off and logs a failed step', async () => {
    jest.useFakeTimers();
    const { runner, simulator } = await build(false);
    runner.onModuleInit();
    jest.advanceTimersByTime(5000);
    const failing = new SimulatorRunner(simulator, loadConfig({ SIMULATE_DRIVER: 'true', SIMULATOR_INTERVAL_MS: '1000' }));
    jest.spyOn(simulator, 'step').mockRejectedValue(new Error('boom'));
    failing.onModuleInit();
    jest.advanceTimersByTime(1000);
    failing.onModuleDestroy();
    jest.useRealTimers();
  });
});
