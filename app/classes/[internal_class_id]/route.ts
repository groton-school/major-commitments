import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  return NextResponse.redirect(
    `${process.env.PUBLIC_URL}${new URL(req.url).pathname}/render`,
    { status: 303 }
  );
}

export async function GET(req: Request) {
  return POST(req);
}
