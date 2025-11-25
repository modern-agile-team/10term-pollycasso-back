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

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    jwtService = moduleRef.get(JwtService);

    await app.init();
    await app.listen(4000);
  });

  afterEach(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  afterAll(async () => {
    await app.close();
  });

  function createValidToken(): string {
    return jwtService.sign({
      sub: '1',
      nickname: 'test1',
    });
  }

  it('JWT 인증 후 WebSocket 연결 성공', (done) => {
    const token = createValidToken();

    clientSocket = io('http://localhost:4000/chat', {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
    });

    clientSocket.on('connect', () => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    clientSocket.on('error', (err) => {
      done(err);
    });
  });

  it('로비 메시지 전송 및 응답 확인', (done) => {
    const token = createValidToken();

    clientSocket = io('http://localhost:4000/chat', {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
    });

    clientSocket.on('connect', () => {
      clientSocket.emit('lobby:send', { message: 'hello' });
    });

    clientSocket.on('lobby:message', (msg: MessageResponseDto) => {
      try {
        expect(msg.senderId).toBe('1');
        expect(msg.nickname).toBe('test1');
        expect(msg.message).toBe('hello');
        expect(msg.createdAt).toBeDefined();
        done();
      } catch (err) {
        done(err);
      }
    });

    clientSocket.on('error', (err) => {
      done(err);
    });
  });
});
