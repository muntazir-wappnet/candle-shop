import {
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { MatchConstraint } from '../validators/match.validator';


export function Match(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return (
    object: object,
    propertyName: string,
  ) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [property],
      validator: MatchConstraint,
    });
  };
}