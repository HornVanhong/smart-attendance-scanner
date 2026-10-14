// In-memory persistent data store with full realistic school data
// Gracefully operates when PostgreSQL is offline or during interactive review testing

export interface SchoolModel {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
}

export interface UserModel {
  id: string;
  schoolId: string;
  name: string;
  email: string;
  role: "ADMIN" | "TEACHER" | "ATTENDANCE_REVIEWER";
  avatarUrl: string;
  isActive: boolean;
}

export interface ClassModel {
  id: string;
  schoolId: string;
  name: string;
  gradeLevel: string;
  academicYear: string;
  teacherId?: string;
  studentCount?: number;
}

export interface SubjectModel {
  id: string;
  schoolId: string;
  name: string;
  code: string;
  periodsCount: number;
}

export interface StudentModel {
  id: string;
  schoolId: string;
  classId: string;
  className?: string;
  studentNumber: string;
  fullName: string;
  gender: "M" | "F" | "Other";
  enrollmentDate: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  email?: string;
  phone?: string;
}

export interface ScanCellModel {
  id: string;
  attendanceSheetId: string;
  studentId?: string;
  matchedStudentName?: string;
  rawStudentName?: string;
  rawStudentNumber?: string;
  gender?: string;
  rowIndex: number;
  columnIndex: number;
  dateString?: string;
  period: number;
  cellBoundingBox: { x: number; y: number; w: number; h: number };
  recognizedText?: string;
  recognizedSymbol?: string; // "✓", "A", "P", "L", "E", "?"
  interpretedStatus: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "NEEDS_REVIEW" | "UNMARKED";
  confidenceScore: number; // 0.0 - 1.0
  reviewStatus: "NEEDS_REVIEW" | "VERIFIED" | "CORRECTED" | "AUTO_HIGH";
  isEdited: boolean;
  cropImageUrl?: string;
}

export interface AttendanceSheetModel {
  id: string;
  schoolId: string;
  classId?: string;
  className?: string;
  subjectId?: string;
  subjectName?: string;
  uploadedById: string;
  uploadedByName?: string;
  imageStorageKey: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  processedAt?: string;
  processingStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  verificationStatus: "UNVERIFIED" | "IN_REVIEW" | "VERIFIED" | "REJECTED";
  detectedStudentCount: number;
  detectedCellCount: number;
  highConfidenceCount: number;
  lowConfidenceCount: number;
  sheetDate?: string;
  sheetPeriod?: number;
  metadataJson?: string;
  errorMessage?: string;
  cells: ScanCellModel[];
}

