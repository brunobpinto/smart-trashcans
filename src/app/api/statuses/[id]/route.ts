import { updateStatusSchema } from "~/server/api/schemas/status";
import { isAuthenticated } from "~/server/services/authentication";
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { z } from "zod";

// Get Status By ID
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const statusObj = await db.status.findUnique({ where: { id } });
    if (!statusObj) {
      return NextResponse.json({ error: "Status not found" }, { status: 404 });
    }
    return NextResponse.json(statusObj);
  } catch (error) {
    console.error("Error fetching status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update Status By ID
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 400 });
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
    const validatedData = updateStatusSchema.parse(body);
    const statusObj = await db.status.update({ where: { id }, data: validatedData });
    return NextResponse.json(statusObj);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Status not found" }, { status: 404 });
    }
    console.error("Error updating status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete Status By ID
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    await db.status.delete({ where: { id } });
    return NextResponse.json({ message: "Status deleted successfully" });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Status not found" }, { status: 404 });
    }
    console.error("Error deleting status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
