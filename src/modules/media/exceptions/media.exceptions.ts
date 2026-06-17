import { HttpStatus } from '@nestjs/common';
import { AppException } from '../../../common/exceptions/app.exception';

export class MediaValidationException extends AppException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class MediaUploadException extends AppException {
  constructor(message = 'Failed to upload media asset') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}


export class MediaDeleteException extends AppException {
  constructor(message = 'Failed to delete media asset') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
