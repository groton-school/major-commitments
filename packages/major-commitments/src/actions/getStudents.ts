'use server';

import { current_school_year } from '@/lib/current_school_year';
import { Veracross } from '@/lib/Veracross';
import { DateString } from '@battis/descriptive-types';

export type Student = {
  person_id: number;
  name: string;
  days: Record<
    DateString,
    Veracross.Data.Academics.StudentAssignments.StudentAssignment['assignment'][]
  >;
};

export async function getStudents(internal_class_id: number) {
  const enrollments = await Veracross.Data.Academics.Enrollments.list({
    query: {
      internal_class_id,
      school_year: current_school_year(),
      currently_enrolled: true
    }
  });

  const students: Record<number, Student> = {};
  enrollments.forEach(async ({ person_id, person_name }) => {
    students[person_id] = {
      person_id,
      name: person_name,
      days: {}
    };
  });

  return students;
}
