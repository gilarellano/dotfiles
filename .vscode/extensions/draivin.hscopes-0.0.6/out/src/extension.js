"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = exports.workspaceState = exports.registry = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const tm = require("vscode-textmate");
const oniguruma = require("vscode-oniguruma");
const path = require("path");
const fs = require("fs");
const document_1 = require("./document");
const wasmBin = fs.readFileSync(path.join(__dirname, '../../node_modules/vscode-oniguruma/release/onig.wasm')).buffer;
const vscodeOnigurumaLib = oniguruma.loadWASM(wasmBin).then(() => {
    return {
        createOnigScanner(patterns) {
            return new oniguruma.OnigScanner(patterns);
        },
        createOnigString(s) {
            return new oniguruma.OnigString(s);
        },
    };
});
/** Tracks all documents that substitutions are being applied to */
let documents = new Map();
function getLanguageScopeName(languageId) {
    try {
        const languages = vscode.extensions.all
            .filter((x) => x.packageJSON && x.packageJSON.contributes && x.packageJSON.contributes.grammars)
            .reduce((a, b) => [
            ...a,
            ...b.packageJSON.contributes.grammars,
        ], []);
        const matchingLanguages = languages.filter((g) => g.language === languageId);
        if (matchingLanguages.length > 0) {
            // console.info(`Mapping language ${languageId} to initial scope ${matchingLanguages[0].scopeName}`);
            return matchingLanguages[0].scopeName;
        }
    }
    catch (err) { }
    return undefined;
}
/** initialize everything; main entry point */
function activate(context) {
    exports.workspaceState = context.workspaceState;
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(openDocument));
    context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(closeDocument));
    reloadGrammar();
    const api = {
        getScopeAt(document, position) {
            try {
                const prettyDoc = documents.get(document.uri);
                if (prettyDoc) {
                    return prettyDoc.getScopeAt(position);
                }
            }
            catch (err) { }
            return null;
        },
        getScopeForLanguage(language) {
            return getLanguageScopeName(language) || null;
        },
        async getGrammar(scopeName) {
            try {
                if (exports.registry)
                    return await exports.registry.loadGrammar(scopeName);
            }
            catch (err) { }
            return null;
        },
    };
    return api;
}
exports.activate = activate;
/** Re-read the settings and recreate substitutions for all documents */
function reloadGrammar() {
    try {
        exports.registry = new tm.Registry({
            onigLib: vscodeOnigurumaLib,
            getInjections: (scopeName) => {
                let extensions = vscode.extensions.all.filter((x) => x.packageJSON && x.packageJSON.contributes && x.packageJSON.contributes.grammars);
                let grammars = extensions.flatMap((e) => {
                    return e.packageJSON.contributes.grammars;
                });
                return grammars
                    .filter((g) => g.injectTo && g.injectTo.some((s) => s === scopeName))
                    .map((g) => g.scopeName);
            },
            loadGrammar: async (scopeName) => {
                try {
                    let extensions = vscode.extensions.all.filter((x) => x.packageJSON && x.packageJSON.contributes && x.packageJSON.contributes.grammars);
                    let grammars = extensions.flatMap((e) => {
                        return e.packageJSON.contributes.grammars.map((g) => {
                            return { extensionPath: e.extensionPath, ...g };
                        });
                    });
                    const matchingGrammars = grammars.filter((g) => g.scopeName === scopeName);
                    if (matchingGrammars.length > 0) {
                        const grammar = matchingGrammars[0];
                        const filePath = path.join(grammar.extensionPath, grammar.path);
                        let content = await fs.promises.readFile(filePath, 'utf-8');
                        return await tm.parseRawGrammar(content, filePath);
                    }
                }
                catch (err) {
                    console.error(`HyperScopes: Unable to load grammar for scope ${scopeName}.`, err);
                }
                return undefined;
            },
        });
    }
    catch (err) {
        exports.registry = undefined;
        console.error(err);
    }
    // Recreate the documents
    unloadDocuments();
    for (const doc of vscode.workspace.textDocuments)
        openDocument(doc);
}
async function openDocument(doc) {
    try {
        const prettyDoc = documents.get(doc.uri);
        if (prettyDoc) {
            prettyDoc.refresh();
        }
        else if (exports.registry) {
            const scopeName = getLanguageScopeName(doc.languageId);
            if (scopeName) {
                const grammar = await exports.registry.loadGrammar(scopeName);
                documents.set(doc.uri, new document_1.DocumentController(doc, grammar));
            }
        }
    }
    catch (err) { }
}
function closeDocument(doc) {
    const prettyDoc = documents.get(doc.uri);
    if (prettyDoc) {
        prettyDoc.dispose();
        documents.delete(doc.uri);
    }
}
function unloadDocuments() {
    for (const prettyDoc of documents.values()) {
        prettyDoc.dispose();
    }
    documents.clear();
}
/** clean-up; this extension is being unloaded */
function deactivate() {
    unloadDocuments();
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map