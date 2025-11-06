import { ApiProperty } from '@nestjs/swagger';

export function createStandardResponse<T>(
  classRef: new (...args: any[]) => T,
  codeExample = 'SUCCESS',
  name = 'StandardResponse',
) {
  class StandardResponse {
    @ApiProperty({ example: 200 })
    status: number;

    @ApiProperty({ example: codeExample })
    code: string;

    @ApiProperty({ type: classRef })
    data: T;
  }

  Object.defineProperty(StandardResponse, 'name', { value: name });
  return StandardResponse;
}
