import type { JsonSchema } from "./jsonSchema";

/** Widgets registered in src/pages/admin.astro via CMS.registerWidget. */
export const CUSTOM_WIDGETS = ["pull_request"];

/**
 * The schema lets any unknown widget name through as a `CustomField`, so the
 * built-in names are read back out of that definition's `not.enum` list and
 * enforced separately, plus the custom widgets this project registers.
 */
export function getBuiltInWidgets(schema: JsonSchema): string[] {
  const widgets = schema.definitions?.CustomField?.properties?.widget?.not?.enum;
  if (!Array.isArray(widgets) || widgets.length === 0) {
    throw new Error("Could not read the built-in widget names from the Sveltia schema");
  }
  return [...widgets.map(String), ...CUSTOM_WIDGETS];
}

export function checkWidgets(config: unknown, builtIns: string[]): string[] {
  const errors: string[] = [];

  const walk = (value: unknown, path: string): void => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${path}[${index}]`));
      return;
    }
    if (value === null || typeof value !== "object") return;
    const entries = Object.entries(value as Record<string, unknown>);
    const widget = (value as Record<string, unknown>).widget;
    if (typeof widget === "string" && !builtIns.includes(widget)) {
      errors.push(`${path}: unknown widget "${widget}" (expected one of ${builtIns.join(", ")})`);
    }
    for (const [key, child] of entries) walk(child, `${path}.${key}`);
  };

  walk(config, "config");
  return errors;
}
