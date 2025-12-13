const cds = require('@sap/cds');

afterReadProducts = each => { each.quantity = 0; }

module.exports = { afterReadProducts };