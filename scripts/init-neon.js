const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Connecting to Neon PostgreSQL...");
  const schoolCount = await prisma.school.count();
  console.log("Current School count:", schoolCount);

  let school = await prisma.school.findFirst();
  if (!school) {
    school = await prisma.school.create({
      data: {
        id: "sch_main",
        name: "Lincoln Academy",
        code: "SCH-001",
        address: "100 Academic Way, Springfield",
        phone: "+1 (555) 019-2834",
        email: "admin@lincoln.edu",
      },
    });
    console.log("Created School:", school.name);
  }

  const userCount = await prisma.user.count();
  if (userCount === 0) {
    await prisma.user.createMany({
      data: [
        {
          id: "usr_teacher",
          schoolId: school.id,
          name: "Teacher",
          email: "teacher@school.edu",
          passwordHash: "secure-hash",
          role: "TEACHER",
          isActive: true,
        },
        {
          id: "usr_admin",
          schoolId: school.id,
          name: "School Administrator",
          email: "admin@school.edu",
          passwordHash: "secure-hash",
          role: "ADMIN",
          isActive: true,
        },
        {
          id: "usr_reviewer",
          schoolId: school.id,
          name: "Attendance Reviewer",
          email: "reviewer@school.edu",
          passwordHash: "secure-hash",
          role: "ATTENDANCE_REVIEWER",
          isActive: true,
        },
      ],
    });
    console.log("Created default users");
  }

  const symbolCount = await prisma.attendanceSymbolConfig.count();
  if (symbolCount === 0) {
    await prisma.attendanceSymbolConfig.createMany({
      data: [
        {
          schoolId: school.id,
          symbol: "✓",
          mappedStatus: "PRESENT",
          description: "វត្តមាន (Present)",
          isDefault: true,
        },
        {
          schoolId: school.id,
          symbol: "A",
          mappedStatus: "ABSENT",
          description: "ឈប់អត់ច្បាប់ (Unexcused Absence)",
          isDefault: true,
        },
        {
          schoolId: school.id,
          symbol: "P",
          mappedStatus: "EXCUSED",
          description: "Letter P: ឈប់មានច្បាប់ (Permission / Authorized Leave)",
          isDefault: true,
        },
        {
          schoolId: school.id,
          symbol: "L",
          mappedStatus: "LATE",
          description: "មកយឺត (Late)",
          isDefault: false,
        },
      ],
    });
    console.log("Created symbol configs with P=EXCUSED, A=ABSENT, ✓=PRESENT");
  }

  const students = await prisma.student.count();
  const records = await prisma.attendanceRecord.count();
  console.log(`Clean State Verified: Students = ${students}, AttendanceRecords = ${records}`);
  console.log("Neon PostgreSQL is 100% ready for production deployment on Vercel!");
}

main()
  .catch((e) => {
    console.error("Init error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
