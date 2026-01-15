import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StandardErrorResponseDto } from 'src/common/dtos/responses/standard-error-response.dto';
import { WaitingStateResponseDto } from './dtos/responses/waiting-state-response.dto';

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

export const ApiWaiting = {
  getRoomState: () =>
    applyDecorators(
      ApiCookieAuth('accessToken'),
      ApiOperation({ summary: '대기실 상태 조회' }),
      ApiResponse({
        status: 200,
        description: '대기실 상태 조회 성공',
        type: WaitingStateResponseDto,
      }),
      roomNotFoundError(),
      unauthorizedError(),
    ),
};
