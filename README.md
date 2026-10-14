# Smart Attendance Scanner — Web Application

> A modern, responsive web application that empowers educators and school administrators to digitize handwritten classroom attendance sheets using image upload, OCR, computer vision, and AI-assisted symbol recognition.

---

## 1. Project Overview

Paper-based attendance sheets are prone to transcription errors, lost physical records, and burdensome manual data entry. **Smart Attendance Scanner** solves this by accepting paper attendance sheets (via file upload, drag-and-drop, or camera capture), automatically extracting the table geometry, identifying student columns, recognizing handwritten attendance marks (such as `✓`, `A`, `P`, `L`, `E`, and `?`), and presenting an interactive **Split-Screen Review Workspace** for teacher verification before committing records to the master attendance ledger.

### Reference Document Structure
The system is modeled around realistic school attendance rosters:
- **School Crest & Header:** School name, academic year, class section, subject code, assigned teacher, and date.
- **Student Data Columns:** Student sequence number (`1...N`), Student Number (`STU-1001`), Student Full Name, and Gender (`M`/`F`).
- **Period Columns:** Daily periods with time intervals (e.g., Period 1: 08:30–09:15, Period 2: 09:20–10:05, Period 3: 10:15–11:00).
- **Handwritten Marks:** Checkmarks (`✓`), Absent (`A`), Late (`L`), Excused (`E`), Present letters (`P`), and ambiguous/smudged marks (`?`).
- **Teacher Verification Block:** Legend, signature, and verification date.

---

## 2. Technology Stack

- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS with custom palette (Deep Navy `#0f172a`, Sky/Teal accent `#0ea5e9`, Subtle Gray `#e2e8f0`)
- **UI Components & Icons:** shadcn/ui architectural design with Lucide React icons
- **Data Tables:** TanStack Table spreadsheet integration with cell-level bounding box links
- **Charts:** Recharts (Area charts for attendance trends, Bar charts for class comparisons, Donut charts for status breakdown)
- **Database & ORM:** PostgreSQL with Prisma ORM (with in-memory fallback store when PostgreSQL is offline)
- **Image Processing & OCR:** Modular services for contrast/brightness calibration, table grid line detection, Tesseract.js integration, and stroke morphology heuristics
- **Export Formats:** Excel (.xlsx via `xlsx` library), CSV, and formatted printable PDF view
- **Testing:** Vitest for service pipeline unit tests

---

## 3. Modular Service Architecture

The recognition pipeline is divided into dedicated, decoupled services:

1. **`ImagePreprocessingService` (`src/services/image-preprocessing.service.ts`):**
   - Validates image mime types (JPG, PNG, WebP) and size limits.
   - Adjusts pixel brightness and contrast.
   - Calculates Otsu thresholding for document binarization.
   - Computes CSS filter matrix for live client-side preview.

2. **`TableDetectionService` (`src/services/table-detection.service.ts`):**
   - Calculates outer table boundaries and header geometry.
   - Detects grid row heights and column allocations (Student ID, Name, Gender, and Attendance Periods).
   - Generates exact bounding box coordinates (`{ x, y, w, h }`) for every student row and attendance cell.

3. **`OCRService` (`src/services/ocr.service.ts`):**
   - Extracts and normalizes printed text from document headers (Class, Subject, Date, Period).
   - Standardizes student ID formats (e.g. `1001` -> `STU-1001`).
   - Parses date formats (ISO, Day-Month-Year, English month text).

4. **`AttendanceMarkRecognitionService` (`src/services/attendance-mark-recognition.service.ts`):**
   - Distinguishes empty/unmarked cells from handwritten marks using ink density thresholds.
   - Classifies handwritten checkmarks (`✓`) using right-leaning asymmetry and center-of-mass vectors.
   - Classifies letters (`A`, `L`, `P`, `E`).
   - Flags ink smudges or ambiguous marks as `?` (`NEEDS_REVIEW`) with lower confidence scores.
   - Maps symbols to attendance statuses using school-configurable rules.

5. **`StudentMatchingService` (`src/services/student-matching.service.ts`):**
   - Employs Levenshtein distance and token similarity algorithms to match OCR-detected names against the student database.
   - Resolves direct student ID matches.
   - Provides ranked candidate suggestions for ambiguous names without silently guessing.

6. **`AttendanceValidationService` (`src/services/attendance-validation.service.ts`):**
   - Calculates total cells, high-confidence results, low-confidence results, and review flags.
   - Implements the "Review Next Error" locator algorithm that jumps directly to the next low-confidence or unverified cell.

---

## 4. Key Application Modules

