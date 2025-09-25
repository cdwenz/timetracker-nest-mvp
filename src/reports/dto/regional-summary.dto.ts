export interface RegionalSummaryDto {
  regionId: string;
  regionName: string;
  organizationId: string;
  totalHours: number;
  totalEntries: number;
  activeUsers: number;
  topCountries: CountryMetric[];
  languageBreakdown: LanguageMetric[];
  performanceMetrics: RegionalKPI[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export interface CountryMetric {
  country: string;
  totalHours: number;
  totalEntries: number;
  percentage: number;
}

export interface LanguageMetric {
  language: string;
  totalHours: number;
  totalEntries: number;
  percentage: number;
}

export interface RegionalKPI {
  metric: string;
  value: number;
  unit: string;
  period: string;
}