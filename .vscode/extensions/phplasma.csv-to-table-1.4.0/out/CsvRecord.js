"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Represents a record in a CSV/TSV/PSV file
 */
class CsvRecord {
    constructor() {
        this._columns = [];
    }
    /**
     * Add the provided column to the Record
     * @param column The column to add
     */
    addColumn(column) {
        this._columns.push(column);
    }
    /**
     * Return the list of available columns for this Record
     */
    getColumns() {
        return this._columns;
    }
}
exports.default = CsvRecord;
//# sourceMappingURL=CsvRecord.js.map