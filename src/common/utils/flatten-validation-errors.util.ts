import { ValidationError } from 'class-validator';

export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): Array<{
  field: string;
  reason: string[];
}> {
  const result: Array<{ field: string; reason: string[] }> = [];

  for (const error of errors) {
    const currentPath = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints) {
      result.push({
        field: error.property,
        reason: Object.values(error.constraints),
      });
    }

    if (error.children && error.children.length > 0) {
      result.push(...flattenValidationErrors(error.children, currentPath));
    }
  }

  return result;
}
