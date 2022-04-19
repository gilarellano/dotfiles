"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CsvColumn_1 = require("./CsvColumn");
const CsvRecord_1 = require("./CsvRecord");
/**
 * Parser that takes a string input and parsers it into a list of CsvRecord's that contain CsvColumn's
 */
class CsvParser {
    /**
     * Initialie a CsvParser using the provided text
     * @param text The text to be parsed
     */
    constructor(text, separator) {
        this._text = this.ensureEndOfRecord(text);
        this._separator = separator;
        this._position = 0;
    }
    /**
     * Ensures the provided text ends with a new line
     * @param text The processed text
     */
    ensureEndOfRecord(text) {
        if (!this.isNewLine(text[text.length - 1])) {
            text += '\r\n';
        }
        return text;
    }
    /**
     * Determines if we have reached the end of the input data
     */
    isEof() {
        return this._position >= this._text.length;
    }
    /**
     * Parse the provided text and emit the parsed CsvRecords
     */
    getRecords() {
        let records = [];
        let currentRecord = new CsvRecord_1.default();
        records.push(currentRecord);
        // Scan for records
        while (!this.isEof()) {
            // Parse column
            const columnResult = this.readColumn();
            // Add to existing Record
            currentRecord.addColumn(columnResult.getColumn());
            // Start new record?
            if (columnResult.getDidTerminateRecord() && !this.isEof()) {
                currentRecord = new CsvRecord_1.default();
                records.push(currentRecord);
            }
        }
        return records;
    }
    /**
     * Peek at the current character in the input without advancing the position
     */
    peekChar() {
        return this._text.substr(this._position, 1);
    }
    /**
     * Advance our position to the first quote, if one looks to exist amongst leading spaces
     */
    advanceToQuoteIfLeadingSpaces() {
        for (var i = this._position; i < this._text.length; i++) {
            const char = this._text[i];
            // If this is a space, continue to next character
            if (char === ' ') {
                continue;
            }
            // If this is a quote, advance our position to this value
            if (char === '"') {
                this._position = i;
            }
            // Break out
            break;
        }
    }
    /**
     * Consumes the current character sequence until a column has been read
     * Assumes it is starting with a potential quote character
     */
    readColumn() {
        // If the column has leading spaces, followed by a quote, then we should jump to the quote character
        this.advanceToQuoteIfLeadingSpaces();
        // Consume the current character sequence until we have a completed column
        let startingPosition = this._position;
        let isInQuote = false;
        let didTerminateRecord = false;
        let value = '';
        // Read character sequence
        for (; this._position < this._text.length; this._position++) {
            const char = this._text[this._position];
            const nextChar = this._position + 1 < this._text.length ? this._text[this._position + 1] : null;
            const isSeparator = this.isSeparator(char);
            const isQuote = char === '"';
            const isNewLine = this.isNewLine(char);
            // Is this column value quoted?
            if (startingPosition === this._position && isQuote) {
                isInQuote = true;
                continue;
            }
            // Have we encountered a separator or new line, that terminates this column?
            if (!isInQuote && (isSeparator || isNewLine)) {
                if (isNewLine) {
                    didTerminateRecord = true;
                }
                break;
            }
            // Skip past an escaped quote?
            if (isInQuote && isQuote && nextChar === '"') {
                // Append single (un-escaped from double) quote
                // Then advanced past our escaped quote value
                value += char;
                this._position++;
                continue;
            }
            // Or, have we closed our quoted value?
            if (isInQuote && isQuote && nextChar !== '"') {
                break;
            }
            // Otherwise, continue reading column value
            value += char;
        }
        // Read past the upcoming separator characgter
        if (this.readPastSeparatorCharacter()) {
            didTerminateRecord = true;
        }
        // Return result
        const column = new CsvColumn_1.default(value);
        return new CsvColumnResult(column, didTerminateRecord);
    }
    /**
     * Determine if the provided character appears to be a newline character
     * @param char The character to check
     */
    isNewLine(char) {
        return char === '\r' || char === '\n';
    }
    /**
     * Determine if the provided character appears to be a separator character
     * @param char The character to check
     */
    isSeparator(char) {
        return char === this._separator;
    }
    /**
     * Advance the current position to the next non-separator character
     */
    readPastSeparatorCharacter() {
        let didTerminateRecord = false;
        let didEncounterNonSeparatorOrNewLine = false;
        let initialPosition = this._position;
        while (!this.isEof()) {
            const char = this.peekChar();
            const isNewLine = this.isNewLine(char);
            const isSeparator = this.isSeparator(char);
            const isSeparatorOrNewLine = isSeparator || isNewLine;
            // If our first character being read is the separator, advance and bail out now
            if (initialPosition === this._position && isSeparator) {
                this._position++;
                break;
            }
            // Consider separators (eg ,) and new lines (record separators) as control characters
            // Skip past these so that we leave the next parser read starting at a new column (that may start with a quote)
            if (isSeparatorOrNewLine) {
                if (isNewLine) {
                    didTerminateRecord = true;
                }
                // If we already encountered our separator before, return now as this could be a blank column value (eg: a,,b)
                if (didEncounterNonSeparatorOrNewLine && isSeparator) {
                    break;
                }
                didEncounterNonSeparatorOrNewLine = true;
                this._position++;
                continue;
            }
            // If this is a quote, and we have not yet seen our separator, continue
            if (char === '"' && !didEncounterNonSeparatorOrNewLine) {
                this._position++;
                continue;
            }
            // Must have encountered our separator or newline
            if (!didEncounterNonSeparatorOrNewLine) {
                this._position++;
                continue;
            }
            // Encountered non-separator
            break;
        }
        return didTerminateRecord;
    }
}
exports.default = CsvParser;
/**
 * Wrapper class around CsvColumn that also indicates whether the current Record has completed
 */
class CsvColumnResult {
    constructor(column, didTerminateRecord) {
        this._column = column;
        this._didTerminateRecord = didTerminateRecord;
    }
    /**
     * Return the CsvColumn value
     */
    getColumn() {
        return this._column;
    }
    /**
     * Return whether the column also terminated the current CsvRecord
     */
    getDidTerminateRecord() {
        return this._didTerminateRecord;
    }
}
//# sourceMappingURL=CsvParser.js.map