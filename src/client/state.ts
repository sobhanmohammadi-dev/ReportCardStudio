import { ClassInfo, Student, Subject } from "../shared/model";

export type Flow = "manual" | "excel";

export interface AppState {
  flow: Flow | null;
  info: ClassInfo;
  subjects: Subject[];
  students: Student[];
  excelFile: File | null;
  /** true once subjects/students were produced by a successful Excel import */
  excelParsed: boolean;
}

let counter = 0;
export const newSubjectId = (): string => `m${++counter}`;

export function newSubject(): Subject {
  return { id: newSubjectId(), name: "", kind: "numeric", min: 0, max: 20, step: 0.25 };
}

export const state: AppState = {
  flow: null,
  info: { school: "", grade: "", className: "" },
  subjects: [],
  students: [],
  excelFile: null,
  excelParsed: false,
};

/** Clears subjects, students and imported data (class details are kept). */
export function resetData(): void {
  state.subjects = [];
  state.students = [];
  state.excelFile = null;
  state.excelParsed = false;
}

export function resetAll(): void {
  resetData();
  state.flow = null;
  state.info = { school: "", grade: "", className: "" };
}

export const infoComplete = (): boolean =>
  !!(state.info.school.trim() && state.info.grade.trim() && state.info.className.trim());
