import { ArrayElement } from '@battis/typescript-tricks';
import { cacheLife } from 'next/cache';
import { APIRequestParameters, APIResponse, client } from '../../Client';

export type MeetingTime = ArrayElement<
  APIResponse<'list_academics_class_meeting_times'>
>;

export async function list(
  internal_class_id: number,
  params: APIRequestParameters<'list_academics_class_meeting_times'> = {}
) {
  // 'use cache';
  // cacheLife('hours');
  const meetings: MeetingTime[] = [];
  const page_size = 200;
  let page = 0;
  let done = false;
  const { header, ...rest } = params;
  do {
    page++;
    const { data, error } = await client.GET(
      '/academics/classes/{internal_class_id}/meeting_times',
      {
        params: {
          path: { internal_class_id },
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
      throw new Error('Could not retrieve class meeting times', {
        cause: error
      });
    }
    meetings.push(...data.data);
    done = data.data.length < page_size;
  } while (!done);
  return meetings;
}
