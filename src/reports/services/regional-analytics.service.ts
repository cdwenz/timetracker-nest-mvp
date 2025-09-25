import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RegionalSummaryDto, CountryMetric, LanguageMetric, RegionalKPI } from '../dto/regional-summary.dto';
import { RegionalComparisonDto, RegionComparison, ComparisonMetric, RegionMetricValue } from '../dto/regional-comparison.dto';
import { CountryBreakdownDto, CountryDetail, CountryTrend } from '../dto/country-breakdown.dto';
import { LanguageDistributionDto, LanguageDetail, LanguageByRegion } from '../dto/language-distribution.dto';
import { ReportFiltersDto } from '../dto/report-filters.dto';

@Injectable()
export class RegionalAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getRegionalSummary(
    regionId: string,
    filters: ReportFiltersDto,
    userContext: any
  ): Promise<RegionalSummaryDto> {
    // Verificar acceso a la región
    await this.validateRegionAccess(regionId, userContext);

    const region = await this.prisma.region.findUnique({
      where: { id: regionId },
      select: { id: true, name: true, organizationId: true }
    });

    if (!region) {
      throw new ForbiddenException('Región no encontrada');
    }

    const dateRange = this.getDateRange(filters);
    const timeEntries = await this.getTimeEntriesForRegion(regionId, dateRange, filters);

    // Calcular métricas principales
    const totalHours = this.calculateTotalHours(timeEntries);
    const totalEntries = timeEntries.length;
    const activeUsers = new Set(timeEntries.map(entry => entry.userId)).size;

    // Métricas por país
    const countryMetrics = this.calculateCountryMetrics(timeEntries, totalHours);

    // Métricas por idioma
    const languageMetrics = this.calculateLanguageMetrics(timeEntries, totalHours);

    // KPIs regionales
    const performanceMetrics = this.calculateRegionalKPIs(timeEntries, totalHours, activeUsers);

    return {
      regionId: region.id,
      regionName: region.name,
      organizationId: region.organizationId,
      totalHours,
      totalEntries,
      activeUsers,
      topCountries: countryMetrics.slice(0, 10),
      languageBreakdown: languageMetrics.slice(0, 10),
      performanceMetrics,
      dateRange: {
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString()
      }
    };
  }

  async getRegionalComparison(
    regionIds: string[],
    filters: ReportFiltersDto,
    userContext: any
  ): Promise<RegionalComparisonDto> {
    // Validar acceso a todas las regiones
    for (const regionId of regionIds) {
      await this.validateRegionAccess(regionId, userContext);
    }

    const regions = await this.prisma.region.findMany({
      where: { id: { in: regionIds } },
      select: { id: true, name: true, organizationId: true }
    });

    const dateRange = this.getDateRange(filters);
    const comparisons: RegionComparison[] = [];
    let totalHours = 0;
    let totalEntries = 0;

    // Obtener datos para cada región
    for (const region of regions) {
      const timeEntries = await this.getTimeEntriesForRegion(region.id, dateRange, filters);
      const regionHours = this.calculateTotalHours(timeEntries);
      const regionEntries = timeEntries.length;
      const activeUsers = new Set(timeEntries.map(entry => entry.userId)).size;

      const countryMetrics = this.calculateCountryMetrics(timeEntries, regionHours);
      const languageMetrics = this.calculateLanguageMetrics(timeEntries, regionHours);

      comparisons.push({
        regionId: region.id,
        regionName: region.name,
        totalHours: regionHours,
        totalEntries: regionEntries,
        activeUsers,
        avgHoursPerUser: activeUsers > 0 ? regionHours / activeUsers : 0,
        topCountry: countryMetrics[0]?.country || 'N/A',
        topLanguage: languageMetrics[0]?.language || 'N/A',
        performanceScore: this.calculatePerformanceScore(regionHours, regionEntries, activeUsers)
      });

      totalHours += regionHours;
      totalEntries += regionEntries;
    }

    // Calcular métricas de comparación
    const comparisonMetrics = this.calculateComparisonMetrics(comparisons);

    return {
      regions: comparisons,
      organizationId: regions[0]?.organizationId || '',
      comparisonMetrics,
      dateRange: {
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString()
      },
      summary: {
        totalRegions: regions.length,
        totalHours,
        totalEntries,
        averageHoursPerRegion: regions.length > 0 ? totalHours / regions.length : 0
      }
    };
  }

  async getCountryBreakdown(
    regionId: string | undefined,
    filters: ReportFiltersDto,
    userContext: any
  ): Promise<CountryBreakdownDto> {
    let whereClause: any = {};
    let regionName: string | undefined;

    if (regionId) {
      await this.validateRegionAccess(regionId, userContext);
      whereClause.regionId = regionId;
      
      const region = await this.prisma.region.findUnique({
        where: { id: regionId },
        select: { name: true }
      });
      regionName = region?.name;
    } else {
      // Sin región específica, usar organización del usuario
      whereClause.organizationId = userContext.organizationId;
    }

    const dateRange = this.getDateRange(filters);
    whereClause.startDate = { gte: dateRange.start };
    whereClause.endDate = { lte: dateRange.end };

    if (filters.countries?.length) {
      whereClause.supportedCountry = { in: filters.countries };
    }

    const timeEntries = await this.prisma.timeEntry.findMany({
      where: whereClause,
      select: {
        supportedCountry: true,
        workingLanguage: true,
        userId: true,
        startDate: true,
        endDate: true,
        startTimeOfDay: true,
        endTimeOfDay: true
      }
    });

    const countryGroups = this.groupByCountry(timeEntries);
    const countries: CountryDetail[] = [];
    const totalHours = this.calculateTotalHours(timeEntries);
    const totalEntries = timeEntries.length;

    for (const [country, entries] of Object.entries(countryGroups)) {
      const countryHours = this.calculateTotalHours(entries);
      const activeUsers = new Set(entries.map(e => e.userId)).size;
      const uniqueLanguages = [...new Set(entries.map(e => e.workingLanguage))];

      countries.push({
        country,
        totalHours: countryHours,
        totalEntries: entries.length,
        activeUsers,
        uniqueLanguages,
        averageHoursPerUser: activeUsers > 0 ? countryHours / activeUsers : 0,
        averageEntriesPerUser: activeUsers > 0 ? entries.length / activeUsers : 0,
        percentage: totalHours > 0 ? (countryHours / totalHours) * 100 : 0,
        rank: 0, // Se calculará después del ordenamiento
        trends: [] // Se podría implementar trends por período
      });
    }

    // Ordenar y asignar ranks
    countries.sort((a, b) => b.totalHours - a.totalHours);
    countries.forEach((country, index) => {
      country.rank = index + 1;
    });

    return {
      organizationId: userContext.organizationId,
      regionId,
      regionName,
      countries: countries.slice(0, filters.take || 20),
      totalCountries: countries.length,
      totalHours,
      totalEntries,
      dateRange: {
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString()
      },
      summary: {
        mostActiveCountry: countries[0]?.country || 'N/A',
        leastActiveCountry: countries[countries.length - 1]?.country || 'N/A',
        avgHoursPerCountry: countries.length > 0 ? totalHours / countries.length : 0,
        countriesWithActivity: countries.length
      }
    };
  }

  async getLanguageDistribution(
    regionId: string | undefined,
    filters: ReportFiltersDto,
    userContext: any
  ): Promise<LanguageDistributionDto> {
    let whereClause: any = {};
    let regionName: string | undefined;

    if (regionId) {
      await this.validateRegionAccess(regionId, userContext);
      whereClause.regionId = regionId;
      
      const region = await this.prisma.region.findUnique({
        where: { id: regionId },
        select: { name: true }
      });
      regionName = region?.name;
    } else {
      whereClause.organizationId = userContext.organizationId;
    }

    const dateRange = this.getDateRange(filters);
    whereClause.startDate = { gte: dateRange.start };
    whereClause.endDate = { lte: dateRange.end };

    if (filters.languages?.length) {
      whereClause.workingLanguage = { in: filters.languages };
    }

    if (filters.countries?.length) {
      whereClause.supportedCountry = { in: filters.countries };
    }

    const timeEntries = await this.prisma.timeEntry.findMany({
      where: whereClause,
      select: {
        workingLanguage: true,
        supportedCountry: true,
        userId: true,
        startDate: true,
        endDate: true,
        startTimeOfDay: true,
        endTimeOfDay: true,
        regionId: true,
        region: {
          select: { name: true }
        }
      }
    });

    const languageGroups = this.groupByLanguage(timeEntries);
    const languages: LanguageDetail[] = [];
    const totalHours = this.calculateTotalHours(timeEntries);
    const totalEntries = timeEntries.length;

    for (const [language, entries] of Object.entries(languageGroups)) {
      const languageHours = this.calculateTotalHours(entries);
      const activeUsers = new Set(entries.map(e => e.userId)).size;
      const countries = [...new Set(entries.map(e => e.supportedCountry))];
      
      // Distribución regional para este idioma
      const regionalDistribution = this.calculateRegionalDistribution(entries);

      languages.push({
        language,
        totalHours: languageHours,
        totalEntries: entries.length,
        activeUsers,
        countries,
        averageHoursPerUser: activeUsers > 0 ? languageHours / activeUsers : 0,
        averageEntriesPerUser: activeUsers > 0 ? entries.length / activeUsers : 0,
        percentage: totalHours > 0 ? (languageHours / totalHours) * 100 : 0,
        rank: 0,
        regionalDistribution
      });
    }

    // Ordenar y asignar ranks
    languages.sort((a, b) => b.totalHours - a.totalHours);
    languages.forEach((language, index) => {
      language.rank = index + 1;
    });

    return {
      organizationId: userContext.organizationId,
      regionId,
      regionName,
      countryFilter: filters.countries?.[0],
      languages: languages.slice(0, filters.take || 20),
      totalLanguages: languages.length,
      totalHours,
      totalEntries,
      dateRange: {
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString()
      },
      summary: {
        mostUsedLanguage: languages[0]?.language || 'N/A',
        leastUsedLanguage: languages[languages.length - 1]?.language || 'N/A',
        avgHoursPerLanguage: languages.length > 0 ? totalHours / languages.length : 0,
        languagesWithActivity: languages.length
      }
    };
  }

  // Métodos de utilidad privados

  private async validateRegionAccess(regionId: string, userContext: any): Promise<void> {
    if (userContext.role === 'SUPER') return;

    const region = await this.prisma.region.findUnique({
      where: { id: regionId },
      select: { organizationId: true, managerId: true }
    });

    if (!region) {
      throw new ForbiddenException('Región no encontrada');
    }

    if (region.organizationId !== userContext.organizationId) {
      throw new ForbiddenException('Sin acceso a esta región');
    }

    // Si es REGIONAL_MANAGER, solo puede ver sus propias regiones
    if (userContext.role === 'REGIONAL_MANAGER' && region.managerId !== userContext.id) {
      throw new ForbiddenException('Sin acceso a esta región');
    }
  }

  private getDateRange(filters: ReportFiltersDto) {
    const end = filters.endDate ? new Date(filters.endDate) : new Date();
    const start = filters.startDate 
      ? new Date(filters.startDate) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 días por defecto

    return { start, end };
  }

  private async getTimeEntriesForRegion(regionId: string, dateRange: any, filters: ReportFiltersDto) {
    const whereClause: any = {
      regionId,
      startDate: { gte: dateRange.start },
      endDate: { lte: dateRange.end }
    };

    if (filters.countries?.length) {
      whereClause.supportedCountry = { in: filters.countries };
    }

    if (filters.languages?.length) {
      whereClause.workingLanguage = { in: filters.languages };
    }

    if (filters.userIds?.length) {
      whereClause.userId = { in: filters.userIds };
    }

    return this.prisma.timeEntry.findMany({
      where: whereClause,
      select: {
        supportedCountry: true,
        workingLanguage: true,
        userId: true,
        startDate: true,
        endDate: true,
        startTimeOfDay: true,
        endTimeOfDay: true
      }
    });
  }

  private calculateTotalHours(timeEntries: any[]): number {
    let totalHours = 0;
    
    for (const entry of timeEntries) {
      if (!entry.startDate || !entry.endDate) continue;
      
      if (entry.startTimeOfDay && entry.endTimeOfDay) {
        try {
          const [startHour, startMin] = entry.startTimeOfDay.split(':').map(Number);
          const [endHour, endMin] = entry.endTimeOfDay.split(':').map(Number);
          
          if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
            continue;
          }
          
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          
          let diffMinutes = endMinutes - startMinutes;
          if (diffMinutes < 0) {
            diffMinutes += 24 * 60;
          }
          
          const hours = diffMinutes / 60;
          totalHours += Math.max(0, hours);
        } catch (error) {
          // Fallback to date calculation
          const start = new Date(entry.startDate);
          const end = new Date(entry.endDate);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          totalHours += Math.max(0, hours);
        }
      } else {
        // Date-only calculation
        const start = new Date(entry.startDate);
        const end = new Date(entry.endDate);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        totalHours += Math.max(0, hours);
      }
    }
    
    return totalHours;
  }

  private calculateCountryMetrics(timeEntries: any[], totalHours: number): CountryMetric[] {
    const countryGroups = this.groupByCountry(timeEntries);
    const metrics: CountryMetric[] = [];

    for (const [country, entries] of Object.entries(countryGroups)) {
      const countryHours = this.calculateTotalHours(entries);
      metrics.push({
        country,
        totalHours: countryHours,
        totalEntries: entries.length,
        percentage: totalHours > 0 ? (countryHours / totalHours) * 100 : 0
      });
    }

    return metrics.sort((a, b) => b.totalHours - a.totalHours);
  }

  private calculateLanguageMetrics(timeEntries: any[], totalHours: number): LanguageMetric[] {
    const languageGroups = this.groupByLanguage(timeEntries);
    const metrics: LanguageMetric[] = [];

    for (const [language, entries] of Object.entries(languageGroups)) {
      const languageHours = this.calculateTotalHours(entries);
      metrics.push({
        language,
        totalHours: languageHours,
        totalEntries: entries.length,
        percentage: totalHours > 0 ? (languageHours / totalHours) * 100 : 0
      });
    }

    return metrics.sort((a, b) => b.totalHours - a.totalHours);
  }

  private calculateRegionalKPIs(timeEntries: any[], totalHours: number, activeUsers: number): RegionalKPI[] {
    return [
      {
        metric: 'Promedio horas por usuario',
        value: activeUsers > 0 ? totalHours / activeUsers : 0,
        unit: 'horas',
        period: 'total'
      },
      {
        metric: 'Promedio entradas por usuario',
        value: activeUsers > 0 ? timeEntries.length / activeUsers : 0,
        unit: 'entradas',
        period: 'total'
      },
      {
        metric: 'Productividad diaria',
        value: totalHours / 30, // Asumiendo 30 días
        unit: 'horas/día',
        period: 'diario'
      }
    ];
  }

  private calculatePerformanceScore(hours: number, entries: number, users: number): number {
    // Algoritmo simple de puntuación basado en horas, entradas y usuarios
    if (users === 0) return 0;
    
    const hoursPerUser = hours / users;
    const entriesPerUser = entries / users;
    
    // Normalizar puntuación (0-100)
    return Math.min(100, (hoursPerUser * 2) + (entriesPerUser * 0.5));
  }

  private calculateComparisonMetrics(regions: RegionComparison[]): ComparisonMetric[] {
    const metrics: ComparisonMetric[] = [];

    // Métricas de comparación por total de horas
    const hourValues: RegionMetricValue[] = regions.map((region, index) => ({
      regionId: region.regionId,
      regionName: region.regionName,
      value: region.totalHours,
      rank: index + 1
    })).sort((a, b) => b.value - a.value);

    metrics.push({
      metricName: 'Total de Horas',
      regions: hourValues,
      bestPerformer: hourValues[0],
      worstPerformer: hourValues[hourValues.length - 1]
    });

    // Métricas por promedio de horas por usuario
    const avgHourValues: RegionMetricValue[] = regions.map((region, index) => ({
      regionId: region.regionId,
      regionName: region.regionName,
      value: region.avgHoursPerUser,
      rank: index + 1
    })).sort((a, b) => b.value - a.value);

    metrics.push({
      metricName: 'Promedio Horas por Usuario',
      regions: avgHourValues,
      bestPerformer: avgHourValues[0],
      worstPerformer: avgHourValues[avgHourValues.length - 1]
    });

    return metrics;
  }

  private groupByCountry(timeEntries: any[]): Record<string, any[]> {
    return timeEntries.reduce((groups, entry) => {
      const country = entry.supportedCountry;
      if (!groups[country]) {
        groups[country] = [];
      }
      groups[country].push(entry);
      return groups;
    }, {});
  }

  private groupByLanguage(timeEntries: any[]): Record<string, any[]> {
    return timeEntries.reduce((groups, entry) => {
      const language = entry.workingLanguage;
      if (!groups[language]) {
        groups[language] = [];
      }
      groups[language].push(entry);
      return groups;
    }, {});
  }

  private calculateRegionalDistribution(entries: any[]): LanguageByRegion[] {
    const regionGroups = entries.reduce((groups, entry) => {
      if (!entry.regionId) return groups;
      
      if (!groups[entry.regionId]) {
        groups[entry.regionId] = {
          regionId: entry.regionId,
          regionName: entry.region?.name || 'N/A',
          entries: []
        };
      }
      groups[entry.regionId].entries.push(entry);
      return groups;
    }, {});

    return Object.values(regionGroups).map((group: any) => ({
      regionId: group.regionId,
      regionName: group.regionName,
      hours: this.calculateTotalHours(group.entries),
      entries: group.entries.length,
      users: new Set(group.entries.map(e => e.userId)).size
    }));
  }
}