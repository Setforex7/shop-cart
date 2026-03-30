const cds = require('@sap/cds');

const { Company, Products, Cart, CartItem, Orders, OrderItems } = cds.entities;

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
    const { product_IDs } = req.data;

    const tx = cds.transaction(req); 

    for (const sProductId of product_IDs) {
      if(!cart_ID) return req.error(400, 'Cart ID not provided.');

        const product = await SELECT.one.from(Products).where({ ID: sProductId });

        if (!product) return req.error(404, `Product with ID ${sProductId} not found.`);

        if (product.stock < 1) return req.error(400, `Insufficient stock for product ${product.name}. Operation cancelled.`);

        const existingCartItem = await SELECT.one.from(CartItem).where({ cart_ID: cart_ID, product_ID: sProductId });

        if (existingCartItem)
            await tx.run(UPDATE(CartItem, existingCartItem.ID).with({ quantity: { '+=': 1 } }));
        else {
            const company = await SELECT.one.from(Company).where({ ID: product.company_ID });
            await tx.run(INSERT.into(CartItem).entries({ cart_ID: cart_ID,
                                                         product_ID: sProductId,
                                                         quantity: 1,
                                                         price: product.price,
                                                         currency_code: company.currency_code }));
        }
      }
    const cartItems = await tx.run(SELECT.from(CartItem).where({ cart_ID: cart_ID }));
    const total_price = cartItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    await tx.run(UPDATE(Cart, cart_ID).with({ total_price: total_price }));

    const updatedCart = await tx.run(SELECT.one.from(Cart).where({ ID: cart_ID })
                                                          .columns(c => { c('*'),          // Select all top-level fields of the Cart
                                                                          c.items(it => {
                                                                          it('*');}) }));

    return updatedCart;
}

finalizeCart = async req => {
    const [ cartID ] = req.params;
    if(!cartID) return req.error(400, 'Cart ID not provided.');

    const tx = cds.transaction(req);

    const cart = await tx.run(SELECT.one.from(Cart).where({ ID: cartID }));

    if (!cart) return req.error(404, `Cart with the ID ${cartID} not found!`);

    const { ID, company_ID, status, currency_code } = cart;
    if (status !== 'Active') return req.error(400, 'Only Active carts can be finalized.');

    const cartItems = await tx.run(SELECT.from(CartItem).where({ cart_ID: cartID }));

    if (cartItems.length === 0) return req.error(400, 'Cannot finalize an empty cart.');

    const aItemsToCreate = [];

    for(const item of cartItems) {
        const { product_ID, quantity } = item;

        const product = await tx.run(SELECT.one.from(Products).where({ ID: product_ID,
                                                                           company_ID: company_ID }));
        if(!product) return req.error(404, `Product with ID ${product_ID} not found.`);
        const { price } = product;

        if (product.stock < quantity) return req.error(400, `Insufficient stock for product ${product.name}. Operation cancelled.`);
        
        aItemsToCreate.push({ product_ID: product_ID,
                              price: price,
                              price_at_create: price,
                              total_price: price * quantity,
                              quantity: quantity,
                              currency_code: currency_code });
    }

    const cartTotalPrice = aItemsToCreate.reduce((sum, item) => sum + item.total_price, 0);
    
    for(const product of aItemsToCreate){
        const { product_ID, quantity } = product;
        await tx.run(UPDATE(Products, product_ID).with({ stock: { '-=': quantity } }));
    }

    await tx.run(UPDATE(Cart, ID).with({ status: 'Ordered' }));
    await tx.run(UPDATE(Company, company_ID).with({ capital: { '+=': cartTotalPrice } }));

    const newOrder = await tx.run(INSERT.into(Orders).entries({ company_ID: company_ID,
                                                                items: aItemsToCreate,
                                                                type: "S",
                                                                total_price: cartTotalPrice,
                                                                currency_code: currency_code }));

    return newOrder;
}

module.exports = { beforeReadCart,
                   afterReadCart,
                   beforeCreateCart,
                   addProductToCart,
                   finalizeCart };