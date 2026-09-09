"""Centralized error handling middleware for NeuroCraft API Gateway.

Guarantees:
- Predictable JSON error responses
- 100% contract compatibility with frontend api.ts (preserves 'detail' string or list)
- Database errors mapped to 409, 503, or 500 without exposing SQL stack traces
- Zero internal stack traces or secrets leaked to clients
- Full technical diagnostics logged server-side
"""

import http

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from neurocraft_logging import get_logger
from neurocraft_scanner import IngestionError
from neurocraft_security import SecurityValidationError
from sqlalchemy.exc import IntegrityError, OperationalError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = get_logger("neurocraft.errors")


def _status_name(status_code: int) -> str:
    try:
        return http.HTTPStatus(status_code).name
    except ValueError:
        return f"HTTP_{status_code}"


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle standard HTTP exceptions with structured error envelope."""
    msg = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    logger.warning(
        f"HTTP {exc.status_code} on {request.method} {request.url.path}: {msg}",
        extra={"status_code": exc.status_code, "path": request.url.path},
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "error": {
                "code": _status_name(exc.status_code),
                "message": msg,
                "status_code": exc.status_code,
            },
        },
        headers=getattr(exc, "headers", None),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle request schema validation errors (422 Unprocessable Entity)."""
    errors = exc.errors()
    logger.warning(
        f"Validation error on {request.method} {request.url.path}: {len(errors)} field violations",
        extra={"errors": errors, "path": request.url.path},
    )
    field_violations = [
        {
            "loc": [str(x) for x in err.get("loc", [])],
            "msg": err.get("msg", ""),
            "type": err.get("type", ""),
        }
        for err in errors
    ]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": errors,  # Keeps standard FastAPI detail format for frontend parsers
            "error": {
                "code": "UNPROCESSABLE_ENTITY",
                "message": "Request payload validation failed.",
                "status_code": 422,
                "fields": field_violations,
            },
        },
    )


async def security_validation_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle ingestion and security boundary validation failures (400 Bad Request)."""
    msg = str(exc)
    logger.warning(
        f"Security constraint violated on {request.method} {request.url.path}: {msg}",
        extra={"error": msg, "path": request.url.path},
    )
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "detail": msg,
            "error": {
                "code": "SECURITY_VALIDATION_ERROR",
                "message": msg,
                "status_code": 400,
            },
        },
    )


async def database_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """Handle SQLAlchemy errors cleanly without leaking database internals or SQL."""
    if isinstance(exc, IntegrityError):
        logger.error(
            f"Database integrity conflict on {request.method} {request.url.path}: {exc}",
            exc_info=True,
        )
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "detail": "Database conflict or constraint violation occurred.",
                "error": {
                    "code": "DATABASE_CONFLICT",
                    "message": "A resource with the specified identifier already exists or violates a data constraint.",
                    "status_code": 409,
                },
            },
        )
    if isinstance(exc, OperationalError):
        logger.error(
            f"Database operational / lock failure on {request.method} {request.url.path}: {exc}",
            exc_info=True,
        )
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "detail": "Database temporarily busy or unavailable. Please retry.",
                "error": {
                    "code": "DATABASE_UNAVAILABLE",
                    "message": "The database is temporarily locked or unavailable. Please retry your request.",
                    "status_code": 503,
                },
            },
        )

    logger.error(
        f"Unhandled database error on {request.method} {request.url.path}: {exc}",
        exc_info=True,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "A database persistence error occurred.",
            "error": {
                "code": "DATABASE_ERROR",
                "message": "A database persistence error occurred.",
                "status_code": 500,
            },
        },
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Global catch-all for unhandled exceptions. Strictly prevents stack trace exposure."""
    logger.critical(
        f"Unhandled server exception on {request.method} {request.url.path}: {exc}",
        exc_info=True,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected internal server error occurred.",
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected internal server error occurred.",
                "status_code": 500,
            },
        },
    )


def register_error_handlers(app: FastAPI) -> None:
    """Register all centralized error handlers on the FastAPI application."""
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(IngestionError, security_validation_handler)
    app.add_exception_handler(SecurityValidationError, security_validation_handler)
    app.add_exception_handler(SQLAlchemyError, database_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
