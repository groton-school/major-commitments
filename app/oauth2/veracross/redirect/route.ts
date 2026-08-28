import { Auth } from '#lib/Veracross';

export async function GET(request: Request) {
  await Auth.handleOAuth2Redirect(new URL(request.url));
  // TODO add a meaningful redirect
  return Response.json({ authorized: true });
}
