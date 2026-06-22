// Ambient declarations for runtime globals that are not covered by
// @sapui5/types.

/**
 * SheetJS (community build) is loaded as a non-module browser script via
 * manifest.json -> sap.ui5/resources/js (util/xlsx.full.min.js). It exposes a
 * global `XLSX` object which service/FileService.ts references directly.
 */
declare const XLSX: {
    read(data: unknown, opts?: { type?: string }): {
        SheetNames: string[];
        Sheets: Record<string, unknown>;
    };
    utils: {
        sheet_to_json<T = Record<string, unknown>>(sheet: unknown): T[];
    };
};
