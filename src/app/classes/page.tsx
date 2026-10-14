"use client";

import React, { useState, useEffect } from "react";
import {
  School,
  BookOpen,
  Plus,
  Users,
  Clock,
  Calendar,
  Layers,
  GraduationCap,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { ClassModel, SubjectModel } from "@/lib/db-store";

export default function ClassesAndSubjectsPage() {
  const [tab, setTab] = useState<"CLASSES" | "SUBJECTS">("CLASSES");
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [subjects, setSubjects] = useState<SubjectModel[]>([]);
  const [loading, setLoading] = useState(true);

  // Class modal state
  const [showClassModal, setShowClassModal] = useState(false);
  const [classForm, setClassForm] = useState({
    name: "",
    gradeLevel: "Grade 10",
    academicYear: "2024-2025",
  });

  // Subject modal state
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectForm, setSubjectForm] = useState({
    name: "",
    code: "",
    periodsCount: 4,
  });

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/classes").then((r) => r.json()),
      fetch("/api/subjects").then((r) => r.json()),
    ])
      .then(([cData, sData]) => {
        setClasses(cData.classes || []);
        setSubjects(sData.subjects || []);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classForm.name) return;
    try {
      await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(classForm),
      });
      setShowClassModal(false);
      setClassForm({ name: "", gradeLevel: "Grade 10", academicYear: "2024-2025" });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectForm.name || !subjectForm.code) return;
    try {
      await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subjectForm),
      });
      setShowSubjectModal(false);
      setSubjectForm({ name: "", code: "", periodsCount: 4 });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Classes &amp; Subject Curriculum
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage grade levels, academic sections, subject course codes, and period schedules.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-200/80 rounded-xl">
            <button
              onClick={() => setTab("CLASSES")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === "CLASSES" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <School className="w-3.5 h-3.5" /> Classes ({classes.length})
            </button>
            <button
              onClick={() => setTab("SUBJECTS")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === "SUBJECTS" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Subjects ({subjects.length})
            </button>
          </div>

          <button
            onClick={() => {
              if (tab === "CLASSES") setShowClassModal(true);
              else setShowSubjectModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/25 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {tab === "CLASSES" ? "Add Class" : "Add Subject"}
          </button>
        </div>
      </div>

      {/* Content depending on tab */}
      {tab === "CLASSES" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4 hover:border-sky-300 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">
                    {cls.gradeLevel}
                  </span>
                  <h3 className="font-extrabold text-base text-slate-900 group-hover:text-sky-700 transition-colors">
                    {cls.name}
                  </h3>
                </div>
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <School className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-500 border-y border-slate-100 py-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" /> Enrolled Students
                  </span>
                  <span className="font-bold text-slate-800">{cls.studentCount || 15} Students</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Academic Term
                  </span>
                  <span className="font-semibold text-slate-700">{cls.academicYear}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" /> Lead Faculty
                  </span>
                  <span className="font-semibold text-slate-700">Prof. Michael Chang</span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-xs">
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 94% Avg Attendance
                </span>
                <span className="text-slate-400 text-[11px]">3 Daily Periods</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* SUBJECTS TAB */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {subjects.map((sub) => (
            <div
              key={sub.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4 hover:border-teal-300 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {sub.code}
                  </span>
                  <h3 className="font-extrabold text-base text-slate-900 mt-1.5 group-hover:text-teal-700 transition-colors">
                    {sub.name}
                  </h3>
                </div>
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-500 border-y border-slate-100 py-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> Periods Per Week
                  </span>
                  <span className="font-bold text-slate-800">{sub.periodsCount} Sessions</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" /> Assigned Grades
                  </span>
                  <span className="font-semibold text-slate-700">Grade 10 &amp; 11</span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500">Standard Timetable</span>
                <span className="text-[11px] font-bold text-sky-600">Active</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Class Modal */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateClass}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Add Academic Class</h3>
              <button
                type="button"
                onClick={() => setShowClassModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Class Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Grade 10 - Section C"
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Grade Level</label>
                <input
                  type="text"
                  placeholder="e.g. Grade 10"
                  value={classForm.gradeLevel}
                  onChange={(e) => setClassForm({ ...classForm, gradeLevel: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Academic Year</label>
                <input
                  type="text"
                  value={classForm.academicYear}
                  onChange={(e) => setClassForm({ ...classForm, academicYear: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowClassModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/30"
              >
                Create Class
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Subject Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSubject}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Add Academic Subject</h3>
              <button
                type="button"
                onClick={() => setShowSubjectModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject Name *</label>
                <input
                  type="text"
                  placeholder="e.g. World History"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Course Code *</label>
                <input
                  type="text"
                  placeholder="e.g. HIST-101"
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Weekly Period Count</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={subjectForm.periodsCount}
                  onChange={(e) => setSubjectForm({ ...subjectForm, periodsCount: parseInt(e.target.value, 10) || 4 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSubjectModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/30"
              >
                Create Subject
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
