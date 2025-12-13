const cds = require('@sap/cds');
const { afterReadProducts } = require('./products');

beforeReadCart = async req => { req.data.user_id = req.user.id };

afterReadCart = async (carts, req) => {
      if (!Array.isArray(carts)) carts = [carts];
    
      for (const cart of carts) {
        const products = await SELECT.from(CartItem)
          .where({ cart_ID: cart.ID })
          .columns(['quantity', 'price']);

        cart.total_price = products.reduce((sum, product) => sum + (product.quantity * product.price), 0);
      }
    }

module.exports = { beforeReadCart,
                   afterReadProducts };