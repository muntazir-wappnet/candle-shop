import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;

      // Handle standard NestJS exceptions (like BadRequestException from ValidationPipe)
      if (exceptionResponse && exceptionResponse.message) {
        message = exceptionResponse.message;
      } else {
        message = exception.message;
      }
    } else {
      this.logger.error(
        'Unhandled Exception',
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    // Ensure the message is always a single consistent string.
    // ValidationPipe often returns an array of messages, we'll join them.
    const finalMessage = Array.isArray(message) ? message.join(', ') : message;

    response.status(status).json({
      success: false,
      message: finalMessage,
    });
  }
}
