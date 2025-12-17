const cds = require('@sap/cds');

const { CartItem } = cds.entities;

afterReadProducts = each => { each.quantity = 0; }

beforeCreateProducts = async req => {
    const product = req.data;
    const processStatus = validateProductCreateData(product);
    if(!processStatus.status) return req.reject(400, processStatus.message);
    return product;
}

beforeDeleteProducts = async req => {
    const { ID } = req.data;
    await DELETE.from(CartItem).where({ product_ID: ID });
}

module.exports = { afterReadProducts,
                   beforeCreateProducts,
                   beforeDeleteProducts };

validateProductCreateData = product => {
    if(!product) return { status: false, message: 'Something went wrong creating the product' };
    if(!product.name === "") return { status: false, message: 'Please insert a valid name' };
    if(!product.price || parseFloat(product.price) < 0) return { status: false, message: 'Please insert a valid price' };
    if(parseFloat(product.stock_min) < 0) return { status: false, message: 'Please insert a valid value for stock minimum' };
    if(parseFloat(product.stock) < 0) return { status: false, message: 'Please insert a valid value for stock' };
    return { status: true };
};