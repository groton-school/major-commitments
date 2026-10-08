import { Veracross } from '#lib/Veracross';
import { NextResponse } from 'next/server';

export async function GET() {
  // TODO pop out auth into new window
  return NextResponse.redirect(await Veracross.OAuth.authorizationURL());
}
