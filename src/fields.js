const ts = require("typescript");

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

module.exports = fields;
