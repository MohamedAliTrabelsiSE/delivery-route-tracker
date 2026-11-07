import { startLiveSession, type LiveSocket } from '../services/live';

class FakeSocket implements LiveSocket {
  sent: string[] = [];
  private readonly listeners: Record<string, Array<(event: { data?: string }) => void>> = {};

  addEventListener(type: 'open' | 'message' | 'close' | 'error', listener: (event: { data?: string }) => void): void {
    (this.listeners[type] ??= []).push(listener);
  }

  removeEventListener(type: 'open' | 'message' | 'close' | 'error', listener: (event: { data?: string }) => void): void {
    this.listeners[type] = (this.listeners[type] ?? []).filter((item) => item !== listener);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.emit('close');
  }

  emit(type: 'open' | 'message' | 'close' | 'error', event: { data?: string } = {}): void {
    for (const listener of [...(this.listeners[type] ?? [])]) listener(event);
  }
}

describe('startLiveSession', () => {
  it('subscribes on open and flushes messages queued while connecting', () => {
    const socket = new FakeSocket();
    const session = startLiveSession({
      url: 'ws://localhost/live',
      subscribe: { tourId: 'tour-paris' },
      onEvent: () => undefined,
      onStatus: () => undefined,
      socketFactory: () => socket,
    });
    session.send({ event: 'ping', data: {} });
    expect(socket.sent).toHaveLength(0);
    socket.emit('open');
    expect(socket.sent[0]).toContain('"tourId":"tour-paris"');
    expect(socket.sent[1]).toContain('"ping"');
    session.close();
  });

  it('ignores malformed frames and forwards events', () => {
    const socket = new FakeSocket();
    const events: string[] = [];
    const session = startLiveSession({
      url: 'ws://localhost/live',
      subscribe: { trackingCode: 'TRK-1001' },
      onEvent: (frame) => events.push(frame.event),
      onStatus: () => undefined,
      socketFactory: () => socket,
    });
    socket.emit('open');
    socket.emit('message', { data: 'nope' });
    socket.emit('message', { data: JSON.stringify({ event: 'pong', data: { at: 't' } }) });
    expect(events).toEqual(['pong']);
    session.close();
  });

  it('reconnects once after the socket drops', async () => {
    const sockets: FakeSocket[] = [];
    const session = startLiveSession({
      url: 'ws://localhost/live',
      subscribe: { tourId: 'tour-paris' },
      onEvent: () => undefined,
      onStatus: () => undefined,
      backoffMs: [15],
      socketFactory: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
    });
    sockets[0].emit('error');
    sockets[0].emit('close');
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(sockets).toHaveLength(2);
    session.close();
  });
});
