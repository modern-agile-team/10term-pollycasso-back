export class PaginationDto<T extends { id: number | null }> {
  readonly data: T[];
  readonly hasNextPage: boolean;
  readonly nextCursor: number | null;

  constructor(items: T[], pageSize: number) {
    const hasNextPage = items.length > pageSize;
    const data = hasNextPage ? items.slice(0, pageSize) : items;

    this.data = data;
    this.hasNextPage = hasNextPage;
    this.nextCursor = hasNextPage && data.length > 0 ? data[data.length - 1].id : null;
  }
}
