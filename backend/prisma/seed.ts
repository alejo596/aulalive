import { PrismaClient, RoleType, QuestionType, SessionStatus } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  // SHA-256 with salt for standalone portable verification
  const salt = 'aulalive_secure_salt_2026';
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

async function main() {
  console.log('🌱 Starting AulaLive Database Seeding...');

  // 1. Roles
  const adminRole = await prisma.role.upsert({
    where: { name: RoleType.ADMIN },
    update: {},
    create: {
      name: RoleType.ADMIN,
      description: 'Administrador del sistema AulaLive con acceso global'
    }
  });

  const teacherRole = await prisma.role.upsert({
    where: { name: RoleType.TEACHER },
    update: {},
    create: {
      name: RoleType.TEACHER,
      description: 'Docente facultado para crear cuestionarios, dictar sesiones y emitir informes'
    }
  });

  const studentRole = await prisma.role.upsert({
    where: { name: RoleType.STUDENT },
    update: {},
    create: {
      name: RoleType.STUDENT,
      description: 'Estudiante participante en actividades interactivas en vivo'
    }
  });

  console.log('✅ Roles initialized');

  // 2. Users (Admin, Teacher, Students)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@aulalive.edu' },
    update: {},
    create: {
      email: 'admin@aulalive.edu',
      passwordHash: hashPassword('Admin1234*'),
      firstName: 'Alejandro',
      lastName: 'Administrador',
      rut: '15.987.654-3',
      roleId: adminRole.id,
      isActive: true
    }
  });

  const teacherUser = await prisma.user.upsert({
    where: { email: 'docente@aulalive.edu' },
    update: {},
    create: {
      email: 'docente@aulalive.edu',
      passwordHash: hashPassword('Docente1234*'),
      firstName: 'Profesor',
      lastName: 'González',
      rut: '16.123.456-7',
      roleId: teacherRole.id,
      isActive: true
    }
  });

  const studentsData = [
    { email: 'camila.soto@aulalive.edu', first: 'Camila', last: 'Soto', rut: '20.111.222-3' },
    { email: 'matias.alarcon@aulalive.edu', first: 'Matías', last: 'Alarcón', rut: '20.333.444-5' },
    { email: 'felipe.morales@aulalive.edu', first: 'Felipe', last: 'Morales', rut: '20.555.666-7' },
    { email: 'valentina.solis@aulalive.edu', first: 'Valentina', last: 'Solís', rut: '20.777.888-9' },
    { email: 'ignacio.perez@aulalive.edu', first: 'Ignacio', last: 'Pérez', rut: '20.999.000-1' }
  ];

  for (const st of studentsData) {
    await prisma.user.upsert({
      where: { email: st.email },
      update: {},
      create: {
        email: st.email,
        passwordHash: hashPassword('Alumno1234*'),
        firstName: st.first,
        lastName: st.last,
        rut: st.rut,
        roleId: studentRole.id,
        isActive: true
      }
    });
  }

  console.log('✅ Users initialized (Admin, Teacher, 5 Students)');

  // 3. Course and Subject
  const course = await prisma.course.upsert({
    where: { code: 'IEI-085-2026' },
    update: {},
    create: {
      code: 'IEI-085-2026',
      name: 'Programación Orientada a Objetos',
      description: 'Ingeniería en Informática - Desarrollo Modular e Integración',
      academicYear: 2026,
      semester: 2,
      isActive: true
    }
  });

  const subject = await prisma.subject.upsert({
    where: { code: 'UNIDAD-II' },
    update: {},
    create: {
      code: 'UNIDAD-II',
      name: 'Unidad II: Programación de Aplicaciones e Integración de Componentes',
      description: 'APIs Java, Colecciones Dinámicas, JUnit, Persistencia JDBC con XAMPP Portable',
      courseId: course.id
    }
  });

  console.log('✅ Course and Subject initialized');

  // 4. Master Interactive Quiz with all 10 types of questions
  const quiz = await prisma.quiz.create({
    data: {
      title: 'Evaluación Interactiva Unidad II: POO, JUnit y MySQL XAMPP',
      description: 'Cuestionario integral para actividades en tiempo real con estadísticas dinámicas y ranking de clase.',
      code: 'POO-UNIDAD2-LIVE',
      teacherId: teacherUser.id,
      subjectId: subject.id,
      isPublished: true,
      timeLimitSec: 25,
      isAnonymous: false,
      allowInstantFeedback: true,
      questions: {
        create: [
          // 1. SINGLE_CHOICE
          {
            orderNum: 1,
            text: '¿Cuál método de la clase String elimina espacios en blanco al inicio y al final de una cadena?',
            type: QuestionType.SINGLE_CHOICE,
            points: 100,
            timeLimitSec: 20,
            explanation: 'trim() retorna una copia de la cadena sin caracteres en blanco en los extremos.',
            answerOptions: {
              create: [
                { orderNum: 1, text: 'String.stripAll()', isCorrect: false },
                { orderNum: 2, text: 'String.trim()', isCorrect: true },
                { orderNum: 3, text: 'String.clean()', isCorrect: false },
                { orderNum: 4, text: 'String.slice()', isCorrect: false }
              ]
            }
          },

          // 2. MULTIPLE_CHOICE
          {
            orderNum: 2,
            text: '¿Cuáles de los siguientes métodos pertenecen a la clase ArrayList en Java? (Seleccione todos los que correspondan)',
            type: QuestionType.MULTIPLE_CHOICE,
            points: 150,
            timeLimitSec: 25,
            explanation: 'add(), size() y remove() pertenecen a java.util.ArrayList. length es un atributo de arreglos estáticos.',
            answerOptions: {
              create: [
                { orderNum: 1, text: 'add(elemento)', isCorrect: true },
                { orderNum: 2, text: 'size()', isCorrect: true },
                { orderNum: 3, text: 'length', isCorrect: false },
                { orderNum: 4, text: 'remove(indice)', isCorrect: true }
              ]
            }
          },

          // 3. TRUE_FALSE
          {
            orderNum: 3,
            text: 'En JUnit 5, la aserción assertEquals(esperado, actual) compara que dos valores sean idénticos y falla la prueba si difieren.',
            type: QuestionType.TRUE_FALSE,
            points: 100,
            timeLimitSec: 15,
            explanation: 'Verdadero. assertEquals() es la aserción fundamental para validar igualdad en pruebas unitarias.',
            answerOptions: {
              create: [
                { orderNum: 1, text: 'Verdadero', isCorrect: true },
                { orderNum: 2, text: 'Falso', isCorrect: false }
              ]
            }
          },

          // 4. SHORT_ANSWER
          {
            orderNum: 4,
            text: '¿Cuál es el número de puerto TCP estándar en el que escucha el servicio MySQL de XAMPP Portable?',
            type: QuestionType.SHORT_ANSWER,
            points: 120,
            timeLimitSec: 20,
            explanation: 'El puerto estándar de MySQL/MariaDB es el 3306.',
            answerOptions: {
              create: [
                { orderNum: 1, text: '3306', isCorrect: true }
              ]
            }
          },

          // 5. WORD_CLOUD
          {
            orderNum: 5,
            text: 'En una o dos palabras, ¿qué ventaja técnica ofrece el uso de PreparedStatement en JDBC?',
            type: QuestionType.WORD_CLOUD,
            points: 80,
            timeLimitSec: 25,
            explanation: 'Previene la inyección SQL (SQL Injection), parametriza consultas y optimiza el plan de ejecución.',
            answerOptions: {
              create: [
                { orderNum: 1, text: 'Seguridad', isCorrect: true },
                { orderNum: 2, text: 'Anti SQL Injection', isCorrect: true },
                { orderNum: 3, text: 'Rendimiento', isCorrect: true }
              ]
            }
          },

          // 6. LIKERT SCALE
          {
            orderNum: 6,
            text: 'Valora tu nivel de confianza para configurar una conexión JDBC con el servidor XAMPP Portable en puerto 3306:',
            type: QuestionType.LIKERT,
            points: 50,
            timeLimitSec: 20,
            explanation: 'Escala de autopercepción pedagógica.',
            answerOptions: {
              create: [
                { orderNum: 1, text: '1 - Muy inseguro / Bloqueado', isCorrect: true },
                { orderNum: 2, text: '2 - Inseguro', isCorrect: true },
                { orderNum: 3, text: '3 - Moderado', isCorrect: true },
                { orderNum: 4, text: '4 - Seguro', isCorrect: true },
                { orderNum: 5, text: '5 - Muy seguro / Experto', isCorrect: true }
              ]
            }
          },

          // 7. POLL / SURVEY
          {
            orderNum: 7,
            text: '¿Qué herramienta prefieres utilizar para administrar las tablas MySQL de tu base de datos local?',
            type: QuestionType.POLL,
            points: 50,
            timeLimitSec: 20,
            explanation: 'Encuesta rápida de opinión de aula.',
            answerOptions: {
              create: [
                { orderNum: 1, text: 'phpMyAdmin de XAMPP', isCorrect: true },
                { orderNum: 2, text: 'MySQL Workbench', isCorrect: true },
                { orderNum: 3, text: 'DBeaver', isCorrect: true },
                { orderNum: 4, text: 'Línea de comandos / Consola', isCorrect: true }
              ]
            }
          },

          // 8. ORDERING
          {
            orderNum: 8,
            text: 'Ordena la secuencia correcta para ejecutar una consulta y leer registros con JDBC en Java:',
            type: QuestionType.ORDERING,
            points: 150,
            timeLimitSec: 35,
            explanation: '1. Iniciar servidor MySQL en XAMPP -> 2. DriverManager.getConnection -> 3. conn.prepareStatement -> 4. ps.executeQuery -> 5. while(rs.next())',
            answerOptions: {
              create: [
                { orderNum: 1, text: 'Iniciar servicio MySQL en panel XAMPP', isCorrect: true },
                { orderNum: 2, text: 'Obtener conexión con DriverManager.getConnection()', isCorrect: true },
                { orderNum: 3, text: 'Crear sentencia con conn.prepareStatement(sql)', isCorrect: true },
                { orderNum: 4, text: 'Ejecutar consulta con ps.executeQuery()', isCorrect: true },
                { orderNum: 5, text: 'Recorrer filas con while(rs.next())', isCorrect: true }
              ]
            }
          }
        ]
      }
    }
  });

  console.log(`✅ Master Quiz created (ID: ${quiz.id}) with 8 comprehensive question types`);

  // 5. Initial Demo Live Session with PIN 789456
  const liveSession = await prisma.liveSession.create({
    data: {
      quizId: quiz.id,
      hostTeacherId: teacherUser.id,
      pinCode: '789456',
      status: SessionStatus.LOBBY,
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=http://localhost:5173/join?pin=789456'
    }
  });

  console.log(`✅ Demo Live Session ready on PIN: ${liveSession.pinCode}`);
  console.log('✨ Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

