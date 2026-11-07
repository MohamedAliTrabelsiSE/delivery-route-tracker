import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { WebSocket } from 'ws';
import { LiveService, type LiveClient } from './live.service';

/** WebSocket at /live. Frames are `{ "event": string, "data": object }`. */
@WebSocketGateway({ path: '/live', cors: { origin: '*' } })
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly sockets = new Map<WebSocket, LiveClient>();

  constructor(private readonly live: LiveService) {}

  handleConnection(socket: WebSocket): void {
    const client: LiveClient = {
      send: (event, data) => {
        if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ event, data }));
      },
    };
    this.sockets.set(socket, client);
    this.live.add(client);
  }

  handleDisconnect(socket: WebSocket): void {
    const client = this.sockets.get(socket);
    if (client) this.live.remove(client);
    this.sockets.delete(socket);
  }

  @SubscribeMessage('subscribe')
  onSubscribe(@ConnectedSocket() socket: WebSocket, @MessageBody() data: unknown): void {
    const client = this.sockets.get(socket);
    if (!client) return;
    try {
      this.live.subscribe(client, data);
      client.send('subscribed', { tourId: client.tourId ?? null, trackingCode: client.trackingCode ?? null });
    } catch (error) {
      client.send('error', { message: (error as Error).message });
    }
  }

  @SubscribeMessage('ping')
  onPing(): { event: 'pong'; data: { at: string } } {
    return { event: 'pong', data: { at: new Date().toISOString() } };
  }
}
