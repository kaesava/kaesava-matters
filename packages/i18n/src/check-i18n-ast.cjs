const ts = require('typescript');

const TOAST_METHODS = new Set(['success', 'error', 'info', 'warning']);
const BANNED_DIALOGS = new Set(['window.alert', 'window.confirm', 'Alert.alert']);

function getScriptKind(filePath) {
  if (filePath.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (filePath.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (filePath.endsWith('.js') || filePath.endsWith('.mjs') || filePath.endsWith('.cjs')) {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

function isNonEmptyStringLiteral(node) {
  return (
    node &&
    (node.kind === ts.SyntaxKind.StringLiteral || node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) &&
    /[a-zA-Z]/.test(node.text.trim())
  );
}

/**
 * Scans a source file AST for hardcoded client-facing toast string literals
 * and banned native dialog calls (window.alert, window.confirm, Alert.alert).
 * Intentionally ignores server-side TRPCError messages.
 */
function scanHardcodedClientStrings(filePath, content) {
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, getScriptKind(filePath));
  const issues = [];

  function lineOf(node) {
    return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  }

  function visit(node) {
    if (node.kind === ts.SyntaxKind.CallExpression) {
      const exprText = node.expression.getText(sourceFile);
      const args = node.arguments || [];

      if (BANNED_DIALOGS.has(exprText)) {
        issues.push({ line: lineOf(node), text: `Banned native dialog: ${exprText}(...)` });
      } else if (args.length > 0) {
        const dotIdx = exprText.lastIndexOf('.');
        const methodName = dotIdx >= 0 ? exprText.slice(dotIdx + 1) : exprText;
        const isToastCall =
          (dotIdx >= 0 && exprText.slice(0, dotIdx).toLowerCase().endsWith('toast') && TOAST_METHODS.has(methodName)) ||
          methodName === 'showToast';

        if (isToastCall) {
          const firstArg = args[0];
          if (isNonEmptyStringLiteral(firstArg)) {
            issues.push({ line: lineOf(node), text: `${exprText}("${firstArg.text.trim().slice(0, 50)}")` });
          } else if (firstArg.kind === ts.SyntaxKind.ObjectLiteralExpression) {
            for (const prop of firstArg.properties) {
              if (
                prop.kind === ts.SyntaxKind.PropertyAssignment &&
                (prop.name.getText(sourceFile) === 'message' || prop.name.getText(sourceFile) === 'title') &&
                isNonEmptyStringLiteral(prop.initializer)
              ) {
                issues.push({
                  line: lineOf(prop),
                  text: `${exprText}({ ${prop.name.getText(sourceFile)}: "${prop.initializer.text.trim().slice(0, 50)}" })`,
                });
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return issues;
}

module.exports = { scanHardcodedClientStrings };
