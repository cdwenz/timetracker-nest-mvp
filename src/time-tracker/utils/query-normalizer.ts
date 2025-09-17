// src/time-tracker/utils/query-normalizer.ts
export type NormalizedListQuery = {
  skip: number;
  take: number;
  dateFrom?: Date;
  dateTo?: Date;  // inclusivo (fin de día)
  userId?: string;
  search?: string;
  supportedCountry?: string;
  workingLanguage?: string;
};

export function normalizeListQuery(q: any, defaults = { take: 20 }): NormalizedListQuery {
  // Paginación: page/pageSize tienen prioridad
  const take = Number(q.pageSize) || Number(q.take) || defaults.take;
  let skip = 0;
  if (q.page) {
    const page = Math.max(1, Number(q.page));
    skip = (page - 1) * take;
  } else if (q.skip != null) {
    skip = Math.max(0, Number(q.skip));
  }

  // Fechas (prioridad start/end, luego from/to)
  const from = q.startDate ?? q.fromDate;
  const to   = q.endDate   ?? q.toDate;

  const dateFrom = from ? new Date(from) : undefined;
  let dateTo = to ? new Date(to) : undefined;
  if (dateTo) {
    // fin de día inclusivo
    dateTo.setHours(23, 59, 59, 999);
  }

  return {
    skip,
    take,
    dateFrom,
    dateTo,
    userId: q.userId,
    search: q.search?.trim(),
    supportedCountry: q.supportedCountry?.trim(),
    workingLanguage: q.workingLanguage?.trim(),
  };
}
