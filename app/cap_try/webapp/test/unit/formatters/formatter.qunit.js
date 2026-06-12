sap.ui.define([
    "cap_try/formatters/formatter",
    "sap/ui/thirdparty/sinon"
], function (formatter, sinon) {
    "use strict";

    QUnit.module("cap_try.formatters.formatter", {
        beforeEach: function () {
            this.oFormatter = formatter;
            this.oSandbox = sinon.sandbox.create();
        },
        afterEach: function () {
            this.oSandbox.restore();
            this.oFormatter = null;
        }
    });

    QUnit.test("stockStateFormatter", function (assert) {
        // non-numeric input -> 'None'
        assert.strictEqual(this.oFormatter.stockStateFormatter("abc", 10), "None", "non-numeric current stock returns 'None'");
        assert.strictEqual(this.oFormatter.stockStateFormatter(10, "abc"), "None", "non-numeric min stock returns 'None'");
        assert.strictEqual(this.oFormatter.stockStateFormatter(undefined, undefined), "None", "undefined inputs return 'None'");

        // minStock = 10 -> warning threshold = 10 + 10*0.20 = 12
        assert.strictEqual(this.oFormatter.stockStateFormatter(9, 10), "Error", "current below min returns 'Error'");
        assert.strictEqual(this.oFormatter.stockStateFormatter(10, 10), "Warning", "current equal to min returns 'Warning'");
        assert.strictEqual(this.oFormatter.stockStateFormatter(12, 10), "Warning", "current at warning threshold returns 'Warning'");
        assert.strictEqual(this.oFormatter.stockStateFormatter(13, 10), "Success", "current above warning threshold returns 'Success'");

        // numeric strings are accepted and parsed
        assert.strictEqual(this.oFormatter.stockStateFormatter("5", "10"), "Error", "numeric strings are parsed (below min -> 'Error')");
        assert.strictEqual(this.oFormatter.stockStateFormatter("50", "10"), "Success", "numeric strings are parsed (above threshold -> 'Success')");
    });

    QUnit.test("stockIconFormatter", function (assert) {
        // non-numeric input -> ''
        assert.strictEqual(this.oFormatter.stockIconFormatter("abc", 10), "", "non-numeric current stock returns empty string");
        assert.strictEqual(this.oFormatter.stockIconFormatter(10, "abc"), "", "non-numeric min stock returns empty string");

        // minStock = 10 -> warning threshold = 12
        assert.strictEqual(this.oFormatter.stockIconFormatter(9, 10), "sap-icon://error", "current below min returns error icon");
        assert.strictEqual(this.oFormatter.stockIconFormatter(10, 10), "sap-icon://alert", "current equal to min returns alert icon");
        assert.strictEqual(this.oFormatter.stockIconFormatter(12, 10), "sap-icon://alert", "current at warning threshold returns alert icon");
        assert.strictEqual(this.oFormatter.stockIconFormatter(13, 10), "sap-icon://sys-enter-2", "current above warning threshold returns success icon");

        // numeric strings are accepted and parsed
        assert.strictEqual(this.oFormatter.stockIconFormatter("100", "10"), "sap-icon://sys-enter-2", "numeric strings are parsed");
    });

    QUnit.test("stockIconColorFormatter", function (assert) {
        // non-numeric input -> 'Default'
        assert.strictEqual(this.oFormatter.stockIconColorFormatter("abc", 10), "Default", "non-numeric current stock returns 'Default'");
        assert.strictEqual(this.oFormatter.stockIconColorFormatter(10, "abc"), "Default", "non-numeric min stock returns 'Default'");

        // minStock = 10 -> warning threshold = 12
        assert.strictEqual(this.oFormatter.stockIconColorFormatter(9, 10), "Negative", "current below min returns 'Negative'");
        assert.strictEqual(this.oFormatter.stockIconColorFormatter(10, 10), "Critical", "current equal to min returns 'Critical'");
        assert.strictEqual(this.oFormatter.stockIconColorFormatter(12, 10), "Critical", "current at warning threshold returns 'Critical'");
        assert.strictEqual(this.oFormatter.stockIconColorFormatter(13, 10), "Positive", "current above warning threshold returns 'Positive'");

        // numeric strings are accepted and parsed
        assert.strictEqual(this.oFormatter.stockIconColorFormatter("1", "10"), "Negative", "numeric strings are parsed");
    });

    QUnit.test("toNumber", function (assert) {
        assert.strictEqual(this.oFormatter.toNumber("42"), 42, "parses an integer string");
        assert.strictEqual(this.oFormatter.toNumber("7.9"), 7, "truncates a decimal string via parseInt");
        assert.strictEqual(this.oFormatter.toNumber("12abc"), 12, "parses leading digits of a mixed string");
        assert.strictEqual(this.oFormatter.toNumber(0), 0, "keeps numeric zero as zero");
        assert.ok(isNaN(this.oFormatter.toNumber("abc")), "returns NaN for a non-numeric string");
    });
});
