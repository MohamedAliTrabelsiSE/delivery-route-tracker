export type ConnectionStatus = 'connecting' | 'open' | 'closed';

export interface LiveFrame {
  event: string;
  data: unknown;
}

export interface LiveSocket {
  send(data: string): void;
  close(): void;
  addEventListener(
    type: 'open' | 'message' | 'close' | 'error',
    listener: (event: { data?: string }) => void,
  ): void;
  removeEventListener(
    type: 'open' | 'message' | 'close' | 'error',
    listener: (event: { data?: string }) => void,
  ): void;
}

const DEFAULT_BACKOFF_MS = [500, 1000, 2000, 4000, 8000];

function defaultFactory(url: string): LiveSocket {
  return new WebSocket(url);
}

/**
 * Subscribes to `/live` and reconnects with backoff until `close()` is called.
 * Messages sent before the socket is open are queued and flushed on connect.
 */
export function startLiveSession(options: {
  url: string;
  subscribe: { tourId?: string; trackingCode?: string };
  onEvent: (frame: LiveFrame) => void;
  onStatus: (status: ConnectionStatus) => void;
  socketFactory?: (url: string) => LiveSocket;
  backoffMs?: number[];
}): { close(): void; send(payload: unknown): void } {
  const factory = options.socketFactory ?? defaultFactory;
  const backoff = options.backoffMs ?? DEFAULT_BACKOFF_MS;
  let attempt = 0;
  let disposed = false;
  let socket: LiveSocket | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let open = false;
  const queue: string[] = [];

  const push = (raw: string) => {
    if (open && socket) socket.send(raw);
    else queue.push(raw);
  };

  const connect = () => {
    if (disposed) return;
    open = false;
    options.onStatus('connecting');
    const current = factory(options.url);
    socket = current;
    let failed = false;

    const onOpen = () => {
      if (disposed || socket !== current) return;
      open = true;
      attempt = 0;
      options.onStatus('open');
      push(JSON.stringify({ event: 'subscribe', data: options.subscribe }));
      while (queue.length > 0 && socket === current) current.send(queue.shift() as string);
    };

    const onMessage = (event: { data?: string }) => {
      if (!event.data) return;
      try {
        const frame = JSON.parse(event.data) as LiveFrame;
        if (frame && typeof frame.event === 'string') options.onEvent(frame);
      } catch {
        // Ignore frames that are not JSON.
      }
    };

    const fail = () => {
      if (disposed || socket !== current || failed) return;
      failed = true;
      open = false;
      options.onStatus('closed');
      const delay = backoff[Math.min(attempt, backoff.length - 1)];
      attempt += 1;
      timer = setTimeout(connect, delay);
    };

    current.addEventListener('open', onOpen);
    current.addEventListener('message', onMessage);
    current.addEventListener('close', fail);
    current.addEventListener('error', fail);
  };

  connect();

  return {
    send(payload: unknown) {
      if (!disposed) push(JSON.stringify(payload));
    },
    close() {
      disposed = true;
      open = false;
      if (timer) clearTimeout(timer);
      socket?.close();
      socket = null;
    },
  };
}
