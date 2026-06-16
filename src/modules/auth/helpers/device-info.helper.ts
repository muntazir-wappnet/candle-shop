import { Request } from 'express';
import { UAParser } from 'ua-parser-js';

// ─── Device Info Interface ─────────────────────────────────────────────────────

export interface DeviceInfo {
  userAgent: string | null;
  ipAddress: string | null;
  deviceName: string | null;
  deviceType: 'MOBILE' | 'TABLET' | 'DESKTOP' | 'API' | 'UNKNOWN';
}

// ─── Extractor ────────────────────────────────────────────────────────────────

/**
 * Extracts device metadata from the incoming HTTP request.
 *
 * - `userAgent`  → raw UA string from headers
 * - `ipAddress`  → client IP (respects X-Forwarded-For for proxied environments)
 * - `deviceName` → human-friendly label, e.g. "Chrome on Windows"
 * - `deviceType` → MOBILE | TABLET | DESKTOP | API | UNKNOWN
 */
export function extractDeviceInfo(req: Request): DeviceInfo {
  const ua = req.headers['user-agent'] ?? null;

  // Resolve IP — X-Forwarded-For is set by load balancers / reverse proxies
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip =
    (typeof forwardedFor === 'string'
      ? forwardedFor.split(',')[0]?.trim()
      : Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : null) ??
    req.ip ??
    null;

  // No UA string → treat as a headless API client
  if (!ua) {
    return {
      userAgent: null,
      ipAddress: ip,
      deviceName: 'API Client',
      deviceType: 'API',
    };
  }

  const parser = new UAParser(ua);
  const result = parser.getResult();

  const browser = result.browser.name ?? '';
  const os = result.os.name ?? '';
  const deviceName = [browser, os].filter(Boolean).join(' on ') || 'Unknown Device';

  // ua-parser-js sets device.type to 'mobile' | 'tablet' | undefined (desktop)
  const rawType = result.device.type;
  const deviceType: DeviceInfo['deviceType'] =
    rawType === 'mobile'  ? 'MOBILE'  :
    rawType === 'tablet'  ? 'TABLET'  :
    rawType === undefined ? 'DESKTOP' :
    'UNKNOWN';

  return { userAgent: ua, ipAddress: ip, deviceName, deviceType };
}
