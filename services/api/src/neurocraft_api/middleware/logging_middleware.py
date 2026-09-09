"""Request logging middleware with automatic secret sanitization."""

import time
from collections.abc import Callable
from typing import Any

from fastapi import Request, Response
from neurocraft_logging import get_logger
from starlette.middleware.base import BaseHTTPMiddleware

logger = get_logger("neurocraft.access")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Logs incoming HTTP requests and latency, redacting sensitive header values."""

    async def dispatch(self, request: Request, call_next: Callable[[Request], Any]) -> Response:
        # Avoid noisy access logs for internal static asset delivery
        path = request.url.path
        if path.startswith("/assets") or path.endswith((".ico", ".svg", ".png", ".jpg", ".js", ".css")):
            return await call_next(request)

        start_time = time.perf_counter()
        method = request.method
        client_ip = request.client.host if request.client else "unknown"

        try:
            response = await call_next(request)
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            status_code = response.status_code

            logger.info(
                f"{method} {path} completed with {status_code} in {duration_ms}ms",
                extra={
                    "method": method,
                    "path": path,
                    "status_code": status_code,
                    "duration_ms": duration_ms,
                    "client_ip": client_ip,
                },
            )
            return response
        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(
                f"{method} {path} failed with exception after {duration_ms}ms: {exc}",
                extra={
                    "method": method,
                    "path": path,
                    "duration_ms": duration_ms,
                    "client_ip": client_ip,
                },
            )
            raise
