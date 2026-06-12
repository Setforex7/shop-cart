/*global QUnit*/
sap.ui.define([
    "cap_try/model/models",
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device",
    "sap/ui/thirdparty/sinon"
], function (models, JSONModel, Device, sinon) {
    "use strict";

    QUnit.module("cap_try/model/models", {
        beforeEach: function () {
            this.sandbox = sinon.sandbox.create();
            this.oCreatedModel = null;
        },
        afterEach: function () {
            if (this.oCreatedModel) {
                this.oCreatedModel.destroy();
                this.oCreatedModel = null;
            }
            this.sandbox.restore();
        }
    });

    QUnit.test("createDeviceModel returns a JSONModel instance", function (assert) {
        // Act
        this.oCreatedModel = models.createDeviceModel();

        // Assert
        assert.ok(this.oCreatedModel, "a model instance was returned");
        assert.ok(this.oCreatedModel instanceof JSONModel, "the returned model is a sap.ui.model.json.JSONModel");
    });

    QUnit.test("createDeviceModel sets the default binding mode to OneWay", function (assert) {
        // Act
        this.oCreatedModel = models.createDeviceModel();

        // Assert
        assert.strictEqual(this.oCreatedModel.getDefaultBindingMode(), "OneWay", "the default binding mode is OneWay");
    });

    QUnit.test("createDeviceModel exposes sap.ui.Device data", function (assert) {
        // Act
        this.oCreatedModel = models.createDeviceModel();

        // Assert
        assert.strictEqual(this.oCreatedModel.getData(), Device, "the model data is the sap.ui.Device object");
        assert.deepEqual(this.oCreatedModel.getProperty("/system"), Device.system, "the /system property mirrors Device.system");
        assert.strictEqual(this.oCreatedModel.getProperty("/support/touch"), Device.support.touch, "the /support/touch property mirrors Device.support.touch");
    });

    QUnit.test("createDeviceModel returns a fresh model on every call", function (assert) {
        // Act
        this.oCreatedModel = models.createDeviceModel();
        var oSecondModel = models.createDeviceModel();

        // Assert
        assert.notStrictEqual(this.oCreatedModel, oSecondModel, "each invocation creates a new model instance");
        assert.strictEqual(oSecondModel.getDefaultBindingMode(), "OneWay", "the second model also uses OneWay binding mode");

        // Cleanup the extra instance created in this test
        oSecondModel.destroy();
    });
});
