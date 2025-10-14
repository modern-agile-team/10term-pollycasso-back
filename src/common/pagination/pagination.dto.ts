import { PaginatedResult } from './pagination.interface';

export class PaginationDto<T extends { id: number }> implements PaginatedResult<T> {
  readonly data: T[];
  readonly hasNextPage: boolean;
  readonly nextCursor: number | null;

  constructor(items: T[], pageSize: number, cursor?: number) {
    const startIndex = cursor ? items.findIndex((item) => item.id === cursor) + 1 : 0;

    const sliced = items.slice(startIndex, startIndex + pageSize);
    const hasNextPage = items.length > startIndex + pageSize;
    const nextCursor = hasNextPage ? sliced[sliced.length - 1].id : null;

    this.data = sliced;
    this.hasNextPage = hasNextPage;
    this.nextCursor = nextCursor;
  }
}
