import { ZodError } from 'zod';
import { BookingError } from '../services/bookingService.js';

/** Wrap an async route handler so rejections reach the error middleware. */
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

/** Validate `req[source]` against a Zod schema and replace it with the parsed value. */
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return next(
      new BookingError('Some of the details need another look.', 'validation_error', 422, {
        fields: result.error.issues.map((issue) => ({
          field: issue.path.join('.') || source,
          message: issue.message,
        })),
      })
    );
  }
  req[source] = result.data;
  return next();
};

/** 404 handler for unmatched routes. */
export function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'not_found',
      message: `No route matches ${req.method} ${req.originalUrl}`,
    },
  });
}

/** Central error serialiser. */
export function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;

  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      error: {
        code: 'validation_error',
        message: 'Some of the details need another look.',
        fields: err.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  if (status >= 500) {
    console.error('[error]', err);
  }

  const body = {
    success: false,
    error: {
      code: err.code || 'server_error',
      message:
        status >= 500 ? 'Something went wrong on our side. Please try again.' : err.message,
    },
  };
  if (err.details) body.error.details = err.details;
  return res.status(status).json(body);
}
