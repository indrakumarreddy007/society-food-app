import { NextResponse } from "next/server";
import { updateIssueStatus } from "@/lib/store-service";

type Context = {
  params: Promise<{ issueId: string }>;
};

export async function PATCH(request: Request, context: Context) {
  const { issueId } = await context.params;
  const body = await request.json();
  try {
    const issue = await updateIssueStatus(issueId, body);
    return NextResponse.json(issue);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update issue.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

