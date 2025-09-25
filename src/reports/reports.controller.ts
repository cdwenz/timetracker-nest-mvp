import {
  Controller,
  Get,
  Query,
  Req,
  Param,
  ForbiddenException,
  BadRequestException,
  UseGuards,
  Res,
  Header
} from '@nestjs/common';
import { Response } from 'express';
import { RequirePerms } from '../auth/decorators/perms.decorator';
import { ReportsGuard } from './guards/reports.guard';
import { RegionalAnalyticsService } from './services/regional-analytics.service';
import { ExportService } from './services/export.service';
import { ReportFiltersDto } from './dto/report-filters.dto';
import { RegionalSummaryDto } from './dto/regional-summary.dto';
import { RegionalComparisonDto } from './dto/regional-comparison.dto';
import { CountryBreakdownDto } from './dto/country-breakdown.dto';
import { LanguageDistributionDto } from './dto/language-distribution.dto';

@Controller('reports')
@UseGuards(ReportsGuard)
export class ReportsController {
  constructor(
    private regionalAnalyticsService: RegionalAnalyticsService,
    private exportService: ExportService
  ) {}

  /**
   * GET /reports/regional-summary/:regionId
   * Resumen detallado de una región específica
   */
  @Get('regional-summary/:regionId')
  async getRegionalSummary(
    @Param('regionId') regionId: string,
    @Query() filters: ReportFiltersDto,
    @Req() req: any
  ): Promise<{ message: string; data: RegionalSummaryDto }> {

    const summary = await this.regionalAnalyticsService.getRegionalSummary(
      regionId,
      filters,
      req.user
    );

    return {
      message: 'Resumen regional obtenido exitosamente',
      data: summary
    };
  }

  /**
   * GET /reports/regional-comparison?regionIds=id1,id2,id3
   * Comparación entre múltiples regiones
   */
  @Get('regional-comparison')
  async getRegionalComparison(
    @Query() filters: ReportFiltersDto,
    @Req() req: any
  ): Promise<{ message: string; data: RegionalComparisonDto }> {

    if (!filters.regionIds || filters.regionIds.length < 2) {
      throw new BadRequestException('Se requieren al menos 2 regionIds para la comparación');
    }

    if (filters.regionIds.length > 10) {
      throw new BadRequestException('Máximo 10 regiones para comparación');
    }

    const comparison = await this.regionalAnalyticsService.getRegionalComparison(
      filters.regionIds,
      filters,
      req.user
    );

    return {
      message: 'Comparación regional obtenida exitosamente',
      data: comparison
    };
  }

  /**
   * GET /reports/country-breakdown
   * GET /reports/country-breakdown/:regionId
   * Desglose detallado por países (opcional: para una región específica)
   */
  @Get('country-breakdown/:regionId?')
  async getCountryBreakdown(
    @Param('regionId') regionId: string | undefined,
    @Query() filters: ReportFiltersDto,
    @Req() req: any
  ): Promise<{ message: string; data: CountryBreakdownDto }> {

    const breakdown = await this.regionalAnalyticsService.getCountryBreakdown(
      regionId,
      filters,
      req.user
    );

    return {
      message: 'Desglose por países obtenido exitosamente',
      data: breakdown
    };
  }

  /**
   * GET /reports/language-distribution
   * GET /reports/language-distribution/:regionId
   * Distribución de idiomas (opcional: para una región específica)
   */
  @Get('language-distribution/:regionId?')
  async getLanguageDistribution(
    @Param('regionId') regionId: string | undefined,
    @Query() filters: ReportFiltersDto,
    @Req() req: any
  ): Promise<{ message: string; data: LanguageDistributionDto }> {

    const distribution = await this.regionalAnalyticsService.getLanguageDistribution(
      regionId,
      filters,
      req.user
    );

    return {
      message: 'Distribución de idiomas obtenida exitosamente',
      data: distribution
    };
  }

