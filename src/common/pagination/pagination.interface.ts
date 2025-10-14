export interface PaginatedResult<T> {
  data: T[];
  hasNextPage: boolean;
  nextCursor: number | null;
}
