// const cds = require('@sap/cds');
// // const validations = require('../utils/validations');

// module.exports = {
//     beforeCreateProduct: async req => {
//         const product = req.data;
//         // const validateEntity = validations.validateProduct(product);
//         if(!product) return { status: false, message: 'Something went wrong creating the product' };
//         if(!product.name === "") return { status: false, message: 'Please insert a valid name' };
//         if(!product.price || parseFloat(product.price) < 0) return { status: false, message: 'Please insert a valid price' };
//         if(parseFloat(product.stock_min) < 0) return { status: false, message: 'Please insert a valid value for stock minimum' };
//         if(parseFloat(product.stock_max) < 0) return { status: false, message: 'Please insert a valid value for stock maximum' };
//         if(product.currency !== "EUR" && product.currency !== "USD") return { status: false, message: 'Please insert a valid currency (EUR or USD)' };
    
//         if(!validateEntity.status) return req.reject(400, validateEntity.message);
//         return product;
//     },
// }