import models from "cap_try_ts/model/models";
import JSONModel from "sap/ui/model/json/JSONModel";
import Device from "sap/ui/Device";

QUnit.module("model/models", {
	beforeEach: function (this: { oModel: JSONModel | null }) {
		this.oModel = null;
	},
	afterEach: function (this: { oModel: JSONModel | null }) {
		if (this.oModel) {
			this.oModel.destroy();
			this.oModel = null;
		}
	}
});

QUnit.test("createDeviceModel returns a JSONModel instance", function (this: { oModel: JSONModel | null }, assert: Assert) {
	const oModel = models.createDeviceModel();
	this.oModel = oModel;

	assert.ok(oModel, "A model was returned");
	assert.ok(oModel instanceof JSONModel, "The returned model is a sap.ui.model.json.JSONModel");
});

QUnit.test("createDeviceModel uses OneWay as the default binding mode", function (this: { oModel: JSONModel | null }, assert: Assert) {
	const oModel = models.createDeviceModel();
	this.oModel = oModel;

	assert.strictEqual(oModel.getDefaultBindingMode(), "OneWay", "The default binding mode is OneWay");
});

QUnit.test("createDeviceModel exposes the sap.ui.Device data", function (this: { oModel: JSONModel | null }, assert: Assert) {
	const oModel = models.createDeviceModel();
	this.oModel = oModel;

	const oData = oModel.getData() as typeof Device;

	assert.strictEqual(oData, Device, "The model data is the sap.ui.Device object");
	assert.deepEqual(oModel.getProperty("/system"), Device.system, "The system information is available under /system");
	assert.strictEqual(oModel.getProperty("/support/touch"), Device.support.touch, "Touch support is readable via a property path");
});

QUnit.test("createDeviceModel returns a new model instance on every call", function (this: { oModel: JSONModel | null }, assert: Assert) {
	const oFirstModel = models.createDeviceModel();
	const oSecondModel = models.createDeviceModel();

	try {
		assert.notStrictEqual(oFirstModel, oSecondModel, "Each call creates a separate model instance");
		assert.strictEqual(oFirstModel.getData(), oSecondModel.getData(), "Both models share the same underlying Device data");
	} finally {
		oFirstModel.destroy();
		oSecondModel.destroy();
	}
});