  /**
   * GET /reports/dashboard-summary
   * Datos resumidos para el dashboard principal (similar al Flutter)
   */
  @Get('dashboard-summary')
  async getDashboardSummary(
    @Query() filters: ReportFiltersDto,
    @Req() req: any
  ): Promise<{
    message: string;
    data: {
      totalHours: number;
      totalEntries: number;
      activeUsers: number;
      activeRegions: number;
      topRegions: Array<{
        regionId: string;
        regionName: string;
        totalHours: number;
        percentage: number;
      }>;
      topCountries: Array<{
        country: string;
        totalHours: number;
        percentage: number;
      }>;
      topLanguages: Array<{
        language: string;
        totalHours: number;
        percentage: number;
      }>;
      dateRange: {
        startDate: string;
        endDate: string;
      };
    };
  }> {

    // Si es REGIONAL_MANAGER, solo mostrar sus regiones
    if (req.user.role === 'REGIONAL_MANAGER') {
      // Obtener las regiones que maneja
      const userRegions = await this.regionalAnalyticsService['prisma'].region.findMany({
        where: { 
          managerId: req.user.id,
          organizationId: req.user.organizationId
        },
        select: { id: true }
      });

      if (userRegions.length === 0) {
        // No maneja regiones, retornar datos vacíos
        return {
          message: 'Dashboard obtenido exitosamente',
          data: {
            totalHours: 0,
            totalEntries: 0,
            activeUsers: 0,
            activeRegions: 0,
            topRegions: [],
            topCountries: [],
            topLanguages: [],
            dateRange: {
              startDate: new Date().toISOString(),
              endDate: new Date().toISOString()
            }
          }
        };
      }

      // Agregar filtro por regiones del usuario (sobrescribir cualquier filtro enviado)
      filters.regionIds = userRegions.map(r => r.id);
    }

    // Para otros roles (ADMIN, SUPER, etc), usar todas las regiones de su org
    if (!filters.regionIds || filters.regionIds.length === 0) {
      const organizationRegions = await this.regionalAnalyticsService['prisma'].region.findMany({
        where: { organizationId: req.user.organizationId },
        select: { id: true, name: true }
      });

      if (organizationRegions.length === 0) {
        return {
          message: 'Dashboard obtenido exitosamente',
          data: {
            totalHours: 0,
            totalEntries: 0,
            activeUsers: 0,
            activeRegions: 0,
            topRegions: [],
            topCountries: [],
            topLanguages: [],
            dateRange: {
              startDate: new Date().toISOString(),
              endDate: new Date().toISOString()
            }
          }
        };
      }

      filters.regionIds = organizationRegions.map(r => r.id);
    }

    // Obtener datos agregados
    const comparison = await this.regionalAnalyticsService.getRegionalComparison(
      filters.regionIds,
      filters,
      req.user
    );

    // Calcular totales y tops
    const totalHours = comparison.summary.totalHours;
    const totalEntries = comparison.summary.totalEntries;
    const activeUsers = comparison.regions.reduce((sum, r) => sum + r.activeUsers, 0);
    const activeRegions = comparison.regions.filter(r => r.totalHours > 0).length;

    // Top regiones
    const topRegions = comparison.regions
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 5)
      .map(region => ({
        regionId: region.regionId,
        regionName: region.regionName,
        totalHours: region.totalHours,
        percentage: totalHours > 0 ? (region.totalHours / totalHours) * 100 : 0
      }));

    // Para obtener top countries y languages, usar country-breakdown
    const countryBreakdown = await this.regionalAnalyticsService.getCountryBreakdown(
      undefined, // Todas las regiones
      { ...filters, take: 5 },
      req.user
    );

    const languageDistribution = await this.regionalAnalyticsService.getLanguageDistribution(
      undefined, // Todas las regiones
      { ...filters, take: 5 },
      req.user
    );

