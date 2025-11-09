import { jwtVerify } from "jose";
import { env } from "~/env";

export async function verifyToken(token: string): Promise<{
  userId: string;
  email: string;
  name: string;
} | null> {
  try {
    const secret = new TextEncoder().encode(
      env.AUTH_SECRET ?? "fallback-secret-key-change-in-production"
    );

    const { payload } = await jwtVerify(token, secret);

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  
  return null;
}