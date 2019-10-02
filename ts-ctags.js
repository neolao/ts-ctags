#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const docopt = require("docopt");
const glob = require("glob");
const _ = require("lodash");
const ts = require("typescript");
const pkg = require("./package.json");
const escapeStringRegexp = require("./src/util/escapeStringRegexp");
const splitLines = require("./src/util/splitLines");
const Tags = require("./src/Tags");

const USAGE = `${pkg.name} v${pkg.version}
\n\nUsage: tstags [options] [FILE]...\n\nOptions:\n  -h, --help          show this help message and exit\n  -v, --version       show version and exit\n  -f, --file [-]      write output to specified file. If file is "-", output is written to standard out\n  -R, --recursive     recurse into directories in the file list [default: false]\n  --fields <fields>   include selected extension fields\n  --list-kinds        list supported languages\n  --sort              sort tags [default: false]\n  --target <version>  targeting language version [default: ES6]\n  --tag-relative      file paths should be relative to the directory containing the tag file [default: false]\n`;
const fields = {};
fields[ts.SyntaxKind.Property] = ["p", "property"];
fields[ts.SyntaxKind.Method] = ["m", "method"];
fields[ts.SyntaxKind.Constructor] = ["m", "method"];
fields[ts.SyntaxKind.GetAccessor] = ["m", "method"];
fields[ts.SyntaxKind.SetAccessor] = ["m", "method"];
fields[ts.SyntaxKind.VariableDeclaration] = ["v", "variable"];
fields[ts.SyntaxKind.FunctionDeclaration] = ["f", "function"];
fields[ts.SyntaxKind.ClassDeclaration] = ["C", "class"];
fields[ts.SyntaxKind.InterfaceDeclaration] = ["i", "interface"];
fields[ts.SyntaxKind.TypeAliasDeclaration] = ["t", "typealias"];
fields[ts.SyntaxKind.EnumDeclaration] = ["e", "enum"];
fields[ts.SyntaxKind.ModuleDeclaration] = ["M", "module"];
fields[ts.SyntaxKind.ImportDeclaration] = ["I", "import"];
const kinds = _.uniq(
  _.map(_.values(fields), value => {
    return value.join("  ");
  })
);
kinds.push("c  const");
const scriptTargets = ts.ScriptTarget;

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

function makeTags(tags, source, options) {
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
}

function main() {
  const args = docopt.docopt(USAGE, { version: pkg.version });
  if (args["--version"]) {
    console.log(pkg.version);
    process.exit(0);
  }
  if (args["--list-kinds"]) {
    console.log(kinds.join("\n"));
    process.exit(0);
  }
  // List of files must be given.
  if (!args.FILE.length) {
    console.log(USAGE);
    process.exit(1);
  }
  const names = args.FILE;
  let filenames;
  if (args["--recursive"]) {
    // Get all *.ts files recursively in given directories.
    filenames = _(names)
      .map(dir => {
        return glob.sync(path.join(dir, "**", "*.ts"));
      })
      .flatten()
      .value();
  } else {
    filenames = names;
  }
  const languageVersion = scriptTargets[args["--target"]];
  if (languageVersion == null) {
    console.error(`Unsupported language version: ${args["--target"]}`);
    process.exit(1);
  }
  const tags = new Tags({ sort: args["--sort"] });
  filenames.forEach(filename => {
    const text = fs.readFileSync(filename);
    const source = ts.createSourceFile(filename, text.toString(), languageVersion, "0");
    makeTags(tags, source, {
      languageVersion,
      fields: args["--fields"],
      tagRelative: args["--tag-relative"]
    });
  });
  if (!tags.entries.length) process.exit(0);
  if (args["--file"] === "-") {
    console.log(tags.toString());
  } else {
    const filename = args["--file"] || "tags";
    fs.writeFileSync(filename, tags.toString());
  }
}

if (require.main === module) main();