    return {
      message: 'Dashboard obtenido exitosamente',
      data: {
        totalHours,
        totalEntries,
        activeUsers,
        activeRegions,
        topRegions,
        topCountries: countryBreakdown.countries.slice(0, 5).map(c => ({
          country: c.country,
          totalHours: c.totalHours,
          percentage: c.percentage
        })),
        topLanguages: languageDistribution.languages.slice(0, 5).map(l => ({
          language: l.language,
          totalHours: l.totalHours,
          percentage: l.percentage
        })),
        dateRange: comparison.dateRange
      }
    };
  }

  // ========== ENDPOINTS DE EXPORTACIÓN ==========

  /**
   * GET /reports/export/dashboard-summary/excel
   * Exportar resumen del dashboard a Excel
   */
  @Get('export/dashboard-summary/excel')
  @RequirePerms('report:export')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportDashboardSummaryExcel(
    @Query() filters: ReportFiltersDto,
    @Req() req: any,
    @Res() res: Response
  ): Promise<void> {
    // Reutilizar la lógica del dashboard-summary
    const dashboardData = await this.getDashboardSummary(filters, req);
    
    const buffer = await this.exportService.exportDashboardSummaryToExcel(dashboardData.data);
    
    const filename = `dashboard-summary-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  /**
   * GET /reports/export/regional-summary/:regionId/excel
   * Exportar resumen regional a Excel
   */
  @Get('export/regional-summary/:regionId/excel')
  @RequirePerms('report:export')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportRegionalSummaryExcel(
    @Param('regionId') regionId: string,
    @Query() filters: ReportFiltersDto,
    @Req() req: any,
    @Res() res: Response
  ): Promise<void> {
    const data = await this.regionalAnalyticsService.getRegionalSummary(
      regionId,
      filters,
      req.user
    );

    const buffer = await this.exportService.exportRegionalSummaryToExcel(data);
    
    const filename = `regional-summary-${data.regionName}-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  /**
   * GET /reports/export/regional-comparison/excel
   * Exportar comparación regional a Excel
   */
  @Get('export/regional-comparison/excel')
  @RequirePerms('report:export')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportRegionalComparisonExcel(
    @Query() filters: ReportFiltersDto,
    @Req() req: any,
    @Res() res: Response
  ): Promise<void> {
    if (!filters.regionIds || filters.regionIds.length < 2) {
      throw new BadRequestException('Se requieren al menos 2 regionIds para la comparación');
    }

    if (filters.regionIds.length > 10) {
      throw new BadRequestException('Máximo 10 regiones para comparación');
    }

    const data = await this.regionalAnalyticsService.getRegionalComparison(
      filters.regionIds,
      filters,
      req.user
    );

    const buffer = await this.exportService.exportRegionalComparisonToExcel(data);
    
    const filename = `regional-comparison-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  /**
   * GET /reports/export/country-breakdown/excel
   * GET /reports/export/country-breakdown/:regionId/excel
   * Exportar desglose por países a Excel
   */
  @Get('export/country-breakdown/:regionId?/excel')
  @RequirePerms('report:export')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportCountryBreakdownExcel(
    @Param('regionId') regionId: string | undefined,
    @Query() filters: ReportFiltersDto,
    @Req() req: any,
    @Res() res: Response
  ): Promise<void> {
    const data = await this.regionalAnalyticsService.getCountryBreakdown(
      regionId,
      filters,
      req.user
    );

    const buffer = await this.exportService.exportCountryBreakdownToExcel(data);
    
    const regionSuffix = data.regionName ? `-${data.regionName}` : '';
    const filename = `country-breakdown${regionSuffix}-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  /**
   * GET /reports/export/language-distribution/excel
   * GET /reports/export/language-distribution/:regionId/excel
   * Exportar distribución de idiomas a Excel
   */
  @Get('export/language-distribution/:regionId?/excel')
  @RequirePerms('report:export')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportLanguageDistributionExcel(
    @Param('regionId') regionId: string | undefined,
    @Query() filters: ReportFiltersDto,
    @Req() req: any,
    @Res() res: Response
  ): Promise<void> {
    const data = await this.regionalAnalyticsService.getLanguageDistribution(
      regionId,
      filters,
      req.user
    );

    const buffer = await this.exportService.exportLanguageDistributionToExcel(data);
    
    const regionSuffix = data.regionName ? `-${data.regionName}` : '';
    const filename = `language-distribution${regionSuffix}-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

}