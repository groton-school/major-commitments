import { ArrayElement } from '@battis/typescript-tricks';
import { cacheLife } from 'next/cache';
import { StudentAssignments } from '.';
import { APIRequestParameters, APIResponse, client } from '../Client';

export type StudentAssignment = ArrayElement<
  APIResponse<'list_academics_student_assignments'>
>;

export async function list(
  params: APIRequestParameters<'list_academics_student_assignments'>
) {
  // 'use cache'
  // cacheLife('hours')

  const assignments: StudentAssignment[] = [];
  const { header, ...rest } = params;
  const page_size = 200;
  let page = 0;
  let done = false;
  do {
    page++;
    const { data, error } = await client.GET('/academics/student_assignments', {
      params: {
        header: { ...header, 'X-Page-Number': page, 'X-Page-Size': page_size },
        ...rest
      }
    });
    if (error) {
      throw new Error('Could not retrieve student assignments', {
        cause: error
      });
    }
    assignments.push(...data.data);
    done = data.data.length < page_size;
  } while (!done);
  return assignments;
}
