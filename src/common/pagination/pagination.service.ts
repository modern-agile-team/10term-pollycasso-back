import { Injectable } from '@nestjs/common';
import { PaginatedResult } from './pagination.interface';

@Injectable()
export class PaginationService {
  paginateById<T extends { id: number }>(
    items: T[],
    pageSize: number,
    cursor?: number,
  ): PaginatedResult<T> {
    let startIndex = 0;
    if (cursor) {
      const index = items.findIndex((item) => item.id === cursor);
      startIndex = index >= 0 ? index + 1 : 0;
    }

    const sliced = items.slice(startIndex, startIndex + pageSize);
    const hasNextPage = items.length > startIndex + pageSize;
    const nextCursor = hasNextPage ? sliced[sliced.length - 1].id : null;

    return { data: sliced, nextCursor, hasNextPage };
  }
}
