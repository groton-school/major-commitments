import { Veracross } from '#lib/Veracross';

export async function GET(request: Request) {
  await Veracross.OAuth.handleOAuth2Redirect(new URL(request.url));
  // TODO add a meaningful redirect
  return Response.json({ authorized: true });
}
