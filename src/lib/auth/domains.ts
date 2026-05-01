/**
 * Domain/subdomain helpers. Single source of truth for host detection and URL building.
 * Safe to import in both middleware (Edge runtime) and server/client components.
 * No server-only imports — uses only process.env.
 */

const ROOT_DOMAIN  = process.env.NEXT_PUBLIC_ROOT_DOMAIN  ?? 'medicalsdi.uz';
const ADMIN_DOMAIN = process.env.NEXT_PUBLIC_ADMIN_DOMAIN ?? 'admin.medicalsdi.uz';
const DEV_PORT     = process.env.NEXT_PUBLIC_DEV_PORT     ?? '9003';

const IS_DEV = process.env.NODE_ENV !== 'production';

/** Dev hostnames */
const DEV_PUBLIC_HOST = `localhost:${DEV_PORT}`;
const DEV_ADMIN_HOST  = `admin.localhost:${DEV_PORT}`;

/**
 * Returns true when the request host is the admin subdomain.
 * Strips port before comparing so it works regardless of which port the dev
 * server is running on (9003, 3000, etc.).
 */
export function isAdminHost(host: string): boolean {
  const hostname = host.split(':')[0]; // 'admin.localhost:9003' → 'admin.localhost'
  if (IS_DEV) return hostname === 'admin.localhost';
  return hostname === ADMIN_DOMAIN || hostname.startsWith('admin.');
}

/**
 * Returns true when the request host is the public root domain.
 */
export function isPublicHost(host: string): boolean {
  const hostname = host.split(':')[0];
  if (IS_DEV) return hostname === 'localhost';
  return hostname === ROOT_DOMAIN;
}

/** Full base URL of the public portal (no trailing slash). */
export function getPublicBaseUrl(): string {
  if (IS_DEV) return `http://${DEV_PUBLIC_HOST}`;
  return `https://${ROOT_DOMAIN}`;
}

/** Full base URL of the admin subdomain (no trailing slash). */
export function getAdminBaseUrl(): string {
  if (IS_DEV) return `http://${DEV_ADMIN_HOST}`;
  return `https://${ADMIN_DOMAIN}`;
}

/**
 * Build a full URL on the admin subdomain.
 * @example adminUrl('/login') → 'https://admin.medicalsdi.uz/login'
 */
export function adminUrl(pathname: string = '/'): string {
  return `${getAdminBaseUrl()}${pathname}`;
}

/**
 * Build a full URL on the public portal.
 * @example publicUrl('/') → 'https://medicalsdi.uz/'
 */
export function publicUrl(pathname: string = '/'): string {
  return `${getPublicBaseUrl()}${pathname}`;
}
