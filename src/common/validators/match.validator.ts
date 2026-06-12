import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({
  name: 'Match',
  async: false,
})
export class MatchConstraint
  implements ValidatorConstraintInterface
{
  validate(
    value: string,
    args: ValidationArguments,
  ): boolean {
    const [relatedPropertyName] = args.constraints;

    const relatedValue =
      (args.object as Record<string, unknown>)[
        relatedPropertyName
      ];

    return value === relatedValue;
  }

  defaultMessage(
    args: ValidationArguments,
  ): string {
    const [relatedPropertyName] = args.constraints;

    return `${args.property} must match ${relatedPropertyName}`;
  }
}