clothes_data = [
  {
    "name": "Classic White T-Shirt",
    "category": "T-Shirts",
    "purchase_price": 6,
    "sale_price": 12,
    "stock": 40,
    "min_stock": 8,
    "status": "active"
  },
  {
    "name": "Black Oversized T-Shirt",
    "category": "T-Shirts",
    "purchase_price": 8,
    "sale_price": 16,
    "stock": 30,
    "min_stock": 6,
    "status": "active"
  },
  {
    "name": "Slim Fit Blue Jeans",
    "category": "Jeans",
    "purchase_price": 18,
    "sale_price": 32,
    "stock": 22,
    "min_stock": 5,
    "status": "active"
  },
  {
    "name": "Cargo Pants Khaki",
    "category": "Pants",
    "purchase_price": 20,
    "sale_price": 36,
    "stock": 18,
    "min_stock": 4,
    "status": "active"
  },
  {
    "name": "Casual Denim Jacket",
    "category": "Jackets",
    "purchase_price": 28,
    "sale_price": 48,
    "stock": 12,
    "min_stock": 3,
    "status": "active"
  },
  {
    "name": "Hoodie Urban Gray",
    "category": "Hoodies",
    "purchase_price": 16,
    "sale_price": 30,
    "stock": 20,
    "min_stock": 5,
    "status": "active"
  },
  {
    "name": "Floral Summer Dress",
    "category": "Dresses",
    "purchase_price": 14,
    "sale_price": 27,
    "stock": 15,
    "min_stock": 4,
    "status": "active"
  },
  {
    "name": "Pleated Midi Skirt",
    "category": "Skirts",
    "purchase_price": 12,
    "sale_price": 24,
    "stock": 17,
    "min_stock": 4,
    "status": "active"
  },
  {
    "name": "Formal Long Sleeve Shirt",
    "category": "Shirts",
    "purchase_price": 15,
    "sale_price": 29,
    "stock": 19,
    "min_stock": 5,
    "status": "active"
  },
  {
    "name": "Cotton Polo Navy",
    "category": "Polos",
    "purchase_price": 10,
    "sale_price": 21,
    "stock": 25,
    "min_stock": 6,
    "status": "active"
  }
]


customers_data = [
  {
    "name": "Jean Pierre",
    "phone": "+50936123456",
    "address": "Rue Panaméricaine, Pétion-Ville, Ouest",
    "note": "Regular customer, prefers cash",
    "credit_limit": 15000,
    "status": "active"
  },
  {
    "name": "Marie Joseph",
    "phone": "+50937224567",
    "address": "Avenue John Brown, Port-au-Prince, Ouest",
    "note": "Buys wholesale items",
    "credit_limit": 25000,
    "status": "active"
  },
  {
    "name": "Frantz Louis",
    "phone": "+50938235678",
    "address": "Rue Clercine, Tabarre, Ouest",
    "note": "Requests delivery service",
    "credit_limit": 12000,
    "status": "active"
  },
  {
    "name": "Sophia Desir",
    "phone": "+50939246789",
    "address": "Rue du Quai, Cap-Haïtien, Nord",
    "note": "Prefers card payments",
    "credit_limit": 18000,
    "status": "active"
  },
  {
    "name": "Ricardo Etienne",
    "phone": "+50940257890",
    "address": "Rue Christophe, Gonaïves, Artibonite",
    "note": "Seasonal buyer",
    "credit_limit": 10000,
    "status": "active"
  },
  {
    "name": "Nadia Paul",
    "phone": "+50941268901",
    "address": "Rue des Miracles, Jacmel, Sud-Est",
    "note": "Prefers home delivery",
    "credit_limit": 16000,
    "status": "active"
  },
  {
    "name": "Samuel Charles",
    "phone": "+50942279012",
    "address": "Rue des Dalles, Les Cayes, Sud",
    "note": "Wholesale client",
    "credit_limit": 30000,
    "status": "active"
  },
  {
    "name": "Carla Jean-Baptiste",
    "phone": "+50943280123",
    "address": "Rue Geffrard, Jérémie, Grand'Anse",
    "note": "Occasional buyer",
    "credit_limit": 8000,
    "status": "active"
  },
  {
    "name": "Michel Dorval",
    "phone": "+50944291234",
    "address": "Rue des Casernes, Hinche, Centre",
    "note": "Pays on credit",
    "credit_limit": 20000,
    "status": "active"
  },
  {
    "name": "Elise Fleurant",
    "phone": "+50945302345",
    "address": "Rue Toussaint Louverture, Fort-Liberté, Nord-Est",
    "note": "Prefers electronic receipts",
    "credit_limit": 14000,
    "status": "active"
  }
]

sales_data = [
  {
    "customer_id": 1,
    "payment_method": "cash",
    "discount": 0,
    "items": [
      {
        "product_id": 2,
        "quantity": 3
      }
    ],
    "notes": "Quick purchase, no discount applied"
  },
  {
    "customer_id": 2,
    "payment_method": "card",
    "discount": 5,
    "items": [
      {
        "product_id": 1,
        "quantity": 2
      },
      {
        "product_id": 4,
        "quantity": 1
      }
    ],
    "notes": "Applied 5% loyalty discount"
  },
  {
    "customer_id": 3,
    "payment_method": "mobile_money",
    "discount": 0,
    "items": [
      {
        "product_id": 3,
        "quantity": 5
      }
    ],
    "notes": "Paid via MonCash"
  },
  {
    "customer_id": 4,
    "payment_method": "cash",
    "discount": 10,
    "items": [
      {
        "product_id": 5,
        "quantity": 2
      }
    ],
    "notes": "Special promotion discount applied"
  },
  {
    "customer_id": 5,
    "payment_method": "card",
    "discount": 0,
    "items": [
      {
        "product_id": 6,
        "quantity": 1
      },
      {
        "product_id": 2,
        "quantity": 2
      }
    ],
    "notes": "Customer requested invoice by email"
  }
]

