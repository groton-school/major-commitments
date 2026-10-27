import { Assignment, getAssignments } from '@/src/actions/getAssignments';
import { Class, getClass } from '@/src/actions/getClass';
import { getClassMeetings } from '@/src/actions/getClassMeetings';
import { getStudents } from '@/src/actions/getStudents';
import { DateString } from '@battis/descriptive-types';
import { EventSourceInput } from '@fullcalendar/react';
import * as Colors from '@groton/colors';
import { Calendar } from '#components/Calendar';
import { Loading } from '#components/Loading';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { Badge, Button } from 'react-bootstrap';

type Props = PageProps<'/classes/[internal_class_id]/render'>;

export default function Page(props: Props) {
  return (
    <Suspense fallback={<Loading caption="Loading major commitments…" />}>
      <DynamicContent {...props} />
    </Suspense>
  );
}

async function DynamicContent({ params }: Props) {
  await connection();

  const internal_class_ids = (await params).internal_class_id
    .split(/-|_| /)
    .map((id) => parseInt(id));

  const events: EventSourceInput = [];

  for (const internal_class_id of internal_class_ids) {
    const [thisClass, meetings, students] = await Promise.all([
      getClass(internal_class_id),
      getClassMeetings(internal_class_id),
      getStudents(internal_class_id)
    ]);
    const assignments = await getAssignments(students);
    const otherClasses: Record<number, Class> = {};
    await Promise.all(
      [
        ...new Set([
          ...Object.values(assignments).map((a) => a.internal_class_id)
        ])
      ].map(async (internal_class_id) => {
        otherClasses[internal_class_id] = await getClass(internal_class_id);
      })
    );

    events.push(
      ...Object.values(assignments).map((assignment) => {
        let b = thisClass.block;
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
            class: otherClasses[assignment.internal_class_id]
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
          (existing: Assignment | undefined, student) => {
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
          contrastColor: Colors[`${thisClass.block}OnWhite`],
          className: `${thisClass.block} meeting`,
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
                target="_top"
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
  return time.replace(/^.*(T.*)Z/, `${date}$1`);
}
