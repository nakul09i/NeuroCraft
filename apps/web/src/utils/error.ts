/**
 * Error formatting and sanitization utility for NeuroCraft.
 * Strictly guarantees that raw objects, [object Object], NaN, or undefined
 * are never rendered to the end-user.
 */

export function formatApiError(err: unknown, fallbackMessage = "An unexpected error occurred. Please verify parameters and try again."): string {
  if (!err) return fallbackMessage;

  // 1. Direct string error
  if (typeof err === "string") {
    return err.trim() || fallbackMessage;
  }

  // 2. Error object with message
  if (err instanceof Error) {
    if (err.message && err.message !== "[object Object]") {
      // Clean up common network errors
      if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        return "Network connection failed. Please ensure the NeuroCraft API server is running on port 8000.";
      }
      return err.message;
    }
  }

  // 3. Object-based error payload (FastAPI, Axios, Fetch JSON)
  if (typeof err === "object" && err !== null) {
    const errorObj = err as Record<string, any>;

    // Check nested response payload (Axios / fetch wrappers)
    const data = errorObj.response?.data || errorObj.data || errorObj;

    // FastAPI HTTPException { detail: ... }
    if (data.detail !== undefined) {
      if (typeof data.detail === "string") {
        return data.detail;
      }
      // Pydantic validation errors array: [{ loc: [...], msg: "...", type: "..." }]
      if (Array.isArray(data.detail)) {
        return data.detail
          .map((item: any) => {
            if (typeof item === "string") return item;
            if (item && typeof item === "object") {
              const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : "field";
              return `${field}: ${item.msg || "invalid value"}`;
            }
            return String(item);
          })
          .join("; ");
      }
      if (typeof data.detail === "object" && data.detail !== null) {
        if (typeof data.detail.message === "string") return data.detail.message;
        try {
          return JSON.stringify(data.detail);
        } catch {
          return fallbackMessage;
        }
      }
    }

    // Standard { error: { message: "..." } } or { error: "..." }
    if (data.error !== undefined) {
      if (typeof data.error === "string") return data.error;
      if (typeof data.error?.message === "string") return data.error.message;
    }

    // Generic { message: "..." }
    if (typeof data.message === "string") return data.message;

    // Generic { title: "..." }
    if (typeof data.title === "string") return data.title;
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
