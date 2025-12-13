import { updateUserSchema } from "~/server/api/schemas/user";
import { isAuthenticated } from "~/server/services/authentication";
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { z } from "zod";
import { hash } from "bcryptjs";
import { publishUserDeletedMqtt } from "~/server/mqtt";

// Get User By ID
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update User By ID
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
    const validatedData = updateUserSchema.parse(body);

    // Hash password if it is being updated
    let dataToUpdate = validatedData;
    if (validatedData.password) {
      const hashedPassword = await hash(validatedData.password, 10);
      dataToUpdate = {
        ...validatedData,
        password: hashedPassword,
      };
    }

    const user = await db.user.update({ where: { id }, data: dataToUpdate });
    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete User By ID
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    
    // Fetch user data before deleting (needed for MQTT notification)
    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Delete the user
    await db.user.delete({ where: { id } });
    
    // Send MQTT DELETE notification
    await publishUserDeletedMqtt({
      name: user.name,
      rfidTag: user.rfidTag,
      role: user.role,
    });
    
    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
