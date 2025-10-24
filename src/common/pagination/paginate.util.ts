export function paginate<T extends { id: number | null }>(
  items: T[],
  pageSize: number,
): { data: T[]; hasNextPage: boolean; nextCursor: number | null } {
  const hasNextPage = items.length > pageSize;
  const data = hasNextPage ? items.slice(0, pageSize) : items;

  let nextCursor: number | null = null;
  if (hasNextPage && data.length > 0) {
    const lastId = data[data.length - 1].id;
    nextCursor = lastId !== null ? lastId : null;
  }

  return { data, hasNextPage, nextCursor };
}
