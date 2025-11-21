import { createUserSchema } from "~/server/api/schemas/user";
import { isAuthenticated } from "~/server/services/authentication";
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { z } from "zod";
import { hash } from "bcryptjs";
import { publishUserCreatedMqtt } from "~/server/mqtt";

// List All Users
export async function GET(request: Request) {
  try {
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Create a User
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
    const validatedData = createUserSchema.parse(body);

    // Hash password before saving
    const hashedPassword = await hash(validatedData.password, 10);

    const user = await db.user.create({
      data: {
        ...validatedData,
        password: hashedPassword,
      },
    });

    // Fire-and-forget MQTT notification; errors are logged but do not block the response
    void publishUserCreatedMqtt({
      name: user.name,
      rfidTag: user.rfidTag ?? null,
      role: user.role,
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
