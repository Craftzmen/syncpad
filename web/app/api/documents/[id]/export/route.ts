import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Open the page and choose Export." },
    { status: 410 },
  );
}
