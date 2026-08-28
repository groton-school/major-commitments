import createClient from 'openapi-fetch';
import { getTokens } from '../Auth';
import { credentials } from '../Credentials';
import { operations, paths } from './spec';

export type APIRequestParameters<
  Operation extends keyof operations,
  Parameters extends ('parameters' extends keyof operations[Operation]
    ? 'parameters'
    : never) = 'parameters' extends keyof operations[Operation]
    ? 'parameters'
    : never
> = Parameters extends never
  ? never
  : Omit<operations[Operation][Parameters], 'path'>;

export type APIResponse<
  Operation extends keyof operations,
  Responses extends ('responses' extends keyof operations[Operation]
    ? 'responses'
    : never) = 'responses' extends keyof operations[Operation]
    ? 'responses'
    : never,
  Status extends (200 extends keyof operations[Operation][Responses]
    ? 200
    : never) = 200 extends keyof operations[Operation][Responses] ? 200 : never,
  Content extends
    ('content' extends keyof operations[Operation][Responses][Status]
      ? 'content'
      : never) =
    'content' extends keyof operations[Operation][Responses][Status]
      ? 'content'
      : never,
  Mimetype extends
    ('application/json' extends keyof operations[Operation][Responses][Status][Content]
      ? 'application/json'
      : never) =
    'application/json' extends keyof operations[Operation][Responses][Status][Content]
      ? 'application/json'
      : never,
  Property extends
    ('data' extends keyof operations[Operation][Responses][Status][Content][Mimetype]
      ? 'data'
      : never) =
    'data' extends keyof operations[Operation][Responses][Status][Content][Mimetype]
      ? 'data'
      : never
> = Responses extends never
  ? never
  : Status extends never
    ? never
    : Content extends never
      ? never
      : Mimetype extends never
        ? never
        : Property extends never
          ? never
          : operations[Operation][Responses][Status][Content][Mimetype][Property];

export const client = createClient<paths>({
  baseUrl: `https://api.veracross.com/${((await credentials()) || { school_route: '' }).school_route}/v3`
});
client.use({
  onRequest: async ({ request }) => {
    request.headers.set(
      'Authorization',
      `Bearer ${(await getTokens()).access_token}`
    );
    return request;
  }
});
