const cds = require('@sap/cds');
const { SELECT, CREATE, UPDATE, SUM } = cds.ql;
const { errors } = require('@sap/cds');
const ordersHandler = require('./handlers/orders.js');
const cartHandler = require('./handlers/cart.js');
const productsHandler = require('./handlers/products.js');
const jobsHandler = require('./handlers/jobs.js');
const e = require('express');

class ShopCartService extends cds.ApplicationService { async init() {

  const db = await cds.connect.to('db')
  const { Products, Company, Cart, CartItem, Orders } = db.entities

  cds.on('served', jobsHandler.onCdsServer);

  this.after('READ', 'Products', productsHandler.afterReadProducts);

  this.before('READ', 'Cart', cartHandler.beforeReadCart);

  this.after('READ', 'Cart', cartHandler.afterReadCart);

  this.before('CREATE', 'Products', productsHandler.beforeCreateProducts);

  this.before("DELETE", "Products", productsHandler.beforeDeleteProducts);

  this.before('CREATE', 'Cart', cartHandler.beforeCreateCart);

  this.on('finalizeCart', cartHandler.finalizeCart);

  this.on('addProductsToCart', cartHandler.addProductToCart);

  return super.init()
}}
module.exports = ShopCartService