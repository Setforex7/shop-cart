const cds = require('@sap/cds');
const { afterReadProducts } = require('./products');

const { Products, Cart, CartItem } = cds.entities;

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

beforeCreateCart = async req => {
    const cart = req.data;
    const tx = cds.transaction(req);

    const carts = await tx.run(SELECT.from(Cart).orderBy({ createdAt: 'desc' }));

    cart.name = `Cart - ${carts.length > 0 ? parseInt(carts[0]?.name.split(" - ")[1]) + 1 : 1}`;
}

addProductToCart = async req => {
    const [ cart_ID ] = req.params;
    console.log(cart_ID);
    const { product_IDs } = req.data;
    const { id } = req.user; 

    const tx = cds.transaction(req); 

    for (const sProductId of product_IDs) {
      if(!cart_ID) return req.error(400, 'ID do carrinho não fornecido.');

        const product = await SELECT.one.from(Products).where({ ID: sProductId });

        if (!product) return req.error(404, `Produto com ID ${sProductId} não encontrado.`);

        if (product.stock < 1) return req.error(400, `Stock insuficiente para o produto ${product.name}. A operação foi cancelada.`);

        const existingCartItem = await SELECT.one.from(CartItem).where({ cart_ID: cart_ID, product_ID: sProductId });

        if (existingCartItem) 
            await tx.run(UPDATE(CartItem, existingCartItem.sProductId).with({ quantity: { '+=': 1 } }));
        else 
            await tx.run(INSERT.into(CartItem).entries({ cart_ID: cart_ID,
                                                         product_ID: sProductId,
                                                         quantity: 1,
                                                         price: product.price,
                                                         currency: product.currency }));
          

          await tx.run(UPDATE(Products, sProductId).with({ stock: { '-=': 1 } }));
      }
      const cartItems = await tx.run(SELECT.from(CartItem).where({ cart_ID: cart_ID }));
      const total_price = cartItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

      await tx.run(UPDATE(Cart, cart_ID).with({ total_price: total_price }));

      const updatedCart = await tx.run(SELECT.one.from(Cart).where({ ID: cart_ID }));

      return updatedCart;
}

module.exports = { beforeReadCart,
                   afterReadProducts,
                   beforeCreateCart,
                   addProductToCart };