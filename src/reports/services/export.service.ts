import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { RegionalSummaryDto } from '../dto/regional-summary.dto';
import { RegionalComparisonDto } from '../dto/regional-comparison.dto';
import { CountryBreakdownDto } from '../dto/country-breakdown.dto';
import { LanguageDistributionDto } from '../dto/language-distribution.dto';

@Injectable()
export class ExportService {
  
  /**
   * Exportar resumen regional a Excel
   */
  async exportRegionalSummaryToExcel(data: RegionalSummaryDto): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Resumen Regional');

    // Título
    worksheet.mergeCells('A1:E1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `Resumen Regional: ${data.regionName}`;
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center' };

    // Información general
    worksheet.addRow(['']);
    worksheet.addRow(['Información General']);
    worksheet.addRow(['Total de Horas:', data.totalHours]);
    worksheet.addRow(['Total de Entradas:', data.totalEntries]);
    worksheet.addRow(['Usuarios Activos:', data.activeUsers]);
    worksheet.addRow(['Período:', `${data.dateRange.startDate} - ${data.dateRange.endDate}`]);

    // Países principales
    worksheet.addRow(['']);
    worksheet.addRow(['Países Principales']);
    worksheet.addRow(['País', 'Horas', 'Entradas', 'Porcentaje']);
    
    data.topCountries.forEach(country => {
      worksheet.addRow([
        country.country,
        country.totalHours,
        country.totalEntries,
        `${country.percentage.toFixed(2)}%`
      ]);
    });

    // Idiomas
    worksheet.addRow(['']);
    worksheet.addRow(['Distribución de Idiomas']);
    worksheet.addRow(['Idioma', 'Horas', 'Entradas', 'Porcentaje']);
    
    data.languageBreakdown.forEach(lang => {
      worksheet.addRow([
        lang.language,
        lang.totalHours,
        lang.totalEntries,
        `${lang.percentage.toFixed(2)}%`
      ]);
    });

    // Formatear encabezados
    worksheet.getRow(3).font = { bold: true };
    worksheet.getRow(9).font = { bold: true };
    worksheet.getRow(10).font = { bold: true };
    worksheet.getRow(9 + data.topCountries.length + 2).font = { bold: true };
    worksheet.getRow(9 + data.topCountries.length + 3).font = { bold: true };

    // Ajustar ancho de columnas
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    return Buffer.from(await workbook.xlsx.writeBuffer() as ArrayBuffer);
  }

  /**
   * Exportar comparación regional a Excel
   */
  async exportRegionalComparisonToExcel(data: RegionalComparisonDto): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Comparación Regional');

    // Título
    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Comparación Regional';
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center' };

    // Resumen general
    worksheet.addRow(['']);
    worksheet.addRow(['Resumen General']);
    worksheet.addRow(['Total de Regiones:', data.summary.totalRegions]);
    worksheet.addRow(['Total de Horas:', data.summary.totalHours]);
    worksheet.addRow(['Total de Entradas:', data.summary.totalEntries]);
    worksheet.addRow(['Promedio por Región:', data.summary.averageHoursPerRegion.toFixed(2)]);
    worksheet.addRow(['Período:', `${data.dateRange.startDate} - ${data.dateRange.endDate}`]);

    // Detalles por región
    worksheet.addRow(['']);
    worksheet.addRow(['Detalles por Región']);
    worksheet.addRow([
      'Región',
      'Total Horas',
      'Total Entradas',
      'Usuarios Activos',
      'Horas/Usuario',
      'País Principal',
      'Idioma Principal'
    ]);
    
    data.regions.forEach(region => {
      worksheet.addRow([
        region.regionName,
        region.totalHours,
        region.totalEntries,
        region.activeUsers,
        region.avgHoursPerUser.toFixed(2),
        region.topCountry,
        region.topLanguage
      ]);
    });

    // Formatear encabezados
    worksheet.getRow(3).font = { bold: true };
    worksheet.getRow(10).font = { bold: true };
    worksheet.getRow(11).font = { bold: true };

