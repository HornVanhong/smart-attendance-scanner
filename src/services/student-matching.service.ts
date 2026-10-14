import { StudentModel } from "@/lib/db-store";

export interface StudentMatchCandidate {
  student: StudentModel;
  score: number; // 0.0 to 1.0
  matchReason: string;
}

export interface StudentMatchResult {
  matchedStudent: StudentModel | null;
  confidence: number;
  matchType: "EXACT_ID" | "EXACT_NAME" | "FUZZY_NAME" | "UNMATCHED";
  candidates: StudentMatchCandidate[];
}

export class StudentMatchingService {
  /**
   * Levenshtein Distance implementation
   */
  public static levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    const lenA = a.length;
    const lenB = b.length;

    for (let i = 0; i <= lenA; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= lenB; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= lenA; i++) {
      for (let j = 1; j <= lenB; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[lenA][lenB];
  }

  /**
   * Normalized similarity score (0.0 to 1.0)
   */
  public static calculateStringSimilarity(str1: string, str2: string): number {
    const s1 = str1.trim().toLowerCase();
    const s2 = str2.trim().toLowerCase();

    if (s1 === s2) return 1.0;
    if (!s1 || !s2) return 0.0;

    const maxLen = Math.max(s1.length, s2.length);
    const dist = this.levenshteinDistance(s1, s2);
    return Math.max(0, 1.0 - dist / maxLen);
  }

  /**
   * Clean name tokens
   */
  public static cleanName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Match an OCR extracted name and/or student number against class students
   */
  public static matchStudent(
    ocrName: string,
    ocrStudentNumber: string | undefined,
    availableStudents: StudentModel[],
    threshold: number = 0.70
  ): StudentMatchResult {
    const cleanOcr = this.cleanName(ocrName);
    const cleanOcrNum = ocrStudentNumber ? ocrStudentNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() : "";

    // 1. Direct match on Student Number
    if (cleanOcrNum) {
      const idMatch = availableStudents.find((s) => {
        const numClean = s.studentNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        return numClean === cleanOcrNum || numClean.endsWith(cleanOcrNum) || cleanOcrNum.endsWith(numClean);
      });

      if (idMatch) {
        return {
          matchedStudent: idMatch,
          confidence: 0.99,
          matchType: "EXACT_ID",
          candidates: [{ student: idMatch, score: 0.99, matchReason: `Matched ID: ${idMatch.studentNumber}` }],
        };
      }
    }

    // 2. Score every candidate by name similarity
    const candidates: StudentMatchCandidate[] = availableStudents.map((student) => {
      const cleanTarget = this.cleanName(student.fullName);

      // Exact match
      if (cleanTarget === cleanOcr) {
        return {
          student,
          score: 1.0,
          matchReason: "Exact name match",
        };
      }

      // Token overlap (e.g. "Alexander Wright" vs "Wright Alexander" or "Alex Wright")
      const tokensA = cleanOcr.split(" ");
      const tokensB = cleanTarget.split(" ");
      let tokenOverlap = 0;
      tokensA.forEach((ta) => {
        if (tokensB.some((tb) => tb === ta || tb.startsWith(ta) || ta.startsWith(tb))) {
          tokenOverlap++;
        }
      });
      const tokenScore = tokensA.length > 0 ? tokenOverlap / Math.max(tokensA.length, tokensB.length) : 0;

      // Levenshtein similarity
      const levScore = this.calculateStringSimilarity(cleanOcr, cleanTarget);

      // Combined weighted score
      const combinedScore = Math.max(levScore, tokenScore * 0.9 + levScore * 0.1);

      return {
        student,
        score: parseFloat(combinedScore.toFixed(3)),
        matchReason: `Similarity: ${(combinedScore * 100).toFixed(0)}%`,
      };
    });

    // Sort descending
    candidates.sort((a, b) => b.score - a.score);

    const top = candidates[0];
    if (top && top.score >= threshold) {
      return {
        matchedStudent: top.student,
        confidence: top.score,
        matchType: top.score >= 0.98 ? "EXACT_NAME" : "FUZZY_NAME",
        candidates: candidates.slice(0, 4),
      };
    }

    return {
      matchedStudent: null,
      confidence: top ? top.score : 0,
      matchType: "UNMATCHED",
      candidates: candidates.slice(0, 4),
    };
  }
}
