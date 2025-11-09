import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { z } from "zod";
import { updateTrashcanSchema } from "~/server/api/schemas/trashcan";
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

// List Trashcan By ID
export async function GET(request: Request,{ params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const trashcan = await db.trashcan.findUnique({
      where: { id },
    });

    if (!trashcan) {
      return NextResponse.json(
        { error: "Trashcan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(trashcan);
  } catch (error) {
    console.error("Error fetching trashcan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update Trashcan Information By ID
export async function PUT(request: Request,{ params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
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

    const validatedData = updateTrashcanSchema.parse(body);
    const trashcan = await db.trashcan.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json(trashcan);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json(
        { error: "Trashcan not found" },
        { status: 404 }
      );
    }

    console.error("Error updating trashcan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete Trashcan by ID
export async function DELETE(request: Request,{ params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await db.trashcan.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Trashcan deleted successfully" });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json(
        { error: "Trashcan not found" },
        { status: 404 }
      );
    }

    console.error("Error deleting trashcan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}