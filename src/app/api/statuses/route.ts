import { createStatusSchema } from "~/server/api/schemas/status";
import { isAuthenticated } from "~/server/services/authentication";
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { z } from "zod";

// List All Statuses
export async function GET(request: Request) {
  try {
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const statuses = await db.status.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(statuses);
  } catch (error) {
    console.error("Error fetching statuses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Create a Status
export async function POST(request: Request) {
  try {
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 }
      );
    }
    let body: unknown;
    try {
      const rawBody = await request.text();
      if (!rawBody || rawBody.trim() === "") {
        return NextResponse.json({ error: "Request body is required" }, { status: 400 });
      }
      body = JSON.parse(rawBody) as unknown;
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }
    const validatedData = createStatusSchema.parse(body);
    const status = await db.status.create({ data: validatedData });
    return NextResponse.json(status, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
