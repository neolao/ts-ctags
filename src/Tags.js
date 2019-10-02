const _ = require("lodash");

module.exports = class Tags {
  constructor(options) {
    const opt = options || {};
    this.sort = opt.sort || false;
    this.entries = [];
  }

  headers() {
    const sorted = this.sort ? "1" : "0";
    return [
      { header: "_TAG_FILE_FORMAT", value: "2", help: 'extended format; --format=1 will not append ;" to lines' },
      { header: "_TAG_FILE_SORTED", value: sorted, help: "0=unsorted, 1=sorted, 2=foldcase" },
      { header: "_TAG_PROGRAM_NAME", value: "ts-ctags" },
      { header: "_TAG_PROGRAM_URL", value: "https://github.com/neolao/ts-ctags" },
      { header: "_TAG_PROGRAM_VERSION", value: "0.1" }
    ];
  }

  toString() {
    return this.writeHeaders()
      .concat(this.writeEntries())
      .join("\n");
  }

  writeHeaders() {
    return this.headers().map(header => {
      return `!${header.header}\t${header.value}\t${header.help || ""}`;
    });
  }

  writeEntries() {
    let sorted = this.entries;
    if (this.sort) sorted = _.sortBy(this.entries, "name");
    return sorted.map(entry => {
      return `${entry.name}\t${entry.file}\t${entry.address};"\t${entry.field}\tline:${entry.line}`;
    });
  }
};
