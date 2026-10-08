// extension.js
// bk1
// Markdownのリンク先からリンクテキストを自動で補完するVSCode拡張機能

const vscode = require("vscode");

function activate(context) {
    const disposable = vscode.workspace.onDidChangeTextDocument((event) => {
        if (
            event.reason === vscode.TextDocumentChangeReason.Undo ||
            event.reason === vscode.TextDocumentChangeReason.Redo
        ) {
            return;
        }
        
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            return;
        }

        if (editor.document !== event.document) {
            return;
        }

        if (event.document.languageId !== "markdown") {
            return;
        }

        for (const change of event.contentChanges) {
            checkLink(editor, change.range.start.line);
        }
    });

    context.subscriptions.push(disposable);
}

function checkLink(editor, lineNumber) {
    setTimeout(async () => {
        if (editor.document.languageId !== "markdown") {
            return;
        }

        if (lineNumber >= editor.document.lineCount) {
            return;
        }

        const line = editor.document.lineAt(lineNumber).text;

        // リンク文字列が空の場合だけ対象にする
        const match = line.match(/\[\]\((#[^)]+)\)/);

        if (!match) {
            return;
        }

        const slug = match[1];
        const slugStart = line.indexOf(slug);

        if (slugStart === -1) {
            return;
        }

        /*
         * VS Code標準のMarkdown Definition Providerに、
         * このリンクのリンク先を問い合わせる。
         *
         * slugを自分で解析したり、生成したりしない。
         */
        const position = new vscode.Position(
            lineNumber,
            slugStart + 1
        );

        const definitions = await vscode.commands.executeCommand(
            "vscode.executeDefinitionProvider",
            editor.document.uri,
            position
        );

        if (!definitions || definitions.length === 0) {
            return;
        }

        const definition = definitions[0];

        if (!definition.uri) {
            return;
        }

        if (definition.uri.toString() !== editor.document.uri.toString()) {
            return;
        }

        const headingLineNumber = definition.range.start.line;

        if (
            headingLineNumber < 0 ||
            headingLineNumber >= editor.document.lineCount
        ) {
            return;
        }

        const headingLine = editor.document.lineAt(
            headingLineNumber
        ).text;

        /*
         * Definition Providerが返した見出し行から、
         * Markdownの見出し本文だけを取得する。
         */
        const headingMatch = headingLine.match(
            /^\s{0,3}#{1,6}\s+(.+?)\s*$/
        );

        if (!headingMatch) {
            return;
        }

        const headingText = headingMatch[1];

        const linkStart = line.indexOf("[](");

        if (linkStart === -1) {
            return;
        }

        /*
         * [] の部分だけを置き換える。
         *
         * 例:
         * [](#取り除くtrim)
         *
         * ↓
         *
         * [取り除く（`trim`）](#取り除くtrim)
         */
        const start = new vscode.Position(
            lineNumber,
            linkStart
        );

        const end = new vscode.Position(
            lineNumber,
            linkStart + 2
        );

        await editor.edit((editBuilder) => {
            editBuilder.replace(
                new vscode.Range(start, end),
                `[${headingText}]`
            );
        });
    }, 100);
}

function deactivate() { }

module.exports = {
    activate,
    deactivate
};