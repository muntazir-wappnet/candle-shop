import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiResponseDto } from '../dto/api-response.dto';

export function ApiSuccessResponse<TModel extends Type<any>>(
  description: string,
  model?: TModel,
) {
  if (!model) {
    return applyDecorators(
      ApiExtraModels(ApiResponseDto),
      ApiOkResponse({
        description,
        schema: {
          allOf: [{ $ref: getSchemaPath(ApiResponseDto) }],
        },
      }),
    );
  }

  return applyDecorators(
    ApiExtraModels(ApiResponseDto, model),
    ApiOkResponse({
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          {
            properties: {
              data: { $ref: getSchemaPath(model) },
            },
          },
        ],
      },
    }),
  );
}