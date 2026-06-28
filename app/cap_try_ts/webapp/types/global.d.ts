// Ambient declarations for runtime globals that are not covered by
// @sapui5/types.

/**
 * SheetJS (community build) is loaded as a plain global browser script from
 * index.html (`<script src="util/xlsx.full.min.js">`), before the UI5 bootstrap.
 * It exposes a global `XLSX` object which service/FileService.ts references
 * directly. (Previously loaded via the deprecated sap.ui5/resources/js manifest
 * entry, which was removed during the manifest v2 migration.)
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
