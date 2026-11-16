import { Request, Response, NextFunction } from 'express';
import { ExportService } from '../services/export.service';

export class ReportController {
  static async downloadExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const buffer = await ExportService.exportSessionToExcel(sessionId);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=AulaLive_Reporte_${sessionId}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  static async downloadCSV(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const csv = await ExportService.exportSessionToCSV(sessionId);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=AulaLive_Reporte_${sessionId}.csv`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }

  static async downloadPDF(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const buffer = await ExportService.exportSessionToPDF(sessionId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=AulaLive_Reporte_${sessionId}.pdf`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

