using { ShopCartService } from './shop_cart-service';

annotate ShopCartService.Orders with @(
    UI.SelectionFields: [ ID,
                          type,
                          createdAt, ],

    UI.LineItem: [ { $Type: 'UI.DataField', Value: ID, Label: 'OrderID' },
                   { $Type: 'UI.DataField', Value: createdAt, Label: 'Purchase Date' },
                //    { $Type: 'UI.DataField', Value: company.name, Label: 'Company' }, 
                   { $Type: 'UI.DataField', Value: type, Label: 'Order Type' },
                   { $Type: 'UI.DataField', Value: total_price, Label: 'Amount' },
                   { $Type: 'UI.DataField', Value: currency_code, Label: 'Currency' } ],

    UI.HeaderInfo: { TypeName: 'Order',
                     TypeNamePlural: 'Orders',
                     Title: { Value: ID } }
);

annotate ShopCartService.Orders with {
    type @title: 'Type';
};