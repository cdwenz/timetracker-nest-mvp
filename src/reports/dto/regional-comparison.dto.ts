export interface RegionalComparisonDto {
  regions: RegionComparison[];
  organizationId: string;
  comparisonMetrics: ComparisonMetric[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalRegions: number;
    totalHours: number;
    totalEntries: number;
    averageHoursPerRegion: number;
  };
}

export interface RegionComparison {
  regionId: string;
  regionName: string;
  totalHours: number;
  totalEntries: number;
  activeUsers: number;
  avgHoursPerUser: number;
  topCountry: string;
  topLanguage: string;
  performanceScore: number;
}

export interface ComparisonMetric {
  metricName: string;
  regions: RegionMetricValue[];
  bestPerformer: {
    regionId: string;
    regionName: string;
    value: number;
  };
  worstPerformer: {
    regionId: string;
    regionName: string;
    value: number;
  };
}

export interface RegionMetricValue {
  regionId: string;
  regionName: string;
  value: number;
  rank: number;
}