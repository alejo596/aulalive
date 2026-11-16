import prisma from '../config/database';
import * as XLSX from 'xlsx';
import { stringify } from 'csv-stringify/sync';
import PDFDocument from 'pdfkit';

export class ExportService {
  /**
   * Generates an Excel workbook (Buffer) containing session audit, rankings, and item analysis
   */
  static async exportSessionToExcel(sessionId: string): Promise<Buffer> {
    const session = await prisma.liveSession.findUnique({
      where: { id: sessionId },
      include: {
        quiz: {
          include: {
            questions: {
              include: { answerOptions: true }
            }
          }
        },
        participants: {
          include: {
            score: true,
            responses: true
          }
        }
      }
    });

    if (!session) throw new Error('Sesión no encontrada');

    // Sheet 1: Resumen y Metadatos
    const summaryData = [
      ['Plataforma AulaLive - Reporte Oficial de Sesión Interactiva'],
      ['Fecha de Emisión', new Date().toLocaleString('es-CL')],
      ['Cuestionario', session.quiz.title],
      ['PIN de Sesión', session.pinCode],
      ['Estado', session.status],
      ['Total Alumnos Conectados', session.participants.length],
      ['Total Preguntas', session.quiz.questions.length]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

    // Sheet 2: Tabla de Calificaciones y Rendimiento Estudiantil
    const studentsData = session.participants.map((p, idx) => ({
      Ranking: p.score?.rank || idx + 1,
      Estudiante: p.nickname,
      Identificador_RUT: p.studentIdentifier || 'Anónimo',
      Puntaje_Total: p.score?.totalScore || 0,
      Respuestas_Correctas: p.score?.correctAnswers || 0,
      Respuestas_Incorrectas: p.score?.incorrectAnswers || 0,
      Tiempo_Promedio_Seg: ((p.score?.averageTimeMs || 0) / 1000).toFixed(2),
      Nota_Final_Chile: p.score?.finalGrade?.toFixed(1) || '1.0',
      Estado: (p.score?.finalGrade || 1.0) >= 4.0 ? 'APROBADO' : 'REPROBADO'
    }));
    const wsStudents = XLSX.utils.json_to_sheet(studentsData);

    // Sheet 3: Respuestas Individuales por Pregunta
    const responsesData = await prisma.response.findMany({
      where: { sessionId },
      include: {
        participant: true,
        question: true,
        selectedOption: true
      }
    });

    const detailedResponses = responsesData.map(r => ({
      Estudiante: r.participant.nickname,
      Pregunta: r.question.text,
      Tipo: r.question.type,
      Alternativa_Elegida: r.selectedOption?.text || r.textResponse || 'N/A',
      Es_Correcta: r.isCorrect ? 'SÍ' : 'NO',
      Puntos_Ganados: r.pointsEarned,
      Tiempo_Respuesta_Seg: (r.responseTimeMs / 1000).toFixed(2),
      Hora_Envio: r.submittedAt.toLocaleTimeString('es-CL')
    }));
    const wsResponses = XLSX.utils.json_to_sheet(detailedResponses);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');
    XLSX.utils.book_append_sheet(wb, wsStudents, 'Calificaciones');
    XLSX.utils.book_append_sheet(wb, wsResponses, 'Bitacora_Respuestas');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return buffer as Buffer;
  }

  /**
   * Generates a CSV string containing all student scores and outcomes
   */
  static async exportSessionToCSV(sessionId: string): Promise<string> {
    const scores = await prisma.score.findMany({
      where: { sessionId },
      include: {
        participant: true
      },
      orderBy: { rank: 'asc' }
    });

    const rows = scores.map(s => [
      s.rank,
      s.participant.nickname,
      s.participant.studentIdentifier || 'N/A',
      s.totalScore,
      s.correctAnswers,
      s.incorrectAnswers,
      (s.averageTimeMs / 1000).toFixed(2),
      s.finalGrade.toFixed(1),
      s.finalGrade >= 4.0 ? 'APROBADO' : 'REPROBADO'
    ]);

    const csvContent = stringify([
      ['Ranking', 'Estudiante', 'RUT/Identificador', 'Puntaje', 'Correctas', 'Incorrectas', 'Tiempo_Promedio_Seg', 'Nota', 'Condicion'],
      ...rows
    ], { delimiter: ';' });

    return '\uFEFF' + csvContent; // BOM for proper Excel UTF-8 display
  }

  /**
   * Generates a professional PDF report (Buffer) using PDFKit
   */
  static async exportSessionToPDF(sessionId: string): Promise<Buffer> {
    const session = await prisma.liveSession.findUnique({
      where: { id: sessionId },
      include: {
        quiz: true,
        hostTeacher: true,
        participants: {
          include: { score: true }
        }
      }
    });

    if (!session) throw new Error('Sesión no encontrada');

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc.fillColor('#1e3a8a')
         .fontSize(22)
         .font('Helvetica-Bold')
         .text('AulaLive - Informe de Resultados en Vivo', { align: 'center' });
      
      doc.moveDown(0.5);
      doc.fillColor('#64748b')
         .fontSize(11)
         .font('Helvetica')
         .text(`Cuestionario: ${session.quiz.title}`, { align: 'center' })
         .text(`Docente: ${session.hostTeacher.firstName} ${session.hostTeacher.lastName} | PIN: ${session.pinCode} | Fecha: ${new Date().toLocaleDateString('es-CL')}`, { align: 'center' });

      doc.moveDown(1.5);

      // KPI Boxes
      doc.rect(40, 110, 515, 60).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold');
      doc.text(`Participantes: ${session.participants.length}`, 60, 125);
      
      const avgScore = session.participants.length > 0
        ? Math.round(session.participants.reduce((acc, p) => acc + (p.score?.totalScore || 0), 0) / session.participants.length)
        : 0;
      doc.text(`Puntaje Promedio: ${avgScore} pts`, 220, 125);

      const approvedCount = session.participants.filter(p => (p.score?.finalGrade || 1.0) >= 4.0).length;
      doc.text(`Aprobados (>= 4.0): ${approvedCount} de ${session.participants.length}`, 380, 125);

      doc.moveDown(4);

      // Table Header
      doc.fillColor('#0284c7').fontSize(14).font('Helvetica-Bold').text('Tabla de Posiciones y Calificaciones', 40, 190);
      doc.moveDown(0.5);

      let yPos = 215;
      doc.rect(40, yPos, 515, 20).fill('#0f172a');
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
      doc.text('Rank', 50, yPos + 5);
      doc.text('Estudiante / Pareja', 90, yPos + 5);
      doc.text('RUT / ID', 240, yPos + 5);
      doc.text('Aciertos', 330, yPos + 5);
      doc.text('Puntos', 400, yPos + 5);
      doc.text('Nota (60%)', 470, yPos + 5);

      yPos += 22;

      // Table Rows
      const sortedParticipants = [...session.participants].sort((a, b) => (b.score?.totalScore || 0) - (a.score?.totalScore || 0));

      sortedParticipants.forEach((p, idx) => {
        if (yPos > 750) {
          doc.addPage();
          yPos = 40;
        }

        const isEven = idx % 2 === 0;
        if (isEven) {
          doc.rect(40, yPos, 515, 18).fill('#f1f5f9');
        }

        const grade = p.score?.finalGrade || 1.0;
        const gradeColor = grade >= 4.0 ? '#0284c7' : '#dc2626';

        doc.fillColor('#334155').fontSize(9).font('Helvetica');
        doc.text(`#${idx + 1}`, 50, yPos + 4);
        doc.text(p.nickname.substring(0, 24), 90, yPos + 4);
        doc.text(p.studentIdentifier || '-', 240, yPos + 4);
        doc.text(`${p.score?.correctAnswers || 0}`, 330, yPos + 4);
        doc.text(`${p.score?.totalScore || 0}`, 400, yPos + 4);
        
        doc.fillColor(gradeColor).font('Helvetica-Bold');
        doc.text(grade.toFixed(1), 470, yPos + 4);

        yPos += 20;
      });

      doc.end();
    });
  }
}

