import { NextResponse } from "next/server";
import { createIssue } from "@/lib/store-service";

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const issue = await createIssue(body);
    return NextResponse.json(issue, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create issue.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

