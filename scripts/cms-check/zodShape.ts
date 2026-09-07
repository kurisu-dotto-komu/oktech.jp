import fs from "node:fs";
import ts from "typescript";

function findNode(node: ts.Node, match: (candidate: ts.Node) => boolean): ts.Node | undefined {
  if (match(node)) return node;
  return ts.forEachChild(node, (child) => findNode(child, match));
}

function isZodObjectCall(node: ts.Node): boolean {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === "z" &&
    node.expression.name.text === "object"
  );
}

/**
 * Reads the top-level keys of the `z.object({ ... })` returned by the named
 * function, straight from the source file - the content modules import
 * `astro:content`, so they cannot be evaluated outside an Astro build.
 */
export function readZodObjectKeys(filePath: string, functionName: string): string[] {
  const source = ts.createSourceFile(
    filePath,
    fs.readFileSync(filePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );

  const fn = findNode(
    source,
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === functionName,
  );
  if (!fn) throw new Error(`${filePath}: no function named ${functionName}()`);

  // Pre-order traversal reaches the outermost z.object() first.
  const call = findNode(fn, isZodObjectCall);
  if (!call || !ts.isCallExpression(call)) {
    throw new Error(`${filePath}: ${functionName}() does not return z.object()`);
  }

  const [shape] = call.arguments;
  if (!shape || !ts.isObjectLiteralExpression(shape)) {
    throw new Error(`${filePath}: ${functionName}() calls z.object() without a shape literal`);
  }

  return shape.properties.flatMap((property) => {
    const name = property.name;
    if (!name) return [];
    if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return [name.text];
    return [];
  });
}
