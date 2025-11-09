import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { env } from "~/env";
import { db } from "~/server/db";
import { compare } from "bcryptjs";

export async function POST(request: Request) {
  try {
    // Check if the Content-Type is JSON
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

    // Try to parse the body
    let body: { email?: string; password?: string };
    try {
      const rawBody = await request.text();
      if (!rawBody || rawBody.trim() === "") {
        return NextResponse.json(
          { error: "Request body is required" },
          { status: 400 }
        );
      }
      body = JSON.parse(rawBody) as { email?: string; password?: string };
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Verify Credencials
    const user = await db.user.findUnique({
      where: { email: body.email },
    });

    if (!user?.email || !user.password) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isValid = await compare(body.password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create JWT Token for Postman
    const secret = new TextEncoder().encode(
      env.AUTH_SECRET ?? "fallback-secret-key-change-in-production"
    );

    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret);

    return NextResponse.json({ 
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    });
  } catch (error) {
    console.error("Error generating token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}