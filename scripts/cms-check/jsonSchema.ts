/**
 * Minimal JSON Schema (draft-07) validator covering only the keywords used by
 * node_modules/@sveltia/cms/schema/sveltia-cms.json. Written by hand because ajv
 * is not a declared dependency of this project.
 */
export type JsonSchema = {
  $ref?: string;
  type?: string | string[];
  enum?: unknown[];
  const?: unknown;
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean | JsonSchema;
  required?: string[];
  items?: JsonSchema | JsonSchema[];
  anyOf?: JsonSchema[];
  not?: JsonSchema;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  definitions?: Record<string, JsonSchema>;
};

function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function matchesType(value: unknown, type: string): boolean {
  if (type === "integer") return typeof value === "number" && Number.isInteger(value);
  return typeOf(value) === type;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeOf(value) === "object";
}

export function createValidator(root: JsonSchema) {
  const definitions = root.definitions ?? {};

  const deref = (schema: JsonSchema): JsonSchema => {
    if (!schema.$ref) return schema;
    const target = definitions[schema.$ref.replace("#/definitions/", "")];
    if (!target) throw new Error(`Unresolvable $ref: ${schema.$ref}`);
    return deref(target);
  };

  const validateAnyOf = (data: unknown, branches: JsonSchema[], path: string): string[] => {
    const results = branches.map((branch) => validate(data, branch, path));
    if (results.some((errors) => errors.length === 0)) return [];
    // Report the closest match so the output points at the intended widget/variant.
    return results.reduce((best, errors) => (errors.length < best.length ? errors : best));
  };

  const validateArray = (data: unknown[], schema: JsonSchema, path: string): string[] => {
    const errors: string[] = [];
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      errors.push(`${path}: expected at least ${schema.minItems} items`);
    }
    if (schema.maxItems !== undefined && data.length > schema.maxItems) {
      errors.push(`${path}: expected at most ${schema.maxItems} items`);
    }
    const { items } = schema;
    if (!items) return errors;
    data.forEach((item, index) => {
      const itemSchema = Array.isArray(items) ? items[index] : items;
      if (itemSchema) errors.push(...validate(item, itemSchema, `${path}[${index}]`));
    });
    return errors;
  };

  const validateObject = (
    data: Record<string, unknown>,
    schema: JsonSchema,
    path: string,
  ): string[] => {
    const errors: string[] = [];
    for (const key of schema.required ?? []) {
      if (data[key] === undefined) errors.push(`${path}: missing required property "${key}"`);
    }
    for (const [key, value] of Object.entries(data)) {
      const propertySchema = schema.properties?.[key];
      if (propertySchema) {
        errors.push(...validate(value, propertySchema, `${path}.${key}`));
      } else if (schema.additionalProperties === false) {
        errors.push(`${path}: unknown property "${key}"`);
      } else if (isRecord(schema.additionalProperties)) {
        errors.push(...validate(value, schema.additionalProperties, `${path}.${key}`));
      }
    }
    return errors;
  };

  const validate = (data: unknown, schema: JsonSchema = root, path = "config"): string[] => {
    const resolved = deref(schema);
    const types = resolved.type === undefined ? [] : [resolved.type].flat();
    if (types.length > 0 && !types.some((type) => matchesType(data, type))) {
      return [`${path}: expected ${types.join(" | ")}, got ${typeOf(data)}`];
    }
    const errors: string[] = [];
    if (resolved.enum && !resolved.enum.includes(data)) {
      errors.push(
        `${path}: ${JSON.stringify(data)} is not one of ${JSON.stringify(resolved.enum)}`,
      );
    }
    if ("const" in resolved && resolved.const !== data) {
      errors.push(`${path}: expected ${JSON.stringify(resolved.const)}`);
    }
    if (resolved.not && validate(data, resolved.not, path).length === 0) {
      errors.push(`${path}: ${JSON.stringify(data)} is not allowed here`);
    }
    if (resolved.anyOf) errors.push(...validateAnyOf(data, resolved.anyOf, path));
    if (typeof data === "string" && data.length < (resolved.minLength ?? 0)) {
      errors.push(`${path}: expected at least ${resolved.minLength} characters`);
    }
    if (Array.isArray(data)) errors.push(...validateArray(data, resolved, path));
    if (isRecord(data)) errors.push(...validateObject(data, resolved, path));
    return errors;
  };

  return validate;
}
