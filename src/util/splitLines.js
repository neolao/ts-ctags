const endingsRe = /(?:\r\n|\r|\n)/;

module.exports = function splitLines(str) {
  return str.split(endingsRe);
};
