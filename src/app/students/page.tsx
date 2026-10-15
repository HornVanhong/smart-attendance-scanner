"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Plus,
  Upload,
  Download,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  GraduationCap,
  Sparkles,
  Eye,
  Calendar,
  BookOpen,
  Clock,
  FileCheck,
} from "lucide-react";
import { StudentModel, ClassModel } from "@/lib/db-store";

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentModel[]>([]);
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editStudent, setEditStudent] = useState<StudentModel | null>(null);

  // View individual student state (មើលសិស្សម្នាក់ៗ)
  const [viewStudentId, setViewStudentId] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const handleOpenStudentView = (id: string) => {
    setViewStudentId(id);
    setLoadingDetails(true);
    fetch(`/api/students/${id}`)
      .then((res) => res.json())
      .then((d) => {
        setStudentDetails(d.student || null);
        setLoadingDetails(false);
      })
      .catch((e) => {
        console.error(e);
        setLoadingDetails(false);
      });
  };

  // Form state
  const [formData, setFormData] = useState({
    studentNumber: "",
    fullName: "",
    gender: "M" as "M" | "F" | "Other",
    classId: "",
    email: "",
    phone: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Bulk import state
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState<any>(null);

  const fetchStudents = () => {
    setLoading(true);
    fetch("/api/students")
      .then((res) => res.json())
      .then((d) => {
        setStudents(d.students || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStudents();
    fetch("/api/classes")
      .then((res) => res.json())
      .then((d) => {
        setClasses(d.classes || []);
        if (d.classes?.length > 0) {
          setFormData((prev) => ({ ...prev, classId: d.classes[0].id }));
        }
      })
      .catch(() => {});
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        search === "" ||
        s.fullName.toLowerCase().includes(search.toLowerCase()) ||
        s.studentNumber.toLowerCase().includes(search.toLowerCase());

      const matchClass = selectedClass === "ALL" || s.classId === selectedClass;
      const matchStatus = selectedStatus === "ALL" || s.status === selectedStatus;

      return matchSearch && matchClass && matchStatus;
    });
  }, [students, search, selectedClass, selectedStatus]);

  const handleCreateOrUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.studentNumber || !formData.fullName || !formData.classId) {
      setFormError("Student Number, Name, and Class are required.");
      return;
    }

    try {
      if (editStudent) {
        // Update
        const res = await fetch(`/api/students/${editStudent.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error("Failed to update student");
      } else {
        // Create
        const res = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Failed to create student");
      }

      setShowAddModal(false);
      setEditStudent(null);
      setFormData({
        studentNumber: "",
        fullName: "",
        gender: "M",
        classId: classes[0]?.id || "",
        email: "",
        phone: "",
        status: "ACTIVE",
      });
      fetchStudents();
    } catch (err: any) {
      setFormError(err.message || "An error occurred");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this student?")) return;
    try {
      await fetch(`/api/students/${id}`, { method: "DELETE" });
      fetchStudents();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Student ID", "Full Name", "Gender", "Class", "Status", "Email"];
    const rows = filteredStudents.map((s) => [
      s.studentNumber,
      `"${s.fullName}"`,
      s.gender,
      `"${s.className || ""}"`,
      s.status,
      s.email || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Oakridge_Students_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkImport = async () => {
    if (!importText.trim()) return;
    try {
      // Parse CSV rows
      const lines = importText.trim().split("\n");
      const studentsToImport = lines.map((line) => {
        const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
        return {
          studentNumber: parts[0],
          fullName: parts[1],
          gender: parts[2] || "M",
          email: parts[3] || undefined,
        };
      });

      const res = await fetch("/api/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          students: studentsToImport,
          classId: formData.classId || classes[0]?.id,
        }),
      });

      const data = await res.json();
      setImportResult(data);
      fetchStudents();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Student Directory &amp; Roster
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage student enrollments, identifiers, and OCR matching references.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <Upload className="w-3.5 h-3.5" /> Bulk Import
          </button>
          <button
            onClick={() => {
              setEditStudent(null);
              setFormData({
                studentNumber: "",
                fullName: "",
                gender: "M",
                classId: classes[0]?.id || "",
                email: "",
                phone: "",
                status: "ACTIVE",
              });
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/25 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Student
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or student ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* Class Filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-3">Gender</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-sky-700">
                    {s.studentNumber}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleOpenStudentView(s.id)}
                      className="font-bold text-slate-900 hover:text-sky-600 hover:underline text-left block"
                      title="មើលវត្តមានសិស្សម្នាក់ៗ"
                    >
                      {s.fullName}
                    </button>
                    <div className="text-[11px] text-slate-400">Enrolled: {s.enrollmentDate}</div>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-600">
                    {s.gender}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700">
                    {s.className || "Grade 10 - Section A"}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        s.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px]">
                    {s.email || "—"}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenStudentView(s.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold border border-sky-200/80 transition-all shadow-xs"
                        title="មើលវត្តមានសិស្សម្នាក់ៗ"
                      >
                        <Eye className="w-3.5 h-3.5 text-sky-600" /> មើលសិស្ស
                      </button>
                      <button
                        onClick={() => {
                          setEditStudent(s);
                          setFormData({
                            studentNumber: s.studentNumber,
                            fullName: s.fullName,
                            gender: s.gender,
                            classId: s.classId,
                            email: s.email || "",
                            phone: s.phone || "",
                            status: s.status as any,
                          });
                          setShowAddModal(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                        title="Edit Student"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Delete Student"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStudents.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-xs">
            No students found matching current filters.
          </div>
        )}
      </div>

      {/* Add / Edit Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateOrUpdateStudent}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {editStudent ? "Edit Student Details" : "Add New Student"}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Student ID / Number *
                </label>
                <input
                  type="text"
                  placeholder="e.g. STU-1020"
                  value={formData.studentNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, studentNumber: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Samantha Miller"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Class *
                  </label>
                  <select
                    value={formData.classId}
                    onChange={(e) =>
                      setFormData({ ...formData, classId: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-sky-500"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value as any })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="M">Male (M)</option>
                    <option value="F">Female (F)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="student@oakridge.edu"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/30"
              >
                {editStudent ? "Save Changes" : "Create Student"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                Bulk Import Students (CSV Format)
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Paste CSV rows in the format: <br />
              <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono text-slate-800">
                StudentID, Full Name, Gender, Email
              </code>
            </p>

            <textarea
              rows={6}
              placeholder={`STU-1021, William Bennett, M, w.bennett@oakridge.edu\nSTU-1022, Zoe Saldana, F, z.saldana@oakridge.edu`}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-sky-500"
            />

            {importResult && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1">
                <p className="font-bold">
                  ✓ Successfully imported {importResult.importedCount} student(s)!
                </p>
                {importResult.skippedCount > 0 && (
                  <p className="text-amber-700">
                    Skipped {importResult.skippedCount} duplicate(s) or invalid row(s).
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResult(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={handleBulkImport}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/30"
              >
                Process Import
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Individual Student Attendance Profile Modal (មើលសិស្សម្នាក់ៗ) */}
      {viewStudentId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 font-extrabold text-lg flex items-center justify-center shadow-inner">
                  {studentDetails?.gender === "F" ? "👩‍🎓" : "👨‍🎓"}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg leading-tight">
                    {studentDetails?.fullName || "កំពុងទាញយក..."}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    <span className="font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                      {studentDetails?.studentNumber}
                    </span>
                    <span>• {studentDetails?.className}</span>
                    <span>• ភេទ: {studentDetails?.gender === "F" ? "ស្រី (F)" : "ប្រុស (M)"}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewStudentId(null);
                  setStudentDetails(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            {loadingDetails ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold text-slate-500">កំពុងទាញយកព័ត៌មានវត្តមានសិស្ស...</p>
              </div>
            ) : studentDetails ? (
              <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                {/* Attendance Tally Metrics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-200 text-center">
                    <span className="text-[10px] font-bold uppercase text-emerald-700">វត្តមាន (✓)</span>
                    <div className="text-xl font-extrabold text-emerald-600 mt-0.5">
                      {studentDetails.stats?.presentCount || 0} ដង
                    </div>
                  </div>
                  <div className="bg-red-50/50 p-3 rounded-2xl border border-red-200 text-center">
                    <span className="text-[10px] font-bold uppercase text-red-700">ឈប់អត់ច្បាប់ (A)</span>
                    <div className="text-xl font-extrabold text-red-600 mt-0.5">
                      {studentDetails.stats?.absentCount || 0} ដង
                    </div>
                  </div>
                  <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-200 text-center">
                    <span className="text-[10px] font-bold uppercase text-blue-700">ឈប់មានច្បាប់ (P)</span>
                    <div className="text-xl font-extrabold text-blue-600 mt-0.5">
                      {studentDetails.stats?.excusedCount || 0} ដង
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center">
                    <span className="text-[10px] font-bold uppercase text-slate-600">អត្រាវត្តមាន</span>
                    <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                      {studentDetails.stats?.rate || 100}%
                    </div>
                    <span className="text-[9px] text-slate-400">សរុប {studentDetails.stats?.totalSessions || 0} ដង</span>
                  </div>
                </div>

                {/* Detailed Session History Table */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-sky-600" /> កាលវិភាគវត្តមានតាមមុខវិជ្ជា (Session Ledger)
                  </h4>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-3">កាលបរិច្ឆេទ &amp; ម៉ោង</th>
                          <th className="py-2 px-3">មុខវិជ្ជា</th>
                          <th className="py-2 px-3 text-center">និមិត្តសញ្ញា</th>
                          <th className="py-2 px-3">ស្ថានភាព</th>
                          <th className="py-2 px-3 text-right">ការផ្ទៀងផ្ទាត់</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(studentDetails.records || []).map((rec: any) => {
                          const getPill = () => {
                            switch (rec.status) {
                              case "PRESENT":
                                return "bg-emerald-50 text-emerald-700 border-emerald-300";
                              case "ABSENT":
                                return "bg-red-50 text-red-700 border-red-300 font-bold";
                              case "EXCUSED":
                                return "bg-blue-50 text-blue-700 border-blue-300 font-bold";
                              case "LATE":
                                return "bg-amber-50 text-amber-700 border-amber-300";
                              default:
                                return "bg-slate-100 text-slate-700 border-slate-300";
                            }
                          };

                          const getKhmerStatus = () => {
                            switch (rec.status) {
                              case "PRESENT": return "✓ វត្តមាន";
                              case "ABSENT": return "A ឈប់អត់ច្បាប់";
                              case "EXCUSED": return "P ឈប់មានច្បាប់";
                              case "LATE": return "L មកយឺត";
                              default: return rec.status;
                            }
                          };

                          return (
                            <tr key={rec.id} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-3 font-medium text-slate-900">
                                <div>{rec.date}</div>
                                <div className="text-[10px] text-slate-400">Period {rec.period}</div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-800">{rec.subjectName}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{rec.subjectCode}</div>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                                {rec.originalSymbol || "—"}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPill()}`}>
                                  {getKhmerStatus()}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right text-[11px] text-slate-500">
                                {rec.verifiedByName || "Prof. Chang"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {(!studentDetails.records || studentDetails.records.length === 0) && (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        មិនទាន់មានកំណត់ត្រាវត្តមានសម្រាប់សិស្សនេះនៅឡើយទេ។
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setViewStudentId(null);
                  setStudentDetails(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
              >
                បិទ (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
