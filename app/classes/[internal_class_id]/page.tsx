import { DateString } from '@battis/descriptive-types';
import { EventSourceInput } from '@fullcalendar/react';
import * as Colors from '@groton/colors';
import { Calendar } from '#components/Calendar';
import { Loading } from '#components/Loading';
import { Data } from '#lib/Veracross';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { Badge, Button } from 'react-bootstrap';

type PathParameters = { internal_class_id: string };
type Properties = { params: Promise<PathParameters> };
type Student = {
  person_id: number;
  name: string;
  days: Record<
    DateString,
    Data.Academics.StudentAssignments.StudentAssignment['assignment'][]
  >;
};

export default function Page(props: Properties) {
  return (
    <Suspense fallback={<Loading caption="Loading major commitments…" />}>
      <DynamicContent {...props} />
    </Suspense>
  );
}

async function DynamicContent({ params }: Properties) {
  await connection();

  const school_year =
    new Date().getMonth() < 6
      ? new Date().getFullYear() - 1
      : new Date().getFullYear();

  const internal_class_ids = (await params).internal_class_id
    .split(/-|_| /)
    .map((id) => parseInt(id));

  const events: EventSourceInput = [];

  for (const internal_class_id of internal_class_ids) {
    const [thisClass, meetings, enrollments] = await Promise.all([
      Data.Academics.Classes.read(internal_class_id),
      Data.Academics.Classes.MeetingTimes.list(internal_class_id),
      Data.Academics.Enrollments.list({
        query: { internal_class_id, school_year, currently_enrolled: true }
      })
    ]);

    const [, block] = (thisClass.description.match(/\(([A-Z]{2})/) || [
      ,
      'NoColor'
    ]) as ('RD' | 'OR' | 'YL' | 'GR' | 'LB' | 'DB' | 'PR' | 'NoColor')[];

    const students: Record<number, Student> = {};
    const assignments: Record<
      number,
      Data.Academics.StudentAssignments.StudentAssignment['assignment'] & {
        students: Student[];
      }
    > = {};

    await Promise.all(
      enrollments.map(async ({ person_id, person_name }) => {
        students[person_id] = {
          person_id,
          name: person_name,
          days: {}
        };
        for (const {
          assignment,
          student_id
        } of await Data.Academics.StudentAssignments.list({
          query: {
            student_id: person_id,
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

    const otherClasses: Record<number, Data.Academics.Classes.Class> = {};
    for (const id in assignments) {
      if (!(assignments[id].internal_class_id in otherClasses)) {
        otherClasses[assignments[id].internal_class_id] =
          await Data.Academics.Classes.read(assignments[id].internal_class_id);
      }
    }

    events.push(
      ...Object.values(assignments).map((assignment) => {
        let b = block;
        if (assignment.internal_class_id !== internal_class_id) {
          b = 'NoColor';
        }
        return {
          id: `assignment_${assignment.id}`,
          title: `${assignment.students.length} student${assignment.students.length > 1 ? 's' : ''}: ${assignment.description} (${otherClasses[assignment.internal_class_id].description})`,
          start: assignment.due_date,
          allDay: true,
          color: Colors[b],
          contrastColor: Colors[`TextOn${b}`],
          className: `${(otherClasses[assignment.internal_class_id].description.match(/\(([A-Z]{2})/) || [])[1]} ${b} assignment`,
          modal: {
            title: assignment.description,
            body: (
              <>
                <p>{otherClasses[assignment.internal_class_id].description}</p>
                <p>{assignment.students.length} students:</p>
                <ul>
                  {assignment.students
                    .map((student) => student.name)
                    .sort()
                    .map((name) => (
                      <li>{name}</li>
                    ))}
                </ul>
              </>
            )
          },
          assignment: {
            ...assignment,
            classs: otherClasses[assignment.internal_class_id]
          }
        };
      }),
      ...meetings.map((meeting) => {
        const start = fixDateTime(meeting.date, meeting.start_time);
        const end = fixDateTime(meeting.date, meeting.end_time);
        const affected_students = Object.values(students)
          .filter((student) => meeting.date in student.days)
          .map((student) => ({
            person_id: student.person_id,
            name: student.name,
            assignments: student.days[meeting.date]
          }));
        const existing_commitment = affected_students.reduce(
          (
            existing:
              | Data.Academics.StudentAssignments.StudentAssignment['assignment']
              | undefined,
            student
          ) => {
            return (
              existing ||
              student.assignments
                .filter(
                  (assignment) =>
                    assignment.internal_class_id === internal_class_id
                )
                .shift()
            );
          },
          undefined
        );

        return {
          id: `meeting_${meeting.id}`,
          title: `${existing_commitment ? '🗓' : affected_students.length === 0 ? '🟢' : affected_students.reduce((full, student) => full || student.assignments.length > 1, false) ? '🔴' : '🟡'} ${thisClass.description}`,
          color: 'white',
          contrastColor: Colors[`${block}OnWhite`],
          className: `${block} meeting`,
          start,
          end,
          modal: {
            title: thisClass.description,
            body: (
              <>
                <p>
                  {new Date(start).toLocaleString('en-us', {
                    dateStyle: 'full',
                    timeStyle: 'short'
                  })}
                </p>
                {!!existing_commitment ? (
                  <p>{existing_commitment.description} scheduled.</p>
                ) : affected_students.length > 0 ? (
                  <>
                    <p>
                      {affected_students.length}{' '}
                      {`student${affected_students.length > 1 ? 's' : ''}`} with
                      major commitments:
                    </p>
                    <ul>
                      {affected_students
                        .sort((a, b) => (a.name < b.name ? -1 : 1))
                        .map((student) => (
                          <li>
                            {student.name}{' '}
                            <Badge
                              bg={
                                student.assignments.length > 1
                                  ? 'danger'
                                  : student.assignments.length > 0
                                    ? 'warning'
                                    : 'success'
                              }
                            >
                              {student.assignments.length}
                            </Badge>
                          </li>
                        ))}
                    </ul>
                  </>
                ) : (
                  <p>No students have major commitments on this day</p>
                )}
              </>
            ),
            footer: !!existing_commitment ? undefined : (
              <Button
                variant="primary"
                href={`${thisClass.virtual_meeting_url}/assignments/new?due_at=${start}`}
              >
                Schedule
              </Button>
            )
          },
          meeting: { ...meeting, class: thisClass }
        };
      })
    );
  }
  return <Calendar events={events} />;
}

/**
 * @see {@link https://community.veracross.com/s/case/500Vu00001OivgzIAB/unexpected-get-academicsclassesinternalclassidmeetingstimes-gives-wrong-timezone|Case 01350020} for details on this hack
 */
function fixDateTime(
  date: DateString<'YYYY-MM-DD'>,
  time: DateString<'ISO8601'>
) {
  return time.replace(/^.*(T.*)Z?/, `${date}$1`);
}