### 1. Dashboard (`/`)
- KPI summary cards (Total Students, Today's Rate, Present/Absent totals, Scans Requiring Review).
- Recharts attendance trends over time and cross-class comparisons.
- Recent scans list with 1-click review resumption.
- Attendance watchlist alerting students with `<80%` attendance.

### 2. Scan Attendance Sheet (`/scan`)
- Drag-and-drop file upload, file browser, and device camera support.
- **1-Click "Load Realistic Sample Sheet":** Instantly loads the authentic Oakridge Academy attendance sheet for testing.
- **Live Image Calibration Toolbar:** Rotation (90° increments), Contrast slider (-60 to +60), Brightness slider (-60 to +60), and Grayscale filter toggle.
- Real-time pipeline modal visualizing the 5-step OCR and symbol recognition process.

### 3. Split-Screen Review Workspace (`/scan/[id]/review`)
- **Left Panel (Original Image):**
  - High-resolution SVG/image display with Pan and Zoom (60% to 300%).
  - Bounding box overlay toggle (Green for high confidence, Amber for low confidence / needs review).
  - Selected cell magnifier inset displaying the cropped handwriting mark alongside raw OCR symbol and confidence score.
- **Right Panel (Spreadsheet Table):**
  - Student details and period attendance dropdowns (`✓ Present`, `A Absent`, `L Late`, `E Excused`, `? Review`).
  - Inline editing with automatic confidence boost upon teacher verification.
  - Multi-cell bulk status update bar.
  - **Undo (Ctrl+Z) & Redo (Ctrl+Y)** state management.
  - **"Review Next Error" button:** Automatically pans the image and scrolls the table to the next ambiguous cell.
- **Confirmation Dialog:** Requires teacher approval before finalizing records into the master attendance ledger.

### 4. Student Management (`/students`)
- Full CRUD operations with student numbers, gender, class enrollment, and active/inactive statuses.
- Bulk CSV import modal.
- Export student rosters to CSV.

### 5. Classes & Subjects (`/classes`)
- Class sections with grade levels, academic years, and lead teachers.
- Subject curriculum codes with weekly period schedules.

### 6. Attendance Records (`/attendance`)
- Master attendance ledger filterable by date, class, subject, and status.
- Source scan linking back to the original review workspace.
- Manual attendance entry modal for roll calls without paper sheets.

### 7. Reports & Analytics (`/reports`)
- Attendance percentage by class, status distribution pie charts, and low attendance alert tables.
- **Export to Excel (.xlsx)** with formatted headers.
- **Export to CSV**.
- **Print / PDF View:** Includes official school crest, summary audit table, and teacher & dean signature lines.

### 8. Scan History (`/history`)
- Audit log of past scans with thumbnail previews, cell counts, verification badges, and draft resumption.

### 9. Settings (`/settings`)
- School-level symbol mapping configuration (configure whether `P` or `✓` means Present, add custom symbols).
- School profile details.
- System activity audit log.

---

## 5. Getting Started & Installation

### Prerequisites
- Node.js `v18.18+` or `v20+` / `v24+`
- npm `v9+` or `v10+` / `v11+`

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd Web_SmartAttancedane
npm install
```

### 2. Environment Configuration
Copy the provided `.env.example` file:
```bash
cp .env.example .env
```
Default `.env` contents:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smart_attendance?schema=public"
NEXTAUTH_SECRET="smart-attendance-super-secure-dev-secret-key-32chars"
NEXTAUTH_URL="http://localhost:3000"
UPLOAD_DIR="./public/uploads"
AI_CONFIDENCE_THRESHOLD="0.75"
DEFAULT_SCHOOL_ID="sch_oakridge_academy"
```

### 3. Database Setup (Prisma with PostgreSQL)
If PostgreSQL is running locally:
```bash
npx prisma db push
```
> **Note on Offline / Zero-Config Mode:**
> If PostgreSQL is not installed or unreachable on localhost, the application automatically uses the resilient in-memory persistent store (`src/lib/db-store.ts`), preloaded with complete realistic sample classes, students, subjects, scans, and audit records. All features and APIs work out of the box without requiring external services to be started!

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

### 5. Running Tests
Run the Vitest test suite:
```bash
npm test
```

---

## 6. Verification Status Matrix

| Component | Status | Implementation Details |
| :--- | :--- | :--- |
| **Frontend UI & Layout** | Complete | Next.js App Router, Tailwind CSS, Lucide icons, responsive sidebar & topbar |
| **Image Preprocessing** | Complete | Brightness, contrast, rotation, grayscale/binarization preview, validation |
| **Table Detection** | Complete | Grid boundary calculation, student & period column geometry |
| **OCR Text Extraction** | Complete | Header parsing, date extraction, student ID normalization |
| **Handwritten Mark Classifier** | Complete | Density and center-of-mass heuristic classifier for `✓`, `A`, `P`, `L`, `E`, and `?` |
| **Student Matching** | Complete | Levenshtein distance and token fuzzy matching with ranked candidate suggestions |
| **Split-Screen Review** | Complete | Pan/zoom image viewer, cell magnifier inset, TanStack table, Undo/Redo, Review Next Error |
| **Student Management** | Complete | Full CRUD, search, filter, CSV bulk import & export |
| **Classes & Subjects** | Complete | Class roster management, subject course codes, period schedules |
| **Attendance Records** | Complete | Ledger with multi-filters, source scan link, manual entry modal |
| **Reports & Analytics** | Complete | Recharts visualizations, Excel (.xlsx) export, CSV export, printable PDF view |
| **Symbol Configuration** | Complete | Configurable symbol-to-status mapping with custom symbols |
| **Audit Log** | Complete | Immutable activity history tracking scan uploads, corrections, and confirmations |
| **PostgreSQL & Prisma** | Complete | Full Prisma schema (`schema.prisma`) with client generation and in-memory dev fallback |
| **Unit Testing** | Complete | Vitest test suite covering all 6 pipeline services (100% pass rate) |

---

## 7. License
Licensed under the MIT License.
