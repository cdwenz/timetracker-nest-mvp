export interface LanguageDistributionDto {
  organizationId: string;
  regionId?: string;
  regionName?: string;
  countryFilter?: string;
  languages: LanguageDetail[];
  totalLanguages: number;
  totalHours: number;
  totalEntries: number;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  summary: {
    mostUsedLanguage: string;
    leastUsedLanguage: string;
    avgHoursPerLanguage: number;
    languagesWithActivity: number;
  };
}

export interface LanguageDetail {
  language: string;
  totalHours: number;
  totalEntries: number;
  activeUsers: number;
  countries: string[];
  averageHoursPerUser: number;
  averageEntriesPerUser: number;
  percentage: number;
  rank: number;
  regionalDistribution: LanguageByRegion[];
}

export interface LanguageByRegion {
  regionId: string;
  regionName: string;
  hours: number;
  entries: number;
  users: number;
}