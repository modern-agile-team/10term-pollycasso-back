import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { StandardErrorResponseDto } from 'src/common/dtos/responses/standard-error-response.dto';

const badRequestErrors = () =>
  ApiResponse({
    status: 400,
    description: '잘못된 요청',
    type: StandardErrorResponseDto,
    examples: {
      cannotSelfBlock: {
        summary: '자신을 차단 불가',
        value: {
          status: 400,
          code: 'CANNOT_SELF_BLOCK',
          errors: [{ field: 'targetUserId', message: 'Cannot block yourself' }],
        },
      },
    },
  });

const notFoundErrors = () =>
  ApiResponse({
    status: 404,
    description: '존재하지 않는 리소스 요청',
    type: StandardErrorResponseDto,
    examples: {
      userNotFound: {
        summary: '사용자 없음',
        value: { status: 404, code: 'USER_NOT_FOUND', errors: [] },
      },
      blockNotFound: {
        summary: '차단 정보 없음',
        value: { status: 404, code: 'BLOCK_NOT_FOUND', errors: [] },
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

export const ApiBlock = {
  block: () =>
    applyDecorators(
      ApiBearerAuth('accessToken'),
      ApiOperation({ summary: '사용자 차단' }),
      ApiParam({ name: 'targetUsername', type: 'string', description: '차단할 사용자명' }),
      ApiResponse({
        status: 201,
        description: '사용자 차단 성공',
        schema: {
          example: {
            id: 1,
            userId: 1,
            targetUserId: 2,
            createdAt: '2026-01-22T06:30:00.000Z',
          },
        },
      }),
      badRequestErrors(),
      notFoundErrors(),
      unauthorizedError(),
    ),

  unblock: () =>
    applyDecorators(
      ApiBearerAuth('accessToken'),
      ApiOperation({ summary: '사용자 차단 해제' }),
      ApiParam({ name: 'targetUsername', type: 'string', description: '차단 해제할 사용자명' }),
      ApiResponse({
        status: 204,
        description: '사용자 차단 해제 성공',
      }),
      notFoundErrors(),
      unauthorizedError(),
    ),
};
