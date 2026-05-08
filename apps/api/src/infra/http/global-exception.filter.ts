import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Logger } from 'pino';
import { REQUEST_ID_HEADER } from './request-id.middleware';

interface RequestWithLogger extends Request {
  id: string;
  log: Logger;
}

interface HttpExceptionBody {
  error?: string;
  message?: string | string[];
}

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string | string[];
  requestId: string | null;
  method: string;
  path: string;
  timestamp: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<RequestWithLogger>();
    const res = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = this.getExceptionBody(exception, status);
    const requestId =
      req.id ??
      (res.getHeader(REQUEST_ID_HEADER) as string | undefined) ??
      null;

    const payload: ErrorResponseBody = {
      statusCode: status,
      error: body.error,
      message: body.message,
      requestId,
      method: req.method,
      path: req.originalUrl ?? req.url,
      timestamp: new Date().toISOString(),
    };

    if (status >= 500) {
      req.log?.error({ err: exception, requestId }, body.error);
    } else {
      req.log?.warn({ requestId, status }, body.error);
    }

    res.status(status).json(payload);
  }

  private getExceptionBody(
    exception: unknown,
    status: number,
  ): { error: string; message: string | string[] } {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return { error: exception.name, message: response };
      }

      const typed = response as HttpExceptionBody;
      return {
        error: typed.error ?? exception.name,
        message: typed.message ?? exception.message,
      };
    }

    return {
      error:
        status === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'Internal Server Error'
          : 'Error',
      message: 'An unexpected error occurred',
    };
  }
}
