import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StandardErrorResponseDto } from 'src/common/dtos/responses/standard-error-response.dto';
import { RoomResponseDto } from './dtos/responses/room-response.dto';
import { PaginatedRoomResponseDto } from './dtos/responses/paginated-room-response.dto';

const badRequestErrors = () =>
  ApiResponse({
    status: 400,
    description: '잘못된 요청',
    type: StandardErrorResponseDto,
    examples: {
      invalidInput: {
        summary: '입력값 유효성 오류',
        value: {
          status: 400,
          code: 'INVALID_INPUT',
          errors: [{ field: 'isPrivate', reason: ['isPrivate must be a boolean value'] }],
        },
      },
      soloModePlayers: {
        summary: '솔로 모드 플레이어 수 오류',
        value: {
          status: 400,
          code: 'SOLO_MODE_PLAYERS',
          errors: [{ field: 'maxPlayers', reason: 'Solo mode allows 3-6 players only' }],
        },
      },
      teamModePlayers: {
        summary: '팀 모드 플레이어 수 오류',
        value: {
          status: 400,
          code: 'TEAM_MODE_PLAYERS',
          errors: [{ field: 'maxPlayers', reason: 'Team mode allows 4 or 6 players only' }],
        },
      },
      privateRoomPassword: {
        summary: '비공개 방 패스워드 누락',
        value: {
          status: 400,
          code: 'PRIVATE_ROOM_NEEDS_PASSWORD',
          errors: [{ field: 'password', reason: 'Private room requires a password' }],
        },
      },
    },
  });

const roomNotFoundError = () =>
  ApiResponse({
    status: 404,
    description: '존재하지 않는 리소스 요청',
    type: StandardErrorResponseDto,
    examples: {
      roomNotFound: {
        summary: '존재하지 않는 방 요청',
        value: { status: 404, code: 'ROOM_NOT_FOUND', errors: [] },
      },
    },
  });

const unauthorizedError = () =>
  ApiResponse({
    status: 401,
    description: '권한 없음',
    type: StandardErrorResponseDto,
    examples: {
      accessTokenMissing: {
        summary: 'Access token 없음',
        value: { status: 401, code: 'ACCESS_TOKEN_MISSING', errors: [] },
      },
      invalidAccessToken: {
        summary: '유효하지 않은 Access token',
        value: { status: 401, code: 'INVALID_ACCESS_TOKEN', errors: [] },
      },
      expiredAccessToken: {
        summary: '만료된 Access token',
        value: { status: 401, code: 'EXPIRED_ACCESS_TOKEN', errors: [] },
      },
    },
  });

export const ApiRoom = {
  createRoom: () =>
    applyDecorators(
      ApiCookieAuth('accessToken'),
      ApiOperation({ summary: '새로운 방 생성' }),
      ApiResponse({ status: 201, description: '방 생성 성공', type: RoomResponseDto }),
      badRequestErrors(),
      unauthorizedError(),
    ),

  getAllRooms: () =>
    applyDecorators(
      ApiCookieAuth('accessToken'),
      ApiOperation({ summary: '모든 방 조회' }),
      ApiResponse({
        status: 200,
        description: '방 목록 조회 성공',
        type: PaginatedRoomResponseDto,
      }),
      unauthorizedError(),
      roomNotFoundError(),
    ),

  getOneRoom: () =>
    applyDecorators(
      ApiCookieAuth('accessToken'),
      ApiOperation({ summary: '단일 방 조회' }),
      ApiResponse({ status: 200, description: '방 조회 성공', type: RoomResponseDto }),
      roomNotFoundError(),
      unauthorizedError(),
    ),

  removeRoom: () =>
    applyDecorators(
      ApiCookieAuth('accessToken'),
      ApiOperation({ summary: '방 삭제' }),
      ApiResponse({ status: 204, description: '방 삭제 성공' }),
      roomNotFoundError(),
      unauthorizedError(),
    ),
};
