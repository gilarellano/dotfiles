"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const CsvParser_1 = require("./CsvParser");
const TableWriter_1 = require("./TableWriter");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    context.subscriptions.push(registerCsvToTableCommand(',', 'extension.csv-to-table.csv'));
    context.subscriptions.push(registerCsvToTableCommand('\t', 'extension.csv-to-table.tsv'));
    context.subscriptions.push(registerCsvToTableCommand('|', 'extension.csv-to-table.psv'));
    context.subscriptions.push(registerCsvToTableCommand(';', 'extension.csv-to-table.ssv'));
    context.subscriptions.push(registerCsvToTableCommand('' /* Custom */, 'extension.csv-to-table.custom'));
}
exports.activate = activate;
/**
 * Helper method to register different commands
 * @param separator Separator to register
 * @param commandName Name of the command we are registering
 */
function registerCsvToTableCommand(separator, commandName) {
    let disposable = vscode.commands.registerCommand(commandName, function () {
        return __awaiter(this, void 0, void 0, function* () {
            // Get the active text editor
            let editor = vscode.window.activeTextEditor;
            if (editor) {
                let document = editor.document;
                let selection = editor.selection;
                // Select full range if needed
                if (selection.isEmpty) {
                    selection = new vscode.Selection(document.positionAt(0), document.positionAt(document.getText().length));
                }
                // Get selected text
                let text = document.getText(selection);
                // Prompt for separator value if unset
                let separatorToUse = separator;
                if (separator === '') {
                    const promptResult = yield vscode.window.showInputBox({
                        placeHolder: 'Separator character (eg: ,)'
                    });
                    // Bail out of user has pressed cancel
                    if (promptResult === '' || promptResult === undefined) {
                        return;
                    }
                    // Otherwise update separator
                    separatorToUse = promptResult;
                }
                // Load settings
                const settings = vscode.workspace.getConfiguration('csv-to-table');
                // Create parser
                let parser = new CsvParser_1.default(text, separatorToUse);
                let records = parser.getRecords();
                let formatter = new TableWriter_1.default();
                let formattedResult = formatter.getFormattedTable(records, settings.upperCaseHeader, settings.markdownFormat, settings.rightAlignNumbers);
                // Write result
                // Determine if we are going to replace current content, or open a new window
                if (settings.openGeneratedTableInNewEditor) {
                    // Open new window
                    const newDoc = yield vscode.workspace.openTextDocument({
                        content: formattedResult
                    });
                    vscode.window.showTextDocument(newDoc, vscode.ViewColumn.Active);
                }
                else {
                    // Edit existing window
                    editor.edit(editBuilder => {
                        editBuilder.replace(selection, formattedResult);
                    });
                }
            }
        });
    });
    return disposable;
}
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map