'use server';

import { Veracross } from '../lib/Veracross';
import { Student } from './getStudents';

export type Assignment =
  Veracross.Data.Academics.StudentAssignments.StudentAssignment['assignment'];

export async function getAssignments(students: Record<number, Student>) {
  const assignments: Record<
    number,
    Veracross.Data.Academics.StudentAssignments.StudentAssignment['assignment'] & {
      students: Student[];
    }
  > = {};

  await Promise.all(
    Object.values(students).map(async ({ person_id: student_id }) => {
      for (const {
        assignment
      } of await Veracross.Data.Academics.StudentAssignments.list({
        query: {
          student_id,
          // FIXME don't hard code arbitrary ID numbers
          // @ts-expect-error 2322 OpenAPI spec too narrowly defined
          assignment_type: '103,105,4,6,8,106,107,11'
        }
      })) {
        if (assignment.due_date in students[student_id].days) {
          students[student_id].days[assignment.due_date].push(assignment);
        } else {
          students[student_id].days[assignment.due_date] = [assignment];
        }

        if (assignment.id in assignments) {
          assignments[assignment.id].students = [
            ...new Set([
              ...assignments[assignment.id].students,
              students[student_id]
            ])
          ].filter((student) => student);
        } else {
          assignments[assignment.id] = {
            ...assignment,
            students: [students[student_id]]
          };
        }
      }
    })
  );

  return assignments;
}
