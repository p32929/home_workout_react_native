export interface Unit {
  id: string;
  name: string;
}

export interface Exercise {
  id: string;
  name: string;
  units: Unit[];
  category?: string;
  createdAt: string;
}

export type SetEntry = Record<string, string>;

export interface ExerciseLog {
  exerciseId: string;
  sets: SetEntry[];
}

export interface WorkoutLog {
  date: string; // YYYY-MM-DD
  exercises: ExerciseLog[];
  createdAt: string;
  updatedAt: string;
}
