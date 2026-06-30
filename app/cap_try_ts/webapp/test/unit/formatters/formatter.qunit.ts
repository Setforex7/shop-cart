import formatter from "cap_try_ts/formatters/formatter";
import QUnit from "sap/ui/thirdparty/qunit-2";

interface TestContext {
	oFormatter: typeof formatter | null;
}

QUnit.module("cap_try_ts/formatters/formatter", {
	beforeEach: function (this: TestContext) {
		this.oFormatter = formatter;
	},
	afterEach: function (this: TestContext) {
		this.oFormatter = null;
	}
});

QUnit.test("stockStateFormatter returns the expected states", function (this: TestContext, assert) {
	assert.strictEqual(this.oFormatter!.stockStateFormatter("abc", 10), "None", "Non-numeric current stock yields 'None'");
	assert.strictEqual(this.oFormatter!.stockStateFormatter(10, "xyz"), "None", "Non-numeric min stock yields 'None'");
	assert.strictEqual(this.oFormatter!.stockStateFormatter(5, 10), "Error", "Current below min yields 'Error'");
	assert.strictEqual(this.oFormatter!.stockStateFormatter(11, 10), "Warning", "Current within warning threshold yields 'Warning'");
	assert.strictEqual(this.oFormatter!.stockStateFormatter(100, 10), "Success", "Current well above min yields 'Success'");
});

QUnit.test("stockIconFormatter returns the expected icon URIs", function (this: TestContext, assert) {
	assert.strictEqual(this.oFormatter!.stockIconFormatter("abc", 10), "", "Non-numeric input yields empty string");
	assert.strictEqual(this.oFormatter!.stockIconFormatter(5, 10), "sap-icon://error", "Current below min yields error icon");
	assert.strictEqual(this.oFormatter!.stockIconFormatter(11, 10), "sap-icon://alert", "Current within warning threshold yields alert icon");
	assert.strictEqual(this.oFormatter!.stockIconFormatter(100, 10), "sap-icon://sys-enter-2", "Current well above min yields success icon");
});

QUnit.test("stockIconColorFormatter returns the expected colors", function (this: TestContext, assert) {
	assert.strictEqual(this.oFormatter!.stockIconColorFormatter("abc", 10), "Default", "Non-numeric input yields 'Default'");
	assert.strictEqual(this.oFormatter!.stockIconColorFormatter(5, 10), "Negative", "Current below min yields 'Negative'");
	assert.strictEqual(this.oFormatter!.stockIconColorFormatter(11, 10), "Critical", "Current within warning threshold yields 'Critical'");
	assert.strictEqual(this.oFormatter!.stockIconColorFormatter(100, 10), "Positive", "Current well above min yields 'Positive'");
});

QUnit.test("toNumber parses values into integers", function (this: TestContext, assert) {
	assert.strictEqual(this.oFormatter!.toNumber("42"), 42, "Numeric string is parsed to integer");
	assert.strictEqual(this.oFormatter!.toNumber(7), 7, "Number is returned as integer");
	assert.strictEqual(this.oFormatter!.toNumber("15px"), 15, "Leading digits are parsed");
});
