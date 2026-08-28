import { ArrayElement } from '@battis/typescript-tricks';
import { APIRequestParameters, APIResponse, client } from '../../Client';

export * as MeetingTimes from './MeetingTimes';

export type Class =
  | ArrayElement<APIResponse<'list_academics_classes'>>
  | APIResponse<'read_academics_classes'>;

export async function read(
  id: number,
  params: APIRequestParameters<'read_academics_classes'> = {}
) {
  const { data, error } = await client.GET('/academics/classes/{id}', {
    params: { path: { id }, ...params }
  });
  if (error) {
    throw new Error('Could not retrieve class', { cause: error });
  }
  return data.data;
}
