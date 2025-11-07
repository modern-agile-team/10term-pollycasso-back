import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

const badRequestExamples = {
  UsernameInvalidInput: {
    summary: 'UsernameInvalidInput (DTO에러 전체 표시)',
    value: {
      status: 400,
      code: 'INVALID_INPUT',
      errors: [
        {
          field: 'username',
          reason: [
            'username must be longer than or equal to 5 characters',
            'username must match /^[a-z0-9_-]+$/ regular expression',
            'username should not be empty',
            'username must be a string',
          ],
        },
      ],
    },
  },
  PasswordInvalidInput: {
    summary: 'PasswordInvalidInput (DTO에러 전체 표시)',
    value: {
      status: 400,
      code: 'INVALID_INPUT',
      errors: [
        {
          field: 'password',
          reason: [
            'password must be longer than or equal to 8 characters',
            'password must match /^(?=.*[A-Za-z])(?=.*\\d)(?=.*[!"#$%&\'()*+,\\-./:;<=>?@[₩\\]^_`{|}~]).{8,20}$/ regular expression',
            'password should not be empty',
            'password must be a string',
          ],
        },
      ],
    },
  },
  NicknameInvalidInput: {
    summary: 'NicknameInvalidInput (DTO에러 전체 표시)',
    value: {
      status: 400,
      code: 'INVALID_INPUT',
      errors: [
        {
          field: 'nickname',
          reason: [
            'nickname must match /^[가-힣a-zA-Z0-9]+$/ regular expression',
            'nickname must be longer than or equal to 2 characters',
            'nickname should not be empty',
            'nickname must be a string',
          ],
        },
      ],
    },
  },
};

const badRequestErrors = (keys: (keyof typeof badRequestExamples)[]) =>
  ApiResponse({
    status: 400,
    description: '잘못된 입력값 (유효성 검증 실패)',
    content: {
      'application/json': {
        examples: keys.reduce(
          (acc, key) => {
            acc[key] = badRequestExamples[key];
            return acc;
          },
          {} as Record<string, object>,
        ),
      },
    },
  });

const conflictException = () =>
  ApiResponse({
    status: 409,
    description: '이미 사용 중인 아이디 또는 닉네임입니다.',
    content: {
      'application/json': {
        examples: {
          UsernameAlreadyExists: {
            summary: 'UsernameAlreadyExists',
            value: {
              status: 409,
              code: 'USERNAME_ALREADY_EXISTS',
              errors: [
                {
                  field: 'username',
                  reason: ['This username already exists.'],
                },
              ],
            },
          },
          NicknameAlreadyExists: {
            summary: 'NicknameAlreadyExists',
            value: {
              status: 409,
              code: 'NICKNAME_ALREADY_EXISTS',
              errors: [
                {
                  field: 'nickname',
                  reason: ['This nickname already exists.'],
                },
              ],
            },
          },
        },
      },
    },
  });
const unauthorizedExamples = {
  InvalidCredentials: {
    summary: 'InvalidCredentials',
    value: {
      status: 401,
      code: 'INVALID_CREDENTIALS',
      errors: [],
    },
  },
  ExpiredAccessToken: {
    summary: 'ExpiredAccessToken',
    value: {
      status: 401,
      code: 'EXPIRED_ACCESS_TOKEN',
      errors: [],
    },
  },
  InvalidAccessToken: {
    summary: 'InvalidAccessToken',
    value: {
      status: 401,
      code: 'INVALID_ACCESS_TOKEN',
      errors: [],
    },
  },
  AccessTokenMissing: {
    summary: 'AccessTokenMissing',
    value: {
      status: 401,
      code: 'ACCESS_TOKEN_MISSING',
      errors: [],
    },
  },
  InvalidRefreshToken: {
    summary: 'InvalidRefreshToken',
    value: {
      status: 401,
      code: 'INVALID_REFRESH_TOKEN',
      errors: [],
    },
  },
};

const unauthorizedErrors = (keys: (keyof typeof unauthorizedExamples)[]) =>
  ApiResponse({
    status: 401,
    description: '인증 실패',
    content: {
      'application/json': {
        examples: keys.reduce(
          (acc, key) => {
            acc[key] = unauthorizedExamples[key];
            return acc;
          },
          {} as Record<string, object>,
        ),
      },
    },
  });

export const ApiAuth = {
  signup: () =>
    applyDecorators(
      ApiOperation({ summary: '회원가입' }),
      ApiResponse({
        status: 201,
        description: '회원가입 성공',
      }),
      badRequestErrors(['UsernameInvalidInput', 'PasswordInvalidInput', 'NicknameInvalidInput']),
      conflictException(),
    ),

  login: () =>
    applyDecorators(
      ApiOperation({ summary: '로그인' }),
      ApiResponse({
        status: 200,
        description: '로그인 성공 (Refresh Token은 HttpOnly 쿠키로 전달됩니다.)',
        content: {
          'application/json': {
            example: {
              status: 200,
              code: 'LOGIN',
              data: {
                accessToken: 'eyJhbGciOi...',
              },
            },
          },
        },
        headers: {
          'Set-Cookie': {
            description: 'refresh_token=xxx; Path=/; HttpOnly; Secure;',
            schema: {
              type: 'string',
              example: 'refresh_token=eyJhbGciOiJI...; Path=/; HttpOnly; Secure',
            },
          },
        },
      }),
      badRequestErrors(['UsernameInvalidInput', 'PasswordInvalidInput']),
      unauthorizedErrors(['InvalidCredentials']),
    ),
  refresh: () =>
    applyDecorators(
      ApiOperation({ summary: '액세스 토큰 재발급' }),
      ApiResponse({
        status: 200,
        description: '쿠키에 저장된 Refresh Token을 이용해 새로운 Access Token을 발급합니다.',
        content: {
          'application/json': {
            example: {
              status: 200,
              code: 'REFRESH_ACCESS_TOKEN',
              data: {
                accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
            },
          },
        },
      }),
      unauthorizedErrors(['InvalidRefreshToken']),
    ),
  logout: () =>
    applyDecorators(
      ApiOperation({ summary: '로그아웃' }),
      ApiResponse({
        status: 204,
        description: '로그아웃 성공',
      }),
      unauthorizedErrors(['AccessTokenMissing']),
    ),
};
