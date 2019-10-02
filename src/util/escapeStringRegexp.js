const matchOperatorsRe = /[/^$]/g;

module.exports = function escapeStringRegexp(str) {
  return str.replace(matchOperatorsRe, "\\$&");
};
