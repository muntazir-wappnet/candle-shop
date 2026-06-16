import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({
    description: 'Indicates whether the API request was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'A message describing the response status or details',
    example: 'Success',
  })
  message: string;

  data?: T;

  constructor(
    success: boolean,
    message: string,
    data?: T,
  ) {
    this.success = success;
    this.message = message;
    this.data = data;
  }
}