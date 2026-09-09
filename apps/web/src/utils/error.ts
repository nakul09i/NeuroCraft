/**
 * Error formatting and sanitization utility for NeuroCraft.
 * Strictly guarantees that raw objects, [object Object], NaN, or undefined
 * are never rendered to the end-user.
 */

export function formatApiError(err: unknown, fallbackMessage = "An unexpected error occurred. Please verify parameters and try again."): string {
  if (!err) return fallbackMessage;

  const isInvalidString = (s: string) => {
    const t = s.trim();
    return !t || t === "[object Object]" || t.startsWith("[object ") || t === "{}" || t === "null" || t === "undefined";
  };

  // 1. Direct string error
  if (typeof err === "string") {
    if (isInvalidString(err)) return fallbackMessage;
    return err.trim();
  }

  // 2. Error object with message
  if (err instanceof Error) {
    if (err.message && !isInvalidString(err.message)) {
      // Clean up common network errors
      if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        return "Network connection failed. Please ensure the NeuroCraft API server is running.";
      }
      return err.message.trim();
    }
  }

  // 3. Object-based error payload (FastAPI, Axios, Fetch JSON)
  if (typeof err === "object" && err !== null) {
    const errorObj = err as Record<string, any>;

    // Check nested response payload (Axios / fetch wrappers)
    const data = errorObj.response?.data || errorObj.data || errorObj;

    // FastAPI HTTPException { detail: ... }
    if (data.detail !== undefined) {
      if (typeof data.detail === "string" && !isInvalidString(data.detail)) {
        return data.detail.trim();
      }
      // Pydantic validation errors array: [{ loc: [...], msg: "...", type: "..." }]
      if (Array.isArray(data.detail)) {
        const parts = data.detail
          .map((item: any) => {
            if (typeof item === "string" && !isInvalidString(item)) return item.trim();
            if (item && typeof item === "object" && item.msg) {
              const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : "field";
              return `${field}: ${item.msg}`;
            }
            return "";
          })
          .filter(Boolean);
        if (parts.length > 0) return parts.join("; ");
      }
      if (typeof data.detail === "object" && data.detail !== null) {
        if (typeof data.detail.message === "string" && !isInvalidString(data.detail.message)) {
          return data.detail.message.trim();
        }
      }
    }

    // Standard { error: { message: "..." } } or { error: "..." }
    if (data.error !== undefined) {
      if (typeof data.error === "string" && !isInvalidString(data.error)) return data.error.trim();
      if (typeof data.error?.message === "string" && !isInvalidString(data.error.message)) {
        return data.error.message.trim();
      }
    }

    // Generic { message: "..." }
    if (typeof data.message === "string" && !isInvalidString(data.message)) {
      return data.message.trim();
    }

    // Generic { title: "..." }
    if (typeof data.title === "string" && !isInvalidString(data.title)) {
      return data.title.trim();
    }
  }

  return fallbackMessage;
}

/**
 * Sanitizes numeric metrics to guarantee NaN, null, or undefined are never rendered.
 */
export function safeNumber(val: unknown, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  const num = typeof val === "number" ? val : parseFloat(String(val));
  return isNaN(num) ? fallback : num;
}

/**
 * Formats a metric value with a fallback string ("—") if null, undefined, or NaN.
 */
export function formatMetric(val: unknown, fallback = "—"): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "number") {
    if (isNaN(val)) return fallback;
    return val.toLocaleString();
  }
  const str = String(val).trim();
  if (!str || str === "NaN" || str === "undefined" || str === "null" || str === "[object Object]") {
    return fallback;
  }
  return str;
}

/**
 * Formats byte size safely.
 */
export function formatBytes(bytes: unknown): string {
  const num = safeNumber(bytes, 0);
  if (num <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(num) / Math.log(1024)), units.length - 1);
  const formatted = (num / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2);
  return `${formatted} ${units[i]}`;
}
