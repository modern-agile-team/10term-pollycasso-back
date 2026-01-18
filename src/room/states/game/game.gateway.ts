import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { IGameEventPublisher } from './interfaces/game-event-publisher.interfaces';
import { Server, Socket } from 'socket.io';
import { wsError } from 'src/common/utils/ws-error.util';
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';
import { WAITING_ERROR_CODES } from 'src/waiting/constants/waiting.constant';
import { WaitingStore } from 'src/waiting/waiting.store';

@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    exceptionFactory: (errors) => {
      throw wsError(
        400,
        WAITING_ERROR_CODES.INVALID_INPUT,
        errors.map((e) => ({
          field: e.property,
          reason: Object.values(e.constraints ?? {}),
        })),
      );
    },
  }),
)
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [],
    credentials: true,
  },
  namespace: '/game',
})
export class GameGateway implements IGameEventPublisher {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(GameGateway.name);

  constructor(
    private readonly waitingState: WaitingStore,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    const auth = client.handshake.auth ?? {};
    const headers = client.handshake.headers;

    const token =
      (typeof auth.token === 'string' ? auth.token : null) ||
      (typeof headers.authorization === 'string' ? headers.authorization.split(' ')[1] : null);

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      const userId = Number(payload.sub);

      const data = {
        userId,
        nickname: payload.nickname,
        roomId: null as number | null,
        isHost: false,
      };

      const roomId = await this.waitingState.getCurrentRoom(userId);

      if (roomId) {
        data.roomId = roomId;

        const hostId = await this.waitingState.getHostId(roomId);
        data.isHost = hostId === userId;

        await client.join(`game:room:${roomId}`);
      }

      client.data = data;

      this.logger.log(
        `Connected userId=${userId}, roomId=${data.roomId ?? 'none'}, host=${data.isHost}`,
      );
    } catch {
      client.disconnect();
    }
  }

  broadcastGameState(roomId: number, payload: any) {
    this.server.to(`game:room:${roomId}`).emit('room:updateGameState', payload);
  }

  emitThemeConfirmed(roomId: number, currentTheme: string) {
    this.server.to(`game:room:${roomId}`).emit('game:themeConfirmed', { currentTheme });
  }
}
