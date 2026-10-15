const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log("Starting database cleanup...");

  // 1. Delete transactional records in cascade/dependency order
  const delCorrections = await prisma.attendanceCorrection.deleteMany();
  console.log(`Deleted ${delCorrections.count} attendance corrections.`);

  const delRecords = await prisma.attendanceRecord.deleteMany();
  console.log(`Deleted ${delRecords.count} attendance records.`);

  const delCells = await prisma.scanCell.deleteMany();
  console.log(`Deleted ${delCells.count} scan cells.`);

  const delSheets = await prisma.attendanceSheet.deleteMany();
  console.log(`Deleted ${delSheets.count} attendance sheets.`);

  const delStudents = await prisma.student.deleteMany();
  console.log(`Deleted ${delStudents.count} students.`);

  const delClassSubjects = await prisma.classSubject.deleteMany();
  console.log(`Deleted ${delClassSubjects.count} class-subject relations.`);

  const delSubjects = await prisma.subject.deleteMany();
  console.log(`Deleted ${delSubjects.count} subjects.`);

  const delClasses = await prisma.class.deleteMany();
  console.log(`Deleted ${delClasses.count} classes.`);

  const delLogs = await prisma.auditLog.deleteMany();
  console.log(`Deleted ${delLogs.count} audit logs.`);

  // 2. Clean uploaded images in public/uploads/
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    let removedFiles = 0;
    for (const file of files) {
      if (file !== ".gitkeep") {
        try {
          fs.unlinkSync(path.join(uploadsDir, file));
          removedFiles++;
        } catch (e) {
          console.error(`Failed to delete ${file}:`, e.message);
        }
      }
    }
    console.log(`Cleaned ${removedFiles} uploaded image file(s) from public/uploads/.`);
  }

  // 3. Final count verification
  const [students, records, sheets, cells, classes, subjects, logs] = await Promise.all([
    prisma.student.count(),
    prisma.attendanceRecord.count(),
    prisma.attendanceSheet.count(),
    prisma.scanCell.count(),
    prisma.class.count(),
    prisma.subject.count(),
    prisma.auditLog.count(),
  ]);

  console.log("Database cleanup completed successfully! Remaining counts:", {
    students,
    records,
    sheets,
    cells,
    classes,
    subjects,
    logs,
  });
}

cleanDatabase()
  .catch((err) => {
    console.error("Cleanup error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
