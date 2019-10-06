const ts = require("typescript");
const path = require("path");
const escapeStringRegexp = require("./util/escapeStringRegexp");
const splitLines = require("./util/splitLines");
const fields = require("./fields");

function isNodePublic(node) {
  for (const key in node.modifiers) {
    const modifier = node.modifiers[key];
    if (modifier.kind === ts.SyntaxKind.PublicKeyword) {
      return true;
    }
  }

  return false;
}

function isNodePrivate(node) {
  for (const key in node.modifiers) {
    const modifier = node.modifiers[key];
    if (modifier.kind === ts.SyntaxKind.PrivateKeyword) {
      return true;
    }
  }

  return false;
}

module.exports = function makeTags(tags, source, options) {
  // options = options || {}
  const scanner = ts.createScanner(options.languageVersion, true, source.text);
  const lines = splitLines(source.text);
  function extractLine(text, pos) {
    scanner.setTextPos(pos);
    scanner.scan();
    const tokenPos = scanner.getTokenPos();
    const { line } = ts.positionToLineAndCharacter(text, tokenPos);
    return {
      line,
      text: escapeStringRegexp(lines[line - 1])
    };
  }
  function makeTag(node, parent) {
    const entry = {};
    let newParent = parent;
    switch (node.kind) {
      case ts.SyntaxKind.Constructor:
        entry.name = "constructor";
        break;
      case ts.SyntaxKind.ModuleDeclaration:
      case ts.SyntaxKind.ClassDeclaration:
      case ts.SyntaxKind.InterfaceDeclaration:
        newParent = node;
        break;
      case ts.SyntaxKind.VariableDeclaration:
        if (node.type != null && node.type.kind === ts.SyntaxKind.TypeLiteral) newParent = node;
        if (node.flags & ts.NodeFlags.Const) entry.field = "c";
        break;
      default:
    }
    const field = fields[node.kind];
    if (field != null && (options.fields == null || options.fields.indexOf(field[0]) >= 0)) {
      entry.field = entry.field || field[0];
      entry.name = entry.name || node.name.text;
      // Prepend module name to all first-level declarations and
      // prepend class/interface name only to methods and
      // properties.
      if (
        parent != null &&
        (parent.kind === ts.SyntaxKind.ModuleDeclaration || node.kind !== ts.SyntaxKind.VariableDeclaration)
      ) {
        if (isNodePublic(node)) {
          entry.name = `+ ${parent.name.text}#${entry.name}`;
        } else if (isNodePrivate(node)) {
          entry.name = `- ${parent.name.text}#${entry.name}`;
        } else {
          entry.name = ` ${parent.name.text}#${entry.name}`;
        }
      }
      entry.file = options.tagRelative === true ? source.filename : path.resolve(source.filename);
      const firstLine = extractLine(source.text, node.pos, node.end);
      entry.address = `/^${firstLine.text}$/`;
      entry.line = firstLine.line;
      tags.entries.push(entry);
    }
    ts.forEachChild(node, child => {
      return makeTag(child, newParent);
    });
  }
  makeTag(source, undefined);
};
