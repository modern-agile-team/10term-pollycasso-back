import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ResRoomDto } from './dtos/responses/room-response.dto';
import { PaginatedRoomResponseDto } from './dtos/responses/paginated-room-response.dto';

const badRequestErrors = () =>
  ApiResponse({
    status: 400,
    description: '잘못된 요청',
    content: {
      'application/json': {
        examples: {
          soloModePlayers: {
            value: {
              status: 400,
              code: 'SOLO_MODE_PLAYERS',
              errors: [],
            },
          },
          teamModePlayers: {
            value: {
              status: 400,
              code: 'TEAM_MODE_PLAYERS',
              errors: [],
            },
          },
          privateRoomPassword: {
            value: {
              status: 400,
              code: 'PRIVATE_ROOM_NEEDS_PASSWORD',
              errors: [],
            },
          },
        },
      },
    },
  });

const roomNotFoundError = () =>
  ApiResponse({
    status: 404,
    description: '존재하지 않는 리소스 요청',
    content: {
      'application/json': {
        example: {
          status: 404,
          code: 'ROOM_NOT_FOUND',
          errors: [],
        },
      },
    },
  });

const unauthorizedError = () =>
  ApiResponse({
    status: 401,
    description: '권한 없음 (로그인 필요)',
    content: {
      'application/json': {
        example: {
          status: 401,
          code: 'UNAUTHORIZED',
          errors: [],
        },
      },
    },
  });

export const ApiRoom = {
  createRoom: () =>
    applyDecorators(
      ApiCookieAuth('accessToken'),
      ApiOperation({ summary: '새로운 방 생성' }),
      ApiResponse({ status: 201, description: '방 생성 성공', type: ResRoomDto }),
      badRequestErrors(),
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
      ApiResponse({ status: 200, description: '방 조회 성공', type: ResRoomDto }),
      roomNotFoundError(),
      unauthorizedError(),
    ),

  updateRoom: () =>
    applyDecorators(
      ApiCookieAuth('accessToken'),
      ApiOperation({ summary: '방 정보 수정' }),
      ApiResponse({ status: 200, description: '방 수정 성공', type: ResRoomDto }),
      badRequestErrors(),
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
