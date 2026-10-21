import { pseudonym } from "./providers";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, hash: string) {
  const [salt, key] = hash.split(":");
  const candidate = scryptSync(password, salt, 64);
  return timingSafeEqual(candidate, Buffer.from(key, "hex"));
}
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const publicUser = (u: {
  id: string;
  name: string;
  alias: string;
  role: string;
  enabled: boolean;
  email: string;
}) => ({
  id: u.id,
  name: u.name,
  alias: u.alias,
  bidderAlias: pseudonym(u.id),
  role: u.role,
  enabled: u.enabled,
  email: u.email,
});
