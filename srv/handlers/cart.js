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

beforeCreateCart = async req => {
    const cart = req.data;
    const tx = cds.transaction(req);

    const carts = await tx.run(SELECT.from(Cart).orderBy({ createdAt: 'desc' }));

    cart.name = `Cart - ${carts.length > 0 ? parseInt(carts[0]?.name.split(" - ")[1]) + 1 : 1}`;
}

addProductToCart = async req => {
    const { products } = req.data;
    const { id } = req.user; 
    const { cart_ID } = products[0] || "";
    console.log("products: - ", products);
    const tx = cds.transaction(req); 

    for (const oProductToAdd of products) {
      if(!cart_ID) return req.error(400, 'ID do carrinho não fornecido.');

        const product = await SELECT.one.from(Products).where({ ID: oProductToAdd.product_ID });

        if (!product) return req.error(404, `Produto com ID ${oProductToAdd.product_ID} não encontrado.`);

        if (product.stock < oProductToAdd.quantity) return req.error(400, `Stock insuficiente para o produto ${product.name}. A operação foi cancelada.`);

        const existingCartItem = await SELECT.one.from(CartItem).where({ cart_ID: oProductToAdd.cart_ID, product_ID: oProductToAdd.product_ID });

        if (existingCartItem) 
            await tx.run(UPDATE(CartItem, existingCartItem.ID).with({ quantity: { '+=': oProductToAdd.quantity } }));
        else 
            await tx.run(INSERT.into(CartItem).entries({ cart: { ID: oProductToAdd.cart_ID },
                                                          cart_user_id: id,
                                                          product: { ID: oProductToAdd.product_ID },
                                                          quantity: oProductToAdd.quantity,
                                                          price: product.price,
                                                          currency: product.currency }));
          

          await tx.run(UPDATE(Products, oProductToAdd.product_ID).with({ stock_max: { '-=': oProductToAdd.quantity } }));
      }
      const cartItems = await tx.run(SELECT.from(CartItem).where({ cart_ID: cart_ID }));
      const total_price = cartItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

      await tx.run(UPDATE(Cart, cart_ID).with({ total_price: total_price }));

      const updatedCart = await tx.run(SELECT.one.from(Cart).where({ ID: cart_ID })
                                                            .columns(c => { c `.*`,
                                                                            c.products(i => { i `.*`,
                                                                                              i.product(p => p `.*`)})}));

      return updatedCart;
}

module.exports = { beforeReadCart,
                   afterReadProducts,
                   beforeCreateCart,
                   addProductToCart };