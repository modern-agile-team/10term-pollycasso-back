export function paginate<T extends { id: number }>(
  items: T[],
  limit: number,
): { data: T[]; hasNextPage: boolean; nextCursor: number | null } {
  const hasNextPage = items.length > limit;
  const data = hasNextPage ? items.slice(0, limit) : items;

  let nextCursor: number | null = null;
  if (hasNextPage && data.length > 0) {
    const lastId = data[data.length - 1].id;
    nextCursor = lastId;
  }

  return { data, hasNextPage, nextCursor };
}
