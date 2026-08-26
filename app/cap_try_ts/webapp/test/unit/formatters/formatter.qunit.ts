import formatter from "cap_try_ts/formatters/formatter";

QUnit.module("formatters/formatter", {
	beforeEach: function (this: { oFormatter: typeof formatter }) {
		this.oFormatter = formatter;
	},
	afterEach: function (this: { oFormatter: typeof formatter | null }) {
		this.oFormatter = null;
	}
});

QUnit.test("stockStateFormatter returns 'None' for non-numeric input", function (assert) {
	assert.strictEqual(formatter.stockStateFormatter("abc", 10), "None", "non-numeric current stock yields None");
	assert.strictEqual(formatter.stockStateFormatter(10, "xyz"), "None", "non-numeric min stock yields None");
	assert.strictEqual(formatter.stockStateFormatter(NaN, NaN), "None", "NaN values yield None");
});

QUnit.test("stockStateFormatter returns 'Error' when current stock is below minimum", function (assert) {
	assert.strictEqual(formatter.stockStateFormatter(5, 10), "Error", "5 < 10 yields Error");
	assert.strictEqual(formatter.stockStateFormatter("0", "1"), "Error", "string values below minimum yield Error");
});

QUnit.test("stockStateFormatter returns 'Warning' inside the 20% warning band", function (assert) {
	assert.strictEqual(formatter.stockStateFormatter(10, 10), "Warning", "exactly at minimum yields Warning");
	assert.strictEqual(formatter.stockStateFormatter(12, 10), "Warning", "at the upper warning bound yields Warning");
	assert.strictEqual(formatter.stockStateFormatter("11", "10"), "Warning", "string values inside band yield Warning");
});

QUnit.test("stockStateFormatter returns 'Success' above the warning band", function (assert) {
	assert.strictEqual(formatter.stockStateFormatter(13, 10), "Success", "above the warning bound yields Success");
	assert.strictEqual(formatter.stockStateFormatter("100", "10"), "Success", "string values well above minimum yield Success");
});

QUnit.test("stockIconFormatter returns an empty string for non-numeric input", function (assert) {
	assert.strictEqual(formatter.stockIconFormatter("abc", 10), "", "non-numeric current stock yields empty string");
	assert.strictEqual(formatter.stockIconFormatter(10, "xyz"), "", "non-numeric min stock yields empty string");
});

QUnit.test("stockIconFormatter returns the error icon below minimum", function (assert) {
	assert.strictEqual(formatter.stockIconFormatter(5, 10), "sap-icon://error", "5 < 10 yields the error icon");
	assert.strictEqual(formatter.stockIconFormatter("1", "2"), "sap-icon://error", "string values below minimum yield the error icon");
});

QUnit.test("stockIconFormatter returns the alert icon inside the warning band", function (assert) {
	assert.strictEqual(formatter.stockIconFormatter(10, 10), "sap-icon://alert", "exactly at minimum yields the alert icon");
	assert.strictEqual(formatter.stockIconFormatter(12, 10), "sap-icon://alert", "at the upper warning bound yields the alert icon");
});

QUnit.test("stockIconFormatter returns the success icon above the warning band", function (assert) {
	assert.strictEqual(formatter.stockIconFormatter(13, 10), "sap-icon://sys-enter-2", "above the warning bound yields the success icon");
	assert.strictEqual(formatter.stockIconFormatter("50", "10"), "sap-icon://sys-enter-2", "string values well above minimum yield the success icon");
});

QUnit.test("stockIconColorFormatter returns 'Default' for non-numeric input", function (assert) {
	assert.strictEqual(formatter.stockIconColorFormatter("abc", 10), "Default", "non-numeric current stock yields Default");
	assert.strictEqual(formatter.stockIconColorFormatter(10, "xyz"), "Default", "non-numeric min stock yields Default");
});

QUnit.test("stockIconColorFormatter returns 'Negative' below minimum", function (assert) {
	assert.strictEqual(formatter.stockIconColorFormatter(5, 10), "Negative", "5 < 10 yields Negative");
	assert.strictEqual(formatter.stockIconColorFormatter("0", "5"), "Negative", "string values below minimum yield Negative");
});

QUnit.test("stockIconColorFormatter returns 'Critical' inside the warning band", function (assert) {
	assert.strictEqual(formatter.stockIconColorFormatter(10, 10), "Critical", "exactly at minimum yields Critical");
	assert.strictEqual(formatter.stockIconColorFormatter(12, 10), "Critical", "at the upper warning bound yields Critical");
});

QUnit.test("stockIconColorFormatter returns 'Positive' above the warning band", function (assert) {
	assert.strictEqual(formatter.stockIconColorFormatter(13, 10), "Positive", "above the warning bound yields Positive");
	assert.strictEqual(formatter.stockIconColorFormatter("200", "10"), "Positive", "string values well above minimum yield Positive");
});

QUnit.test("toNumber parses strings and numbers into integers", function (assert) {
	assert.strictEqual(formatter.toNumber("42"), 42, "numeric string is parsed to an integer");
	assert.strictEqual(formatter.toNumber(7), 7, "number passes through unchanged");
	assert.strictEqual(formatter.toNumber("12.9"), 12, "decimal string is truncated to an integer");
	assert.ok(isNaN(formatter.toNumber("abc")), "non-numeric string yields NaN");
});
