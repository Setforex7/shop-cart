using { sap.capire.shop_cart as my } from '../db/schema';

// ----------------------------------------------------------------------------
// Input Types (Payloads)
// ----------------------------------------------------------------------------

//? Payload for creating a product
type sAddProduct { 
  company_ID  : UUID;         // [ADICIONADO] Obrigatório no schema (Products -> Company)
  name        : String(50);
  description : String(600);
  price       : Decimal(10,2);
  currency    : String(3);
  stock       : Integer;      
  stock_min   : Integer;
};

//? Payload for adding items to the Cart
type sCartItemInput { 
  cart_ID    : UUID;          // Se nulo, a lógica deve criar um novo carrinho
  product_ID : UUID;          
  quantity   : Integer;
};

//? Payload for finalizing the process
// [ALTERADO] Simplificado. Não deves enviar os produtos novamente. 
// O backend deve ler o que já está salvo no Carrinho para garantir o preço correto.
type sFinalizeCart { 
  cart_ID    : UUID; 
};

type sDeleteProduct { ID: UUID };


// ----------------------------------------------------------------------------
// Service Definition
// ----------------------------------------------------------------------------

service ShopCartService @(path:'/shop') { 

  // --------------------------------------------------------------------------
  // Entities
  // --------------------------------------------------------------------------

  @restrict: [ { grant: ['READ', 'WRITE', 'DELETE'], to: 'authenticated-user' } ]
  entity Company as projection on my.Company {
      *,
      products : redirected to Products
  };

  @restrict: [ { grant: [ 'READ', 'WRITE' ], to: 'authenticated-user' },
               { grant: '*', to: 'admin' } ]
  entity Products as projection on my.Products {
    *,
    company.currency.code as currency,
    company : redirected to Company,
    virtual 0 as quantity : Integer @Core.Computed: false,
  };

  @restrict: [ { grant: ['READ', 'WRITE', 'DELETE'], where: 'createdBy = $user.id' } ]
  entity Cart as projection on my.Cart { 
    *,
    items : redirected to CartItem // Redireciona para a projeção local
  };

  @restrict: [ { grant: ['READ', 'WRITE', 'DELETE'], where: 'createdBy = $user.id' } ]
  entity CartItem as projection on my.CartItem { // Mudei para 'projection on' para consistência
    *,
    product: redirected to Products
  };

  @readonly
  @restrict: [ { grant: ['READ'], where: 'createdBy = $user.id' } ]
  entity UserSpend as select from my.Orders { 
    key company.ID as company_ID,
    company.name as company_name,
    sum(total_price) as totalSpent : Decimal(15,2)
  } group by company.ID, company.name, createdBy;

  @cds.redirection.target 
  @readonly
  @restrict: [ { grant: 'READ', where: 'createdBy = $user.id' } ]
  entity Orders as projection on my.Orders {
    *,
    items : redirected to OrderItems
  };

  @readonly
  @restrict: [ { grant: 'READ', where: 'createdBy = $user.id' } ]
  entity OrderItems as projection on my.OrderItems;

  @readonly
  // A view PurchaseHistory já tem a coluna 'user', então a cláusula where estava correta
  @restrict: [ { grant: 'READ', where: 'user = $user.id' } ] 
  entity PurchaseHistory as projection on my.PurchaseHistory;

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------

  @requires: 'authenticated-user'
  action createProduct (product: sAddProduct) returns Products; 

  @requires: 'authenticated-user'
  action deleteProduct (product: sDeleteProduct) returns sDeleteProduct;

  @requires: 'authenticated-user'
  action addProductsToCart (products: many sCartItemInput) returns Cart;

  @requires: 'authenticated-user'
  action finalizeProcess (cart: sFinalizeCart) returns Orders; // [ALTERADO] Retorna a Encomenda criada, não o Carrinho
}