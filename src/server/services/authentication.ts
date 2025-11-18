import { auth } from "~/server/auth";
import { verifyToken, getTokenFromRequest } from "~/server/auth/jwt";

// Authentication
export async function isAuthenticated(request: Request) {

  // Verify NextAuth session first
  const session = await auth();
  if (session) return true;

  // If there is no session, verify JWT token
  const token = getTokenFromRequest(request);
  if (!token) return false;

  const payload = await verifyToken(token);
  return payload !== null;
}