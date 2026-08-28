import { ArrayElement } from '@battis/typescript-tricks';
import { cacheLife } from 'next/cache';
import { APIRequestParameters, APIResponse, client } from '../Client';

export type Enrollment = ArrayElement<
  APIResponse<'list_academics_enrollments'>
>;

export async function list(
  params: APIRequestParameters<'list_academics_enrollments'>
) {
  // 'use cache'
  // cacheLife('hours')

  const enrollments: Enrollment[] = [];
  const { header, ...rest } = params;
  const page_size = 200;
  let page = 0;
  let done = false;
  do {
    page++;
    const { response, data, error } = await client.GET(
      '/academics/enrollments',
      {
        params: {
          header: {
            ...header,
            'X-Page-Number': page,
            'X-Page-Size': page_size
          },
          ...rest
        }
      }
    );
    if (error) {
      throw new Error('Could not retrieve class enrollments', { cause: error });
    }
    enrollments.push(...data.data);
    done = data.data.length < page_size;
  } while (!done);
  return enrollments;
}
