using { Currency, managed, sap } from '@sap/cds/common';
namespace sap.capire.shop_cart; 

type Name : String(50);
type Descriptions : String(600);
type PriceCurrency : { amount : Decimal(10,2); currency : String(3); };
type OrderType : String enum { B; 
                               S }

entity Orders : managed { key ID      : UUID;
                          company     : Association to Company;
                          items       : Composition of many OrderItems on items.order = $self; 
                          type        : String enum { Buy = 'B'; 
                                                      Sell = 'S'; }; 
                          total_price : Decimal(10,2) @mandatory;
                          currency    : Currency @mandatory; }

entity OrderItems : managed { key ID              : UUID;
                              order               : Association to Orders; 
                              product             : Association to Products @mandatory;
                              quantity            : Integer @mandatory;
                              price_at_create     : Decimal(10,2) @mandatory;
                              total_price         : Decimal(10,2) @mandatory;
                              currency            : Currency @mandatory; }

entity Company : managed { key ID      : UUID;
                           products     : Association to many Products on products.company = $self;
                           name        : Name @mandatory @title: 'Company Name';
                           description : Descriptions;
                           capital     : Decimal(15,2) @mandatory;
                           currency    : Currency @mandatory; }


@assert.unique: { nameByCompany: [company, name] }
entity Products : managed { key ID      : UUID;
                            company     : Association to Company @mandatory;
                            name        : Name @mandatory;
                            description : Descriptions;
                            price       : Decimal(10,2) @mandatory;
                            stock       : Integer @mandatory;
                            stock_min   : Integer @mandatory; }

entity Cart : managed { key ID              : UUID;
                        name                : Name;
                        company             : Association to Company; @mandatory
                        items               : Composition of many CartItem on items.cart = $self; 
                        virtual total_price : Decimal(10,2);
                        currency            : Currency @mandatory; }

entity CartItem : managed { key ID              : UUID;
                            cart                : Association to Cart;
                            product             : Association to Products @mandatory;
                            quantity            : Integer @mandatory;
                            virtual price       : Decimal(10,2); 
                            virtual total_price : Decimal(10,2);
                            currency            : Currency @mandatory; }

view PurchaseHistory as select from OrderItems { key ID,
                                                 order.createdBy as user,
                                                 order.company.ID as company_ID,
                                                 order.company.name as company_name,
                                                 order.ID as order_ID,
                                                 order.createdAt as purchase_date,
                                                 product.name as product_name,
                                                 quantity,
                                                 price_at_create as unit_price,
                                                 total_price,
                                                 currency };