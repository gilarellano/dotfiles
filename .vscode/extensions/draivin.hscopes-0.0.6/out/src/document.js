"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentController = void 0;
const vscode = require("vscode");
const textUtil = require("./text-util");
class DocumentController {
    constructor(doc, textMateGrammar, document = doc) {
        this.document = document;
        this.subscriptions = [];
        // Stores the state for each line
        this.grammarState = [];
        this.grammar = textMateGrammar;
        // Parse whole document
        const docRange = new vscode.Range(0, 0, this.document.lineCount, 0);
        this.reparsePretties(docRange);
        this.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e) => {
            if (e.document == this.document)
                this.onChangeDocument(e);
        }));
    }
    dispose() {
        this.subscriptions.forEach((s) => s.dispose());
    }
    refreshTokensOnLine(line) {
        if (!this.grammar)
            return { tokens: [], invalidated: false };
        const prevState = this.grammarState[line.lineNumber - 1] || null;
        const lineTokens = this.grammar.tokenizeLine(line.text, prevState);
        const invalidated = !this.grammarState[line.lineNumber] ||
            !lineTokens.ruleStack.equals(this.grammarState[line.lineNumber]);
        this.grammarState[line.lineNumber] = lineTokens.ruleStack;
        return { tokens: lineTokens.tokens, invalidated: invalidated };
    }
    getScopeAt(position) {
        if (!this.grammar)
            return null;
        position = this.document.validatePosition(position);
        const state = this.grammarState[position.line - 1] || null;
        const line = this.document.lineAt(position.line);
        const tokens = this.grammar.tokenizeLine(line.text, state);
        for (let t of tokens.tokens) {
            if (t.startIndex <= position.character && position.character < t.endIndex)
                return {
                    range: new vscode.Range(position.line, t.startIndex, position.line, t.endIndex),
                    text: line.text.substring(t.startIndex, t.endIndex),
                    scopes: t.scopes,
                };
        }
        // FIXME: No token matched, return last token in the line.
        let lastToken = tokens.tokens[tokens.tokens.length - 1];
        return {
            range: new vscode.Range(position.line, lastToken.startIndex, position.line, lastToken.endIndex),
            text: line.text.substring(lastToken.startIndex, lastToken.endIndex),
            scopes: lastToken.scopes,
        };
    }
    reparsePretties(range) {
        range = this.document.validateRange(range);
        let invalidatedTokenState = false;
        // Collect new pretties
        const lineCount = this.document.lineCount;
        let lineIdx;
        for (lineIdx = range.start.line; lineIdx <= range.end.line || (invalidatedTokenState && lineIdx < lineCount); ++lineIdx) {
            const line = this.document.lineAt(lineIdx);
            const { invalidated: invalidated } = this.refreshTokensOnLine(line);
            invalidatedTokenState = invalidated;
        }
    }
    applyChanges(changes) {
        const sortedChanges = [...changes].sort((change1, change2) => change1.range.start.isAfter(change2.range.start) ? -1 : 1);
        for (const change of sortedChanges) {
            try {
                const delta = textUtil.toRangeDelta(change.range, change.text);
                const editRange = textUtil.rangeDeltaNewRange(delta);
                this.reparsePretties(editRange);
            }
            catch (e) {
                console.error(e);
            }
        }
    }
    onChangeDocument(event) {
        this.applyChanges(event.contentChanges);
    }
    refresh() {
        this.grammarState = [];
        const docRange = new vscode.Range(0, 0, this.document.lineCount, 0);
        this.reparsePretties(docRange);
    }
}
exports.DocumentController = DocumentController;
//# sourceMappingURL=document.js.map