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
	assert.strictEqual(formatter.stockStateFormatter("abc", 10), "None", "Non-numeric current stock yields 'None'");
	assert.strictEqual(formatter.stockStateFormatter(10, "xyz"), "None", "Non-numeric min stock yields 'None'");
});

QUnit.test("stockStateFormatter returns 'Error' when current stock is below minimum", function (assert) {
	assert.strictEqual(formatter.stockStateFormatter(5, 10), "Error", "5 < 10 yields 'Error'");
	assert.strictEqual(formatter.stockStateFormatter("0", "1"), "Error", "String input below minimum yields 'Error'");
});

QUnit.test("stockStateFormatter returns 'Warning' within the 20% warning band", function (assert) {
	assert.strictEqual(formatter.stockStateFormatter(10, 10), "Warning", "Equal to minimum yields 'Warning'");
	assert.strictEqual(formatter.stockStateFormatter(12, 10), "Warning", "Upper bound of warning band yields 'Warning'");
	assert.strictEqual(formatter.stockStateFormatter("11", "10"), "Warning", "String input inside band yields 'Warning'");
});

QUnit.test("stockStateFormatter returns 'Success' above the warning band", function (assert) {
	assert.strictEqual(formatter.stockStateFormatter(13, 10), "Success", "Above warning band yields 'Success'");
	assert.strictEqual(formatter.stockStateFormatter("100", "10"), "Success", "String input well above minimum yields 'Success'");
});

QUnit.test("stockIconFormatter returns an empty string for non-numeric input", function (assert) {
	assert.strictEqual(formatter.stockIconFormatter("abc", 10), "", "Non-numeric current stock yields empty string");
	assert.strictEqual(formatter.stockIconFormatter(10, "xyz"), "", "Non-numeric min stock yields empty string");
});

QUnit.test("stockIconFormatter returns the error icon below minimum", function (assert) {
	assert.strictEqual(formatter.stockIconFormatter(5, 10), "sap-icon://error", "5 < 10 yields the error icon");
});

QUnit.test("stockIconFormatter returns the alert icon inside the warning band", function (assert) {
	assert.strictEqual(formatter.stockIconFormatter(10, 10), "sap-icon://alert", "Equal to minimum yields the alert icon");
	assert.strictEqual(formatter.stockIconFormatter(12, 10), "sap-icon://alert", "Upper bound of warning band yields the alert icon");
});

QUnit.test("stockIconFormatter returns the success icon above the warning band", function (assert) {
	assert.strictEqual(formatter.stockIconFormatter(13, 10), "sap-icon://sys-enter-2", "Above warning band yields the success icon");
	assert.strictEqual(formatter.stockIconFormatter("50", "10"), "sap-icon://sys-enter-2", "String input above band yields the success icon");
});

QUnit.test("stockIconColorFormatter returns 'Default' for non-numeric input", function (assert) {
	assert.strictEqual(formatter.stockIconColorFormatter("abc", 10), "Default", "Non-numeric current stock yields 'Default'");
	assert.strictEqual(formatter.stockIconColorFormatter(10, "xyz"), "Default", "Non-numeric min stock yields 'Default'");
});

QUnit.test("stockIconColorFormatter returns 'Negative' below minimum", function (assert) {
	assert.strictEqual(formatter.stockIconColorFormatter(5, 10), "Negative", "5 < 10 yields 'Negative'");
});

QUnit.test("stockIconColorFormatter returns 'Critical' inside the warning band", function (assert) {
	assert.strictEqual(formatter.stockIconColorFormatter(10, 10), "Critical", "Equal to minimum yields 'Critical'");
	assert.strictEqual(formatter.stockIconColorFormatter(12, 10), "Critical", "Upper bound of warning band yields 'Critical'");
});

QUnit.test("stockIconColorFormatter returns 'Positive' above the warning band", function (assert) {
	assert.strictEqual(formatter.stockIconColorFormatter(13, 10), "Positive", "Above warning band yields 'Positive'");
	assert.strictEqual(formatter.stockIconColorFormatter("75", "10"), "Positive", "String input above band yields 'Positive'");
});

QUnit.test("toNumber parses strings and numbers into integers", function (assert) {
	assert.strictEqual(formatter.toNumber("42"), 42, "Numeric string is parsed to an integer");
	assert.strictEqual(formatter.toNumber(7), 7, "Number input is returned as an integer");
	assert.strictEqual(formatter.toNumber("12.9"), 12, "Decimal string is truncated to an integer");
	assert.ok(isNaN(formatter.toNumber("abc")), "Non-numeric string yields NaN");
});

QUnit.test("formatter exposes all expected public methods", function (assert) {
	assert.strictEqual(typeof formatter.stockStateFormatter, "function", "stockStateFormatter is a function");
	assert.strictEqual(typeof formatter.stockIconFormatter, "function", "stockIconFormatter is a function");
	assert.strictEqual(typeof formatter.stockIconColorFormatter, "function", "stockIconColorFormatter is a function");
	assert.strictEqual(typeof formatter.toNumber, "function", "toNumber is a function");
});
