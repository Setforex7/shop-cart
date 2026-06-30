import models from "cap_try_ts/model/models";
import JSONModel from "sap/ui/model/json/JSONModel";
import BindingMode from "sap/ui/model/BindingMode";

let oDeviceModel: JSONModel | null;

QUnit.module("cap_try_ts/model/models", {
	beforeEach() {
		oDeviceModel = null;
	},
	afterEach() {
		if (oDeviceModel) {
			oDeviceModel.destroy();
			oDeviceModel = null;
		}
	}
});

QUnit.test("createDeviceModel returns a JSONModel instance", function (assert) {
	oDeviceModel = models.createDeviceModel();

	assert.ok(oDeviceModel, "a model was returned");
	assert.ok(oDeviceModel instanceof JSONModel, "the returned model is a JSONModel");
});

QUnit.test("createDeviceModel configures the model with OneWay default binding mode", function (assert) {
	oDeviceModel = models.createDeviceModel();

	assert.strictEqual(oDeviceModel.getDefaultBindingMode(), BindingMode.OneWay, "default binding mode is OneWay");
});

QUnit.test("createDeviceModel exposes device runtime data", function (assert) {
	oDeviceModel = models.createDeviceModel();

	assert.ok(oDeviceModel.getData(), "the model holds device data");
});
