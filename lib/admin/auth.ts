import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "mh_admin_session";

function getSecretKey() {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not configured.");
  }

  return new TextEncoder().encode(secret);
}

export function verifyAdminPin(pin: string) {
  const expectedPin = process.env.ADMIN_PIN;
  if (!expectedPin) {
    throw new Error("ADMIN_PIN is not configured.");
  }
  const provided = Buffer.from(pin);
  const expected = Buffer.from(expectedPin);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export async function createAdminSession() {
  const token = await new SignJWT({
    admin: true,
  })
    .setProtectedHeader({
      alg: "HS256",
    })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecretKey());

  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return false;
  }

  try {
    const { payload } = await jwtVerify(
      token,
      getSecretKey()
    );

    return payload.admin === true;
  } catch {
    return false;
  }
}

export async function destroyAdminSession() {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}