export interface AttendanceRecordModel {
  id: string;
  schoolId: string;
  studentId: string;
  studentName?: string;
  studentNumber?: string;
  classId: string;
  className?: string;
  subjectId: string;
  subjectName?: string;
  attendanceDate: string;
  period: number;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  originalSymbol?: string;
  sourceSheetId?: string;
  sourceScanCellId?: string;
  isVerified: boolean;
  verifiedById?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SymbolConfigModel {
  id: string;
  schoolId: string;
  symbol: string;
  mappedStatus: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "NEEDS_REVIEW";
  description: string;
  isDefault: boolean;
}

export interface AuditLogModel {
  id: string;
  schoolId: string;
  userId?: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

// Initial Mock Seed Data
const DEFAULT_SCHOOL: SchoolModel = {
  id: "sch_oakridge_academy",
  name: "Oakridge Academy",
  code: "OAK-2024",
  address: "742 Evergreen Terrace, Springfield",
  phone: "+1 (555) 234-5678",
  email: "admin@oakridge.edu",
};

const DEFAULT_USERS: UserModel[] = [
  {
    id: "usr_admin",
    schoolId: DEFAULT_SCHOOL.id,
    name: "Dr. Sarah Jenkins",
    email: "admin@oakridge.edu",
    role: "ADMIN",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    isActive: true,
  },
  {
    id: "usr_teacher_chang",
    schoolId: DEFAULT_SCHOOL.id,
    name: "Prof. Michael Chang",
    email: "mchang@oakridge.edu",
    role: "TEACHER",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    isActive: true,
  },
  {
    id: "usr_reviewer_elena",
    schoolId: DEFAULT_SCHOOL.id,
    name: "Elena Rostova",
    email: "erostova@oakridge.edu",
    role: "ATTENDANCE_REVIEWER",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    isActive: true,
  },
];

const DEFAULT_CLASSES: ClassModel[] = [
  {
    id: "cls_10a",
    schoolId: DEFAULT_SCHOOL.id,
    name: "Grade 10 - Section A",
    gradeLevel: "Grade 10",
    academicYear: "2024-2025",
    teacherId: "usr_teacher_chang",
    studentCount: 15,
  },
  {
    id: "cls_10b",
    schoolId: DEFAULT_SCHOOL.id,
    name: "Grade 10 - Section B",
    gradeLevel: "Grade 10",
    academicYear: "2024-2025",
    teacherId: "usr_teacher_chang",
    studentCount: 14,
  },
  {
    id: "cls_11stem",
    schoolId: DEFAULT_SCHOOL.id,
    name: "Grade 11 - STEM Honors",
    gradeLevel: "Grade 11",
    academicYear: "2024-2025",
    teacherId: "usr_admin",
    studentCount: 18,
  },
];

const DEFAULT_SUBJECTS: SubjectModel[] = [
  {
    id: "sub_math101",
    schoolId: DEFAULT_SCHOOL.id,
    name: "Mathematics (Algebra II)",
    code: "MATH-101",
    periodsCount: 5,
  },
  {
    id: "sub_phys201",
    schoolId: DEFAULT_SCHOOL.id,
    name: "Physics (Mechanics)",
    code: "PHYS-201",
    periodsCount: 4,
  },
  {
    id: "sub_eng101",
    schoolId: DEFAULT_SCHOOL.id,
    name: "English Literature",
    code: "ENG-101",
    periodsCount: 4,
  },
  {
    id: "sub_chem101",
    schoolId: DEFAULT_SCHOOL.id,
    name: "General Chemistry",
    code: "CHEM-101",
    periodsCount: 3,
  },
  {
    id: "sub_cs101",
    schoolId: DEFAULT_SCHOOL.id,
    name: "Computer Science Principles",
    code: "CS-101",
    periodsCount: 4,
  },
];

const DEFAULT_STUDENTS: StudentModel[] = [
  { id: "stu_1001", schoolId: DEFAULT_SCHOOL.id, classId: "cls_10a", className: "Grade 10 - Section A", studentNumber: "STU-1001", fullName: "Alexander Wright", gender: "M", enrollmentDate: "2024-09-01", status: "ACTIVE", email: "a.wright@oakridge.edu" },
  { id: "stu_1002", schoolId: DEFAULT_SCHOOL.id, classId: "cls_10a", className: "Grade 10 - Section A", studentNumber: "STU-1002", fullName: "Beatrice Gomez", gender: "F", enrollmentDate: "2024-09-01", status: "ACTIVE", email: "b.gomez@oakridge.edu" },
  { id: "stu_1003", schoolId: DEFAULT_SCHOOL.id, classId: "cls_10a", className: "Grade 10 - Section A", studentNumber: "STU-1003", fullName: "Charles Vance", gender: "M", enrollmentDate: "2024-09-01", status: "ACTIVE", email: "c.vance@oakridge.edu" },
  { id: "stu_1004", schoolId: DEFAULT_SCHOOL.id, classId: "cls_10a", className: "Grade 10 - Section A", studentNumber: "STU-1004", fullName: "Diana Patel", gender: "F", enrollmentDate: "2024-09-01", status: "ACTIVE", email: "d.patel@oakridge.edu" },
  { id: "stu_1005", schoolId: DEFAULT_SCHOOL.id, classId: "cls_10a", className: "Grade 10 - Section A", studentNumber: "STU-1005", fullName: "Ethan Morales", gender: "M", enrollmentDate: "2024-09-01", status: "ACTIVE", email: "e.morales@oakridge.edu" },
  { id: "stu_1006", schoolId: DEFAULT_SCHOOL.id, classId: "cls_10a", className: "Grade 10 - Section A", studentNumber: "STU-1006", fullName: "Fiona Chen", gender: "F", enrollmentDate: "2024-09-01", status: "ACTIVE", email: "f.chen@oakridge.edu" },
  { id: "stu_1007", schoolId: DEFAULT_SCHOOL.id, classId: "cls_10a", className: "Grade 10 - Section A", studentNumber: "STU-1007", fullName: "Gabriel Silva", gender: "M", enrollmentDate: "2024-09-01", status: "ACTIVE", email: "g.silva@oakridge.edu" },
  { id: "stu_1008", schoolId: DEFAULT_SCHOOL.id, classId: "cls_10a", className: "Grade 10 - Section A", studentNumber: "STU-1008", fullName: "Hannah Abbott", gender: "F", enrollmentDate: "2024-09-01", status: "ACTIVE", email: "h.abbott@oakridge.edu" },
  { id: "stu_1009", schoolId: DEFAULT_SCHOOL.id, classId: "cls_10a", className: "Grade 10 - Section A", studentNumber: "STU-1009", fullName: "Ian Malcolm", gender: "M", enrollmentDate: "2024-09-01", status: "ACTIVE", email: "i.malcolm@oakridge.edu" },
  { id: "stu_1010", schoolId: DEFAULT_SCHOOL.id, classId: "cls_10a", className: "Grade 10 - Section A", studentNumber: "STU-1010", fullName: "Julia Roberts", gender: "F", enrollmentDate: "2024-09-01", status: "ACTIVE", email: "j.roberts@oakridge.edu" },
  { id: "stu_1011", schoolId: DEFAULT_SCHOOL.id, classId: "cls_10a", className: "Grade 10 - Section A", studentNumber: "STU-1011", fullName: "Kevin Hart", gender: "M", enrollmentDate: "2024-09-01", status: "ACTIVE", email: "k.hart@oakridge.edu" },
  { id: "stu_1012", schoolId: DEFAULT_SCHOOL.id, classId: "cls_10a", className: "Grade 10 - Section A", studentNumber: "STU-1012", fullName: "Luna Lovegood", gender: "F", enrollmentDate: "2024-09-01", status: "ACTIVE", email: "l.lovegood@oakridge.edu" },
  { id: "stu_1013", schoolId: DEFAULT_SCHOOL.id, classId: "cls_10a", className: "Grade 10 - Section A", studentNumber: "STU-1013", fullName: "Marcus Aurelius", gender: "M", enrollmentDate: "2024-09-01", status: "ACTIVE", email: "m.aurelius@oakridge.edu" },
  { id: "stu_1014", schoolId: DEFAULT_SCHOOL.id, classId: "cls_10a", className: "Grade 10 - Section A", studentNumber: "STU-1014", fullName: "Nina Simone", gender: "F", enrollmentDate: "2024-09-01", status: "ACTIVE", email: "n.simone@oakridge.edu" },
  { id: "stu_1015", schoolId: DEFAULT_SCHOOL.id, classId: "cls_10a", className: "Grade 10 - Section A", studentNumber: "STU-1015", fullName: "Oliver Queen", gender: "M", enrollmentDate: "2024-09-01", status: "ACTIVE", email: "o.queen@oakridge.edu" },
  // Grade 10-B
  { id: "stu_2001", schoolId: DEFAULT_SCHOOL.id, classId: "cls_10b", className: "Grade 10 - Section B", studentNumber: "STU-2001", fullName: "Penelope Cruz", gender: "F", enrollmentDate: "2024-09-01", status: "ACTIVE", email: "p.cruz@oakridge.edu" },
  { id: "stu_2002", schoolId: DEFAULT_SCHOOL.id, classId: "cls_10b", className: "Grade 10 - Section B", studentNumber: "STU-2002", fullName: "Quentin Tarantino", gender: "M", enrollmentDate: "2024-09-01", status: "ACTIVE", email: "q.tarantino@oakridge.edu" },
  { id: "stu_2003", schoolId: DEFAULT_SCHOOL.id, classId: "cls_10b", className: "Grade 10 - Section B", studentNumber: "STU-2003", fullName: "Rachel Green", gender: "F", enrollmentDate: "2024-09-01", status: "ACTIVE", email: "r.green@oakridge.edu" },
  { id: "stu_2004", schoolId: DEFAULT_SCHOOL.id, classId: "cls_10b", className: "Grade 10 - Section B", studentNumber: "STU-2004", fullName: "Samuel Jackson", gender: "M", enrollmentDate: "2024-09-01", status: "ACTIVE", email: "s.jackson@oakridge.edu" },
  { id: "stu_2005", schoolId: DEFAULT_SCHOOL.id, classId: "cls_10b", className: "Grade 10 - Section B", studentNumber: "STU-2005", fullName: "Tara Strong", gender: "F", enrollmentDate: "2024-09-01", status: "ACTIVE", email: "t.strong@oakridge.edu" },
];

const DEFAULT_SYMBOLS: SymbolConfigModel[] = [
  { id: "sym_1", schoolId: DEFAULT_SCHOOL.id, symbol: "✓", mappedStatus: "PRESENT", description: "Standard checkmark indicating student is present", isDefault: true },
  { id: "sym_2", schoolId: DEFAULT_SCHOOL.id, symbol: "A", mappedStatus: "ABSENT", description: "Capital 'A' indicating unexcused absence", isDefault: true },
  { id: "sym_3", schoolId: DEFAULT_SCHOOL.id, symbol: "P", mappedStatus: "PRESENT", description: "Capital 'P' indicating present in roll call", isDefault: false },
  { id: "sym_4", schoolId: DEFAULT_SCHOOL.id, symbol: "L", mappedStatus: "LATE", description: "Capital 'L' indicating tardiness/late arrival", isDefault: true },
  { id: "sym_5", schoolId: DEFAULT_SCHOOL.id, symbol: "E", mappedStatus: "EXCUSED", description: "Capital 'E' indicating authorized medical/family leave", isDefault: true },
  { id: "sym_6", schoolId: DEFAULT_SCHOOL.id, symbol: "?", mappedStatus: "NEEDS_REVIEW", description: "Uncertain or smudged handwritten mark requiring human review", isDefault: true },
  { id: "sym_7", schoolId: DEFAULT_SCHOOL.id, symbol: "-", mappedStatus: "NEEDS_REVIEW", description: "Blank/dash attendance cell", isDefault: false },
];

// Seed sample attendance records
const DEFAULT_ATTENDANCE_RECORDS: AttendanceRecordModel[] = [
  {
    id: "rec_001",
    schoolId: DEFAULT_SCHOOL.id,
    studentId: "stu_1001",
    studentName: "Alexander Wright",
    studentNumber: "STU-1001",
    classId: "cls_10a",
    className: "Grade 10 - Section A",
    subjectId: "sub_math101",
    subjectName: "Mathematics (Algebra II)",
    attendanceDate: "2024-10-14",
    period: 1,
    status: "PRESENT",
    originalSymbol: "✓",
    sourceSheetId: "scan_sample_01",
    isVerified: true,
    verifiedById: "usr_teacher_chang",
    verifiedByName: "Prof. Michael Chang",
    verifiedAt: "2024-10-14T09:15:00Z",
    createdAt: "2024-10-14T09:00:00Z",
    updatedAt: "2024-10-14T09:15:00Z",
  },
  {
    id: "rec_002",
    schoolId: DEFAULT_SCHOOL.id,
    studentId: "stu_1002",
    studentName: "Beatrice Gomez",
    studentNumber: "STU-1002",
    classId: "cls_10a",
    className: "Grade 10 - Section A",
    subjectId: "sub_math101",
    subjectName: "Mathematics (Algebra II)",
    attendanceDate: "2024-10-14",
    period: 1,
    status: "PRESENT",
    originalSymbol: "✓",
    sourceSheetId: "scan_sample_01",
    isVerified: true,
    verifiedById: "usr_teacher_chang",
    verifiedByName: "Prof. Michael Chang",
    verifiedAt: "2024-10-14T09:15:00Z",
    createdAt: "2024-10-14T09:00:00Z",
    updatedAt: "2024-10-14T09:15:00Z",
  },
  {
    id: "rec_003",
    schoolId: DEFAULT_SCHOOL.id,
    studentId: "stu_1003",
    studentName: "Charles Vance",
    studentNumber: "STU-1003",
    classId: "cls_10a",
    className: "Grade 10 - Section A",
    subjectId: "sub_math101",
    subjectName: "Mathematics (Algebra II)",
    attendanceDate: "2024-10-14",
    period: 1,
    status: "ABSENT",
    originalSymbol: "A",
    sourceSheetId: "scan_sample_01",
    isVerified: true,
    verifiedById: "usr_teacher_chang",
    verifiedByName: "Prof. Michael Chang",
    verifiedAt: "2024-10-14T09:15:00Z",
    createdAt: "2024-10-14T09:00:00Z",
    updatedAt: "2024-10-14T09:15:00Z",
  },
  {
    id: "rec_004",
    schoolId: DEFAULT_SCHOOL.id,
    studentId: "stu_1004",
    studentName: "Diana Patel",
    studentNumber: "STU-1004",
    classId: "cls_10a",
    className: "Grade 10 - Section A",
    subjectId: "sub_math101",
    subjectName: "Mathematics (Algebra II)",
    attendanceDate: "2024-10-14",
    period: 1,
    status: "LATE",
    originalSymbol: "L",
    sourceSheetId: "scan_sample_01",
    isVerified: true,
    verifiedById: "usr_teacher_chang",
    verifiedByName: "Prof. Michael Chang",
    verifiedAt: "2024-10-14T09:15:00Z",
    createdAt: "2024-10-14T09:00:00Z",
    updatedAt: "2024-10-14T09:15:00Z",
  },
  {
    id: "rec_005",
    schoolId: DEFAULT_SCHOOL.id,
    studentId: "stu_1005",
    studentName: "Ethan Morales",
    studentNumber: "STU-1005",
    classId: "cls_10a",
    className: "Grade 10 - Section A",
    subjectId: "sub_math101",
    subjectName: "Mathematics (Algebra II)",
    attendanceDate: "2024-10-14",
    period: 1,
    status: "EXCUSED",
    originalSymbol: "E",
    sourceSheetId: "scan_sample_01",
    isVerified: true,
    verifiedById: "usr_teacher_chang",
    verifiedByName: "Prof. Michael Chang",
    verifiedAt: "2024-10-14T09:15:00Z",
    createdAt: "2024-10-14T09:00:00Z",
    updatedAt: "2024-10-14T09:15:00Z",
  },
];

// Generate cells for a sample scan sheet
export function generateSampleScanCells(sheetId: string): ScanCellModel[] {
  const students = DEFAULT_STUDENTS.slice(0, 10);
  const periods = [1, 2, 3];
  const cells: ScanCellModel[] = [];

  const symbolPool = [
    { sym: "✓", status: "PRESENT" as const, conf: 0.96 },
    { sym: "✓", status: "PRESENT" as const, conf: 0.94 },
    { sym: "✓", status: "PRESENT" as const, conf: 0.91 },
    { sym: "A", status: "ABSENT" as const, conf: 0.88 },
    { sym: "L", status: "LATE" as const, conf: 0.82 },
    { sym: "✓", status: "PRESENT" as const, conf: 0.95 },
    { sym: "E", status: "EXCUSED" as const, conf: 0.85 },
    { sym: "?", status: "NEEDS_REVIEW" as const, conf: 0.52 }, // low confidence test cell!
    { sym: "✓", status: "PRESENT" as const, conf: 0.93 },
    { sym: "A", status: "ABSENT" as const, conf: 0.89 },
  ];

  students.forEach((student, rIdx) => {
    periods.forEach((period, cIdx) => {
      const idx = (rIdx * 3 + cIdx) % symbolPool.length;
      const pick = symbolPool[idx];
      const isLow = pick.conf < 0.75 || pick.sym === "?";

      // Calculated table bounding boxes (normalized / pixel coordinates on sample image)
      const x = 320 + cIdx * 110;
      const y = 140 + rIdx * 45;
      const w = 95;
      const h = 38;

      cells.push({
        id: `cell_${sheetId}_${rIdx}_${cIdx}`,
        attendanceSheetId: sheetId,
        studentId: student.id,
        matchedStudentName: student.fullName,
        rawStudentName: student.fullName,
        rawStudentNumber: student.studentNumber,
        gender: student.gender,
        rowIndex: rIdx,
        columnIndex: cIdx,
        dateString: "2024-10-14",
        period: period,
        cellBoundingBox: { x, y, w, h },
        recognizedText: pick.sym,
        recognizedSymbol: pick.sym,
        interpretedStatus: pick.status,
        confidenceScore: pick.conf,
        reviewStatus: isLow ? "NEEDS_REVIEW" : "AUTO_HIGH",
        isEdited: false,
      });
    });
  });

  return cells;
}

const DEFAULT_SAMPLE_SHEET: AttendanceSheetModel = {
  id: "scan_sample_01",
  schoolId: DEFAULT_SCHOOL.id,
  classId: "cls_10a",
  className: "Grade 10 - Section A",
  subjectId: "sub_math101",
  subjectName: "Mathematics (Algebra II)",
  uploadedById: "usr_teacher_chang",
  uploadedByName: "Prof. Michael Chang",
  imageStorageKey: "/samples/attendance_sheet_sample.svg",
  originalFileName: "Grade10_Math_Attendance_Oct14.jpg",
  fileSize: 1420580,
  mimeType: "image/jpeg",
  uploadedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  processedAt: new Date(Date.now() - 3600000 * 1.9).toISOString(),
  processingStatus: "COMPLETED",
  verificationStatus: "IN_REVIEW",
  detectedStudentCount: 10,
  detectedCellCount: 30,
  highConfidenceCount: 26,
  lowConfidenceCount: 4,
  sheetDate: "2024-10-14",
  sheetPeriod: 1,
  cells: generateSampleScanCells("scan_sample_01"),
};

const DEFAULT_AUDIT_LOGS: AuditLogModel[] = [
  {
    id: "log_001",
    schoolId: DEFAULT_SCHOOL.id,
    userId: "usr_teacher_chang",
    userName: "Prof. Michael Chang",
    action: "SCAN_UPLOAD",
    entityType: "AttendanceSheet",
    entityId: "scan_sample_01",
    details: JSON.stringify({ file: "Grade10_Math_Attendance_Oct14.jpg", size: "1.42 MB" }),
    ipAddress: "192.168.1.42",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "log_002",
    schoolId: DEFAULT_SCHOOL.id,
    userId: "usr_teacher_chang",
    userName: "Prof. Michael Chang",
    action: "OCR_PROCESSING_COMPLETED",
    entityType: "AttendanceSheet",
    entityId: "scan_sample_01",
    details: JSON.stringify({ studentsFound: 10, cellsRecognized: 30, highConfidence: 26, lowConfidence: 4 }),
    ipAddress: "192.168.1.42",
    createdAt: new Date(Date.now() - 3600000 * 1.9).toISOString(),
  },
];

// In-Memory Database Store Singleton
class DatabaseStore {
  private school = DEFAULT_SCHOOL;
  private users: UserModel[] = [...DEFAULT_USERS];
  private classes: ClassModel[] = [...DEFAULT_CLASSES];
  private subjects: SubjectModel[] = [...DEFAULT_SUBJECTS];
  private students: StudentModel[] = [...DEFAULT_STUDENTS];
  private symbols: SymbolConfigModel[] = [...DEFAULT_SYMBOLS];
  private sheets: AttendanceSheetModel[] = [DEFAULT_SAMPLE_SHEET];
  private records: AttendanceRecordModel[] = [...DEFAULT_ATTENDANCE_RECORDS];
  private auditLogs: AuditLogModel[] = [...DEFAULT_AUDIT_LOGS];

