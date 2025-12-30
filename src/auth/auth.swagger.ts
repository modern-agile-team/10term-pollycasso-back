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

const conflictExamples = {
  UsernameAlreadyExists: {
    summary: 'UsernameAlreadyExists',
    value: {
      status: 409,
      code: 'USERNAME_ALREADY_EXISTS',
      errors: [{ field: 'username', reason: ['This username already exists.'] }],
    },
  },
};

export const conflictErrors = (keys: (keyof typeof conflictExamples)[]) =>
  ApiResponse({
    status: 409,
    description: '요청한 리소스가 이미 존재하여 처리할 수 없습니다.',
    content: {
      'application/json': {
        examples: keys.reduce(
          (acc, key) => {
            acc[key] = conflictExamples[key];
            return acc;
          },
          {} as Record<string, object>,
        ),
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
  InvalidOAuthCode: {
    summary: 'InvalidOAuthCode',
    value: {
      status: 401,
      code: 'INVALID_OAUTH_CODE',
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

const BaseInternalServerErrors = (description: string) =>
  ApiResponse({
    status: 500,
    description,
    content: {
      'application/json': {
        examples: {
          InternalServerError: {
            summary: 'INTERNAL_SERVER_ERROR',
            value: {
              status: 500,
              code: 'INTERNAL_SERVER_ERROR',
              errors: [],
            },
          },
        },
      },
    },
  });

export const ApiTagInternalServerErrors = () =>
  BaseInternalServerErrors('닉네임 태그 자동 생성 과정에서 서버 내부 오류가 발생했습니다.');

export const ApiOAuthInternalServerErrors = () =>
  BaseInternalServerErrors('OAuth 서버에서 ID와 username을 가져오는 데 실패했습니다.');

const BadGatewayErrores = () =>
  ApiResponse({
    status: 502,
    description: 'OAuth 서버와의 통신에 실패했습니다.',
    content: {
      'application/json': {
        examples: {
          ThirdPartyApiError: {
            summary: 'OAuthProviderError',
            value: {
              status: 502,
              code: 'OAUTH_PROVIDER_ERROR',
              errors: [],
            },
          },
        },
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
      conflictErrors(['UsernameAlreadyExists']),
      ApiTagInternalServerErrors(),
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
              accessToken: 'eyJhbGciOi...',
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
              accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
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
  kakao: () =>
    applyDecorators(
      ApiOperation({ summary: 'kakao' }),
      ApiResponse({
        description: 'kakao 로그인 화면으로 이동합니다. 그 후 kakao callback으로 리다이렉트됩니다.',
      }),
    ),
  google: () =>
    applyDecorators(
      ApiOperation({ summary: 'google' }),
      ApiResponse({
        description:
          'google 로그인 화면으로 이동합니다. 그 후 google callback으로 리다이렉트됩니다.',
      }),
    ),
  kakaocallback: () =>
    applyDecorators(
      ApiOperation({ summary: 'kakao callback' }),
      ApiResponse({
        status: 200,
        description: 'kakao 로그인 성공 (Refresh Token은 HttpOnly 쿠키로 전달됩니다.)',
        content: {
          'application/json': {
            example: {
              accessToken: 'eyJhbGciOi...',
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
      unauthorizedErrors(['InvalidOAuthCode']),
      ApiOAuthInternalServerErrors(),
      BadGatewayErrores(),
    ),
  googlecallback: () =>
    applyDecorators(
      ApiOperation({ summary: 'google callback' }),
      ApiResponse({
        status: 200,
        description: 'google 로그인 성공 (Refresh Token은 HttpOnly 쿠키로 전달됩니다.)',
        content: {
          'application/json': {
            example: {
              accessToken: 'eyJhbGciOi...',
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
      unauthorizedErrors(['InvalidOAuthCode']),
      ApiOAuthInternalServerErrors(),
      BadGatewayErrores(),
    ),
};
