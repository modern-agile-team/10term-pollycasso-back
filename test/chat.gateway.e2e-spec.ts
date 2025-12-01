import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { MessageResponseDto } from '../src/chat/dtos/responses/message-response.dto';

describe('ChatGateway (e2e)', () => {
  let app: INestApplication;
  let clientSocket: Socket;
  let jwtService: JwtService;
  const TEST_PORT = 4000;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    jwtService = moduleRef.get(JwtService);

    await app.init();
    await app.listen(TEST_PORT);
  });

  afterAll(async () => {
    await app.close();
    clientSocket.disconnect();
  });

  afterEach(() => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
  });

  function createValidToken(): string {
    return jwtService.sign({
      sub: 'testtest1',
      nickname: 'testtest1',
    });
  }

  function createClient(token?: string): Socket {
    return io(`http://localhost:${TEST_PORT}/chat`, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      reconnection: false,
      timeout: 5000,
    });
  }

  it('JWT 인증 후 WebSocket 연결 성공', (done) => {
    const token = createValidToken();
    clientSocket = createClient(token);

    clientSocket.on('connect', () => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    clientSocket.on('connect_error', (err) => {
      done(err);
    });
  });

  it('로비 메시지 전송 및 응답 확인', (done) => {
    const token = createValidToken();
    clientSocket = createClient(token);

    clientSocket.on('lobby:message', (msg: MessageResponseDto) => {
      try {
        expect(msg.senderId).toBe('testtest1');
        expect(msg.nickname).toBe('testtest1');
        expect(msg.message).toBe('hello');
        expect(msg.createdAt).toBeDefined();
        done();
      } catch (err) {
        done(err);
      }
    });

    clientSocket.on('connect', () => {
      clientSocket.emit('lobby:send', { message: 'hello' });
    });

    clientSocket.on('connect_error', (err) => {
      done(err);
    });
  });

  it('토큰 없이 WebSocket 연결 시도 시 에러 발생', async () => {
    clientSocket = createClient();

    await new Promise<void>((resolve, reject) => {
      clientSocket.once('error', (err: { message: string }) => {
        try {
          expect(err.message).toBe('No token provided');
          resolve();
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      });

      clientSocket.once('connect_error', (err) => {
        reject(new Error(err instanceof Error ? err.message : JSON.stringify(err)));
      });
    });
  });

  it('유효하지 않은 토큰으로 WebSocket 연결 시도 시 에러 발생', async () => {
    clientSocket = createClient('INVALID_TOKEN');

    await new Promise<void>((resolve, reject) => {
      clientSocket.once('error', (err: { message: string }) => {
        try {
          expect(err.message).toBe('Invalid token');
          resolve();
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      });

      clientSocket.once('connect_error', (err) => {
        reject(new Error(err instanceof Error ? err.message : JSON.stringify(err)));
      });
    });
  });
});
