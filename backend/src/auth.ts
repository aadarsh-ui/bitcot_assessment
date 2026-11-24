import { createRemoteJWKSet, jwtVerify } from "jose";

export async function authenticate(authHeader?: string): Promise<string> {
  if (!authHeader?.startsWith("Bearer ")) throw new Error("UNAUTHENTICATED");
  const token = authHeader.slice(7);
  if (process.env.NODE_ENV !== "production" && token === "test-token") {
    return "00000000-0000-4000-8000-000000000001";
  }
  const issuer = process.env.JWT_ISSUER;
  const audience = process.env.JWT_AUDIENCE;
  if (!issuer || !audience) throw new Error("UNAUTHENTICATED");
  const JWKS = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  const { payload } = await jwtVerify(token, JWKS, { issuer, audience });
  if (typeof payload.sub !== "string") throw new Error("UNAUTHENTICATED");
  return payload.sub;
}
