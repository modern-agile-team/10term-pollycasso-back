import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { StandardErrorResponseDto } from 'src/common/dtos/responses/standard-error-response.dto';
import { FriendResponseDto } from './dtos/responses/friend.response.dto';
import { UserSearchResultDto } from './dtos/responses/user-search-result.dto';

const badRequestErrors = () =>
  ApiResponse({
    status: 400,
    description: '잘못된 요청',
    type: StandardErrorResponseDto,
    examples: {
      cannotAddSelf: {
        summary: '자신에게 요청 불가',
        value: {
          status: 400,
          code: 'CANNOT_ADD_SELF',
          errors: [{ field: 'targetUserId', message: 'Cannot send friend request to yourself' }],
        },
      },
      cannotCancelReceivedRequest: {
        summary: '받은 요청 취소 불가',
        value: {
          status: 400,
          code: 'CANNOT_CANCEL_RECEIVED_REQUEST',
          errors: [
            {
              field: 'targetUserId',
              message:
                'You cannot cancel a friend request that you received. Please reject or accept it instead',
            },
          ],
        },
      },
      cannotRespondOwnRequest: {
        summary: '자신이 보낸 요청 응답 불가',
        value: {
          status: 400,
          code: 'CANNOT_RESPOND_OWN_REQUEST',
          errors: [
            {
              field: 'requesterId',
              message: 'You cannot respond to a friend request that you sent',
            },
          ],
        },
      },
      invalidKeyword: {
        summary: '검색 키워드 오류',
        value: {
          status: 400,
          code: 'INVALID_KEYWORD',
          errors: [
            { field: 'keyword', message: 'Search keyword must be between 1 and 20 characters' },
          ],
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
      requestNotFound: {
        summary: '친구 요청 없음',
        value: { status: 404, code: 'REQUEST_NOT_FOUND', errors: [] },
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

export const ApiFriend = {
  getFriendRelations: () =>
    applyDecorators(
      ApiBearerAuth('accessToken'),
      ApiOperation({ summary: '전체 친구 목록 조회' }),
      ApiResponse({ status: 200, description: '친구 목록 조회 성공', type: [FriendResponseDto] }),
      unauthorizedError(),
    ),
  searchFriends: () =>
    applyDecorators(
      ApiBearerAuth('accessToken'),
      ApiOperation({ summary: '친구 검색 (닉네임 / 태그)' }),
      ApiQuery({ name: 'keyword', required: true, description: '검색 키워드 (닉네임 또는 태그)' }),
      ApiResponse({
        status: 200,
        description: '검색 성공 (이미 친구이거나, 친구 요청 / 대기이거나, 차단인 경우 제외)',
        type: [UserSearchResultDto],
      }),
      badRequestErrors(),
      unauthorizedError(),
    ),
  searchMyFriends: () =>
    applyDecorators(
      ApiBearerAuth('accessToken'),
      ApiOperation({ summary: '친구 검색 (닉네임 / 태그)' }),
      ApiQuery({ name: 'keyword', required: true, description: '검색 키워드 (닉네임 또는 태그)' }),
      ApiResponse({
        status: 200,
        description: '검색 성공 (친구)',
        type: [UserSearchResultDto],
      }),
      badRequestErrors(),
      unauthorizedError(),
    ),
  getRecommendedFriends: () =>
    applyDecorators(
      ApiBearerAuth('accessToken'),
      ApiOperation({ summary: '추천 친구 목록 조회' }),
      ApiResponse({ status: 200, description: '추천 친구 조회 성공', type: [UserSearchResultDto] }),
      unauthorizedError(),
    ),
  sendRequest: () =>
    applyDecorators(
      ApiBearerAuth('accessToken'),
      ApiOperation({ summary: '친구 요청 전송' }),
      ApiResponse({
        status: 201,
        description: '친구 요청 생성 성공',
        schema: {
          example: {
            id: 1,
            requesterId: 1,
            receiverId: 2,
            status: 'PENDING',
            createdAt: '2026-01-22T06:30:00.000Z',
          },
        },
      }),
      badRequestErrors(),
      notFoundErrors(),
      unauthorizedError(),
    ),
  respondFriendRequest: () =>
    applyDecorators(
      ApiBearerAuth('accessToken'),
      ApiOperation({ summary: '친구 요청 응답 (수락 / 거절)' }),
      ApiParam({ name: 'requesterId', type: 'number', description: '요청자 사용자 ID' }),
      ApiResponse({
        status: 200,
        description: '친구 요청 응답 성공',
        schema: {
          example: {
            id: 1,
            requesterId: 1,
            receiverId: 2,
            status: 'ACCEPTED',
            createdAt: '2026-01-22T06:30:00.000Z',
          },
        },
      }),
      badRequestErrors(),
      notFoundErrors(),
      unauthorizedError(),
    ),
  cancelFriendRequest: () =>
    applyDecorators(
      ApiBearerAuth('accessToken'),
      ApiOperation({ summary: '친구 요청 취소' }),
      ApiParam({ name: 'targetUserId', type: 'number', description: '대상 사용자 ID' }),
      ApiResponse({ status: 204, description: '친구 요청 취소 성공' }),
      badRequestErrors(),
      notFoundErrors(),
      unauthorizedError(),
    ),
  removeFriend: () =>
    applyDecorators(
      ApiBearerAuth('accessToken'),
      ApiOperation({ summary: '친구 삭제' }),
      ApiParam({ name: 'friendUserId', type: 'number', description: '친구 사용자 ID' }),
      ApiResponse({ status: 204, description: '친구 삭제 성공' }),
      badRequestErrors(),
      notFoundErrors(),
      unauthorizedError(),
    ),
};
