const _ = require("lodash");
const fields = require("./fields");

const kinds = _.uniq(
  _.map(_.values(fields), value => {
    return value.join("  ");
  })
);
kinds.push("c  const");

module.exports = kinds;
