import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';

export function ApiSuccessResponse(
  description: string,
) {
  return applyDecorators(
    ApiOkResponse({
      description,
    }),
  );
}