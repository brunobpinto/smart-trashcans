import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { z } from "zod";
import { createTrashcanSchema } from "~/server/api/schemas/trashcan";
import { verifyToken, getTokenFromRequest } from "~/server/auth/jwt";

// Authentication
async function isAuthenticated(request: Request) {
  // Verify NextAuth session first
  const session = await auth();
  if (session) {
    return true;
  }

  // If there is no session, verify JWT token
  const token = getTokenFromRequest(request);
  if (token) {
    const payload = await verifyToken(token);
    return payload !== null;
  }

  return false;
}

// List All Trashcans
export async function GET(request: Request) {
  try {
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trashcans = await db.trashcan.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(trashcans);
  } catch (error) {
    console.error("Error fetching trashcans:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Create a Trashcan
export async function POST(request: Request) {
  try {
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check if the Content-Type is JSON
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

    // Try to parse the body
    let body: unknown;
    try {
      const rawBody = await request.text();
      if (!rawBody || rawBody.trim() === "") {
        return NextResponse.json(
          { error: "Request body is required" },
          { status: 400 }
        );
      }
      body = JSON.parse(rawBody) as unknown;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const validatedData = createTrashcanSchema.parse(body);
    const trashcan = await db.trashcan.create({
      data: validatedData,
    });

    return NextResponse.json(trashcan, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    
    console.error("Error creating trashcan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}