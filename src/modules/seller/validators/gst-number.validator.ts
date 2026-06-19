import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/** Indian GST Number format: 15-character alphanumeric */
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

@ValidatorConstraint({ name: 'IsGstNumber', async: false })
export class IsGstNumberConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || value === undefined || value === '') return true; // optional field
    if (typeof value !== 'string') return false;
    return GST_REGEX.test(value.toUpperCase().trim());
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid 15-character Indian GST number (e.g. 22AAAAA0000A1Z5)`;
  }
}

export function IsGstNumber(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsGstNumberConstraint,
    });
  };
}