  // School
  getSchool() {
    return this.school;
  }

  // Users
  getUsers() {
    return this.users;
  }
  getUserById(id: string) {
    return this.users.find((u) => u.id === id);
  }

  // Classes
  getClasses() {
    return this.classes;
  }
  getClassById(id: string) {
    return this.classes.find((c) => c.id === id);
  }
  createClass(data: Omit<ClassModel, "id">) {
    const newClass: ClassModel = {
      id: `cls_${Date.now()}`,
      studentCount: 0,
      ...data,
    };
    this.classes.push(newClass);
    return newClass;
  }

  // Subjects
  getSubjects() {
    return this.subjects;
  }
  getSubjectById(id: string) {
    return this.subjects.find((s) => s.id === id);
  }
  createSubject(data: Omit<SubjectModel, "id">) {
    const newSubject: SubjectModel = {
      id: `sub_${Date.now()}`,
      ...data,
    };
    this.subjects.push(newSubject);
    return newSubject;
  }

  // Students
  getStudents(query?: { classId?: string; search?: string; status?: string }) {
    let result = [...this.students];
    if (query?.classId) {
      result = result.filter((s) => s.classId === query.classId);
    }
    if (query?.status) {
      result = result.filter((s) => s.status === query.status);
    }
    if (query?.search) {
      const q = query.search.toLowerCase();
      result = result.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.studentNumber.toLowerCase().includes(q)
      );
    }
    return result;
  }
  getStudentById(id: string) {
    return this.students.find((s) => s.id === id);
  }
  createStudent(data: Omit<StudentModel, "id">) {
    const targetClass = this.classes.find((c) => c.id === data.classId);
    const newStudent: StudentModel = {
      id: `stu_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      className: targetClass?.name || "Unassigned",
      ...data,
    };
    this.students.push(newStudent);
    if (targetClass) {
      targetClass.studentCount = (targetClass.studentCount || 0) + 1;
    }
    return newStudent;
  }
  updateStudent(id: string, data: Partial<StudentModel>) {
    const index = this.students.findIndex((s) => s.id === id);
    if (index === -1) return null;
    this.students[index] = { ...this.students[index], ...data };
    return this.students[index];
  }
  deleteStudent(id: string) {
    const index = this.students.findIndex((s) => s.id === id);
    if (index === -1) return false;
    this.students.splice(index, 1);
    return true;
  }

  // Symbols
  getSymbols() {
    return this.symbols;
  }
  updateSymbols(newSymbols: SymbolConfigModel[]) {
    this.symbols = newSymbols;
    return this.symbols;
  }

  // Attendance Sheets
  getSheets() {
    return this.sheets;
  }
  getSheetById(id: string) {
    return this.sheets.find((s) => s.id === id);
  }
  createSheet(data: Omit<AttendanceSheetModel, "id" | "uploadedAt" | "cells"> & { cells?: ScanCellModel[] }) {
    const newSheet: AttendanceSheetModel = {
      id: `scan_${Date.now()}`,
      uploadedAt: new Date().toISOString(),
      cells: data.cells || [],
      ...data,
    };
    this.sheets.unshift(newSheet);
    this.addAuditLog({
      action: "SCAN_UPLOAD",
      entityType: "AttendanceSheet",
      entityId: newSheet.id,
      details: JSON.stringify({ fileName: newSheet.originalFileName, size: newSheet.fileSize }),
    });
    return newSheet;
  }
  updateSheet(id: string, updates: Partial<AttendanceSheetModel>) {
    const sheet = this.sheets.find((s) => s.id === id);
    if (!sheet) return null;
    Object.assign(sheet, updates);
    return sheet;
  }
  updateSheetCells(id: string, cells: ScanCellModel[]) {
    const sheet = this.sheets.find((s) => s.id === id);
    if (!sheet) return null;
    sheet.cells = cells;
    sheet.detectedCellCount = cells.length;
    sheet.highConfidenceCount = cells.filter((c) => c.confidenceScore >= 0.75).length;
    sheet.lowConfidenceCount = cells.filter((c) => c.confidenceScore < 0.75 || c.interpretedStatus === "NEEDS_REVIEW").length;
    return sheet;
  }

  // Attendance Records
  getRecords(query?: { classId?: string; subjectId?: string; date?: string; status?: string; studentId?: string }) {
    let result = [...this.records];
    if (query?.classId) result = result.filter((r) => r.classId === query.classId);
    if (query?.subjectId) result = result.filter((r) => r.subjectId === query.subjectId);
    if (query?.date) result = result.filter((r) => r.attendanceDate === query.date);
    if (query?.status) result = result.filter((r) => r.status === query.status);
    if (query?.studentId) result = result.filter((r) => r.studentId === query.studentId);
    return result;
  }
  createRecord(data: Omit<AttendanceRecordModel, "id" | "createdAt" | "updatedAt">) {
    const newRecord: AttendanceRecordModel = {
      id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    };
    this.records.push(newRecord);
    return newRecord;
  }
  confirmSheetAttendance(sheetId: string, verifiedById: string, verifiedByName: string) {
    const sheet = this.getSheetById(sheetId);
    if (!sheet) return null;

    sheet.verificationStatus = "VERIFIED";
    const dateStr = sheet.sheetDate || new Date().toISOString().split("T")[0];
    const classItem = this.getClassById(sheet.classId || "cls_10a");
    const subjectItem = this.getSubjectById(sheet.subjectId || "sub_math101");

    sheet.cells.forEach((cell) => {
      if (!cell.studentId) return;
      const student = this.getStudentById(cell.studentId);
      if (!student) return;

      const mappedStatus: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" =
        cell.interpretedStatus === "PRESENT" || cell.interpretedStatus === "ABSENT" || cell.interpretedStatus === "LATE" || cell.interpretedStatus === "EXCUSED"
          ? cell.interpretedStatus
          : "PRESENT";

      // Prevent duplicate - update existing or push new
      const existingIdx = this.records.findIndex(
        (r) =>
          r.studentId === cell.studentId &&
          r.attendanceDate === (cell.dateString || dateStr) &&
          r.period === cell.period &&
          r.subjectId === (sheet.subjectId || "sub_math101")
      );

      const recordData: AttendanceRecordModel = {
        id: existingIdx >= 0 ? this.records[existingIdx].id : `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        schoolId: this.school.id,
        studentId: cell.studentId,
        studentName: student.fullName,
        studentNumber: student.studentNumber,
        classId: sheet.classId || "cls_10a",
        className: classItem?.name || "Grade 10 - Section A",
        subjectId: sheet.subjectId || "sub_math101",
        subjectName: subjectItem?.name || "Mathematics",
        attendanceDate: cell.dateString || dateStr,
        period: cell.period,
        status: mappedStatus,
        originalSymbol: cell.recognizedSymbol,
        sourceSheetId: sheet.id,
        sourceScanCellId: cell.id,
        isVerified: true,
        verifiedById,
        verifiedByName,
        verifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        this.records[existingIdx] = recordData;
      } else {
        this.records.push(recordData);
      }
    });

    this.addAuditLog({
      action: "ATTENDANCE_VERIFIED",
      entityType: "AttendanceSheet",
      entityId: sheetId,
      userId: verifiedById,
      userName: verifiedByName,
      details: JSON.stringify({ verifiedCount: sheet.cells.length, sheetId }),
    });

    return sheet;
  }

  // Audit Logs
  getAuditLogs() {
    return this.auditLogs;
  }
  addAuditLog(data: Omit<AuditLogModel, "id" | "createdAt" | "schoolId">) {
    const log: AuditLogModel = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      schoolId: this.school.id,
      createdAt: new Date().toISOString(),
      ...data,
    };
    this.auditLogs.unshift(log);
    return log;
  }
}

// Global store instance
const globalForStore = globalThis as unknown as { dbStore: DatabaseStore | undefined };
export const dbStore = globalForStore.dbStore ?? new DatabaseStore();
if (process.env.NODE_ENV !== "production") globalForStore.dbStore = dbStore;
