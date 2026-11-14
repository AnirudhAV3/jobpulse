import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ error: "Provider sign-in is disabled" }, { status: 404 });
}
