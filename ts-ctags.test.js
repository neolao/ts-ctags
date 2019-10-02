const { exec } = require("child_process");

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildRegexpTag(displayName, regex, type, line) {
  const exp = `^${escapeRegExp(displayName)}.*${escapeRegExp(regex)}\\s+${type}\\s+line\\:${line}$`;
  return new RegExp(exp, "m");
}

describe("ts-ctags", () => {
  describe("SimpleClass", () => {
    it("should detect the class", done => {
      exec("./ts-ctags.js -f- ./tests/SimpleClass.ts", (error, stdout) => {
        const regex = buildRegexpTag("SimpleClass", '/^export default class SimpleClass {$/;"', "C", 1);
        expect(regex.test(stdout)).toBe(true);
        done();
      });
    });
  });
});