    // Ajustar ancho de columnas
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    return Buffer.from(await workbook.xlsx.writeBuffer() as ArrayBuffer);
  }

  /**
   * Exportar desglose por países a Excel
   */
  async exportCountryBreakdownToExcel(data: CountryBreakdownDto): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Desglose por Países');

    // Título
    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = data.regionName ? `Países - ${data.regionName}` : 'Desglose por Países';
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center' };

    // Resumen
    worksheet.addRow(['']);
    worksheet.addRow(['Resumen']);
    worksheet.addRow(['Total de Países:', data.totalCountries]);
    worksheet.addRow(['Total de Horas:', data.totalHours]);
    worksheet.addRow(['Total de Entradas:', data.totalEntries]);
    worksheet.addRow(['País Más Activo:', data.summary.mostActiveCountry]);
    worksheet.addRow(['Promedio por País:', data.summary.avgHoursPerCountry.toFixed(2)]);

    // Detalles por país
    worksheet.addRow(['']);
    worksheet.addRow(['Detalles por País']);
    worksheet.addRow([
      'Posición',
      'País',
      'Total Horas',
      'Total Entradas',
      'Usuarios Activos',
      'Porcentaje'
    ]);
    
    data.countries.forEach(country => {
      worksheet.addRow([
        country.rank,
        country.country,
        country.totalHours,
        country.totalEntries,
        country.activeUsers,
        `${country.percentage.toFixed(2)}%`
      ]);
    });

    // Formatear encabezados
    worksheet.getRow(3).font = { bold: true };
    worksheet.getRow(10).font = { bold: true };
    worksheet.getRow(11).font = { bold: true };

    // Ajustar ancho de columnas
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    return Buffer.from(await workbook.xlsx.writeBuffer() as ArrayBuffer);
  }

  /**
   * Exportar distribución de idiomas a Excel
   */
  async exportLanguageDistributionToExcel(data: LanguageDistributionDto): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Distribución de Idiomas');

    // Título
    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = data.regionName ? `Idiomas - ${data.regionName}` : 'Distribución de Idiomas';
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center' };

    // Resumen
    worksheet.addRow(['']);
    worksheet.addRow(['Resumen']);
    worksheet.addRow(['Total de Idiomas:', data.totalLanguages]);
    worksheet.addRow(['Total de Horas:', data.totalHours]);
    worksheet.addRow(['Total de Entradas:', data.totalEntries]);
    worksheet.addRow(['Idioma Más Usado:', data.summary.mostUsedLanguage]);
    worksheet.addRow(['Promedio por Idioma:', data.summary.avgHoursPerLanguage.toFixed(2)]);

    // Detalles por idioma
    worksheet.addRow(['']);
    worksheet.addRow(['Detalles por Idioma']);
    worksheet.addRow([
      'Posición',
      'Idioma',
      'Total Horas',
      'Total Entradas',
      'Usuarios Activos',
      'Porcentaje'
    ]);
    
    data.languages.forEach(language => {
      worksheet.addRow([
        language.rank,
        language.language,
        language.totalHours,
        language.totalEntries,
        language.activeUsers,
        `${language.percentage.toFixed(2)}%`
      ]);
    });

    // Formatear encabezados
    worksheet.getRow(3).font = { bold: true };
    worksheet.getRow(10).font = { bold: true };
    worksheet.getRow(11).font = { bold: true };

    // Ajustar ancho de columnas
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    return Buffer.from(await workbook.xlsx.writeBuffer() as ArrayBuffer);
  }

  /**
   * Exportar dashboard summary a Excel
   */
  async exportDashboardSummaryToExcel(data: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Resumen Dashboard');

    // Título
    worksheet.mergeCells('A1:E1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Resumen General de Reportes';
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center' };

    // Métricas principales
    worksheet.addRow(['']);
    worksheet.addRow(['Métricas Principales']);
    worksheet.addRow(['Total de Horas:', data.totalHours]);
    worksheet.addRow(['Total de Entradas:', data.totalEntries]);
    worksheet.addRow(['Usuarios Activos:', data.activeUsers]);
    worksheet.addRow(['Regiones Activas:', data.activeRegions]);
    worksheet.addRow(['Período:', `${data.dateRange.startDate} - ${data.dateRange.endDate}`]);

    // Top regiones
    worksheet.addRow(['']);
    worksheet.addRow(['Principales Regiones']);
    worksheet.addRow(['Región', 'Horas', 'Porcentaje']);
    
    data.topRegions.forEach((region: any) => {
      worksheet.addRow([
        region.regionName,
        region.totalHours,
        `${region.percentage.toFixed(2)}%`
      ]);
    });

    // Top países
    worksheet.addRow(['']);
    worksheet.addRow(['Principales Países']);
    worksheet.addRow(['País', 'Horas', 'Porcentaje']);
    
    data.topCountries.forEach((country: any) => {
      worksheet.addRow([
        country.country,
        country.totalHours,
        `${country.percentage.toFixed(2)}%`
      ]);
    });

    // Top idiomas
    worksheet.addRow(['']);
    worksheet.addRow(['Principales Idiomas']);
    worksheet.addRow(['Idioma', 'Horas', 'Porcentaje']);
    
    data.topLanguages.forEach((language: any) => {
      worksheet.addRow([
        language.language,
        language.totalHours,
        `${language.percentage.toFixed(2)}%`
      ]);
    });

    // Formatear encabezados
    const boldRows = [3, 9, 10, 15, 16, 21, 22];
    boldRows.forEach(rowNum => {
      const row = worksheet.getRow(rowNum);
      if (row.cellCount > 0) {
        row.font = { bold: true };
      }
    });

    // Ajustar ancho de columnas
    worksheet.columns.forEach(column => {
      column.width = 20;
    });

    return Buffer.from(await workbook.xlsx.writeBuffer() as ArrayBuffer);
  }
}