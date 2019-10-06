#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const docopt = require("docopt");
const glob = require("glob");
const _ = require("lodash");
const ts = require("typescript");
const pkg = require("./package.json");
const Tags = require("./src/Tags");
const makeTags = require("./src/makeTags");
const kinds = require("./src/kinds");

const USAGE = `${pkg.name} v${pkg.version}

Usage: ts-ctags [options] [FILE]...

Options:
  -h, --help          show this help message and exit
  -v, --version       show version and exit
  -f, --file [-]      write output to specified file. If file is "-", output is written to standard out
  -R, --recursive     recurse into directories in the file list [default: false]
  --fields <fields>   include selected extension fields
  --list-kinds        list supported languages
  --sort              sort tags [default: false]
  --target <version>  targeting language version [default: ES6]
  --tag-relative      file paths should be relative to the directory containing the tag file [default: false]
`;

function getFilenamesFromArgs(args) {
  const names = args.FILE;
  if (args["--recursive"]) {
    return _(names)
      .map(dir => {
        return glob.sync(path.join(dir, "**", "*.ts"));
      })
      .flatten()
      .value();
  }

  return names;
}

const args = docopt.docopt(USAGE, { version: pkg.version });

if (args["--version"]) {
  console.log(pkg.version);
  process.exit(0);
}

if (args["--list-kinds"]) {
  console.log(kinds.join("\n"));
  process.exit(0);
}

if (!args.FILE.length) {
  console.log(USAGE);
  process.exit(1);
}

const languageVersion = ts.ScriptTarget[args["--target"]];
if (languageVersion == null) {
  console.error(`Unsupported language version: ${args["--target"]}`);
  process.exit(1);
}

const tags = new Tags({ sort: args["--sort"] });
const filenames = getFilenamesFromArgs(args);
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
