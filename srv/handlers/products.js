const cds = require('@sap/cds');

const { CartItem } = cds.entities;

const validateProductCreateData = product => {
    if(!product) return { status: false, message: 'Something went wrong creating the product' };
    if(!product.name || product.name.trim() === "") return { status: false, message: 'Please insert a valid name' };
    if(product.price === null || product.price === undefined || parseFloat(product.price) < 0) return { status: false, message: 'Please insert a valid price' };
    if(product.stock_min === null || product.stock_min === undefined || parseFloat(product.stock_min) < 0) return { status: false, message: 'Please insert a valid value for stock minimum' };
    if(product.stock === null || product.stock === undefined || parseFloat(product.stock) < 0) return { status: false, message: 'Please insert a valid value for stock' };
    return { status: true };
};

const afterReadProducts = each => { each.quantity = 0; };

const beforeCreateProducts = async req => {
    const product = req.data;
    const processStatus = validateProductCreateData(product);
    if(!processStatus.status) return req.reject(400, processStatus.message);
    return product;
};

const beforeDeleteProducts = async req => {
    const { ID } = req.data;
    await DELETE.from(CartItem).where({ product_ID: ID });
};

module.exports = { afterReadProducts,
                   beforeCreateProducts,
                   beforeDeleteProducts };
