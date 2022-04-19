"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Represents a column value in a CsvRecord
 */
class CsvColumn {
    constructor(value) {
        this._value = value;
    }
    /**
     * Return the value of this column
     */
    getValue() {
        return this._value;
    }
}
exports.default = CsvColumn;
//# sourceMappingURL=CsvColumn.js.map