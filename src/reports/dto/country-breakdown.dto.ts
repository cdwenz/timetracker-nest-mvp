export interface CountryBreakdownDto {
  organizationId: string;
  regionId?: string;
  regionName?: string;
  countries: CountryDetail[];
  totalCountries: number;
  totalHours: number;
  totalEntries: number;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  summary: {
    mostActiveCountry: string;
    leastActiveCountry: string;
    avgHoursPerCountry: number;
    countriesWithActivity: number;
  };
}

export interface CountryDetail {
  country: string;
  totalHours: number;
  totalEntries: number;
  activeUsers: number;
  uniqueLanguages: string[];
  averageHoursPerUser: number;
  averageEntriesPerUser: number;
  percentage: number;
  rank: number;
  trends: CountryTrend[];
}

export interface CountryTrend {
  period: string; // 'daily', 'weekly', 'monthly'
  date: string;
  hours: number;
  entries: number;
}