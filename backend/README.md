## POS Boutique API (FastAPI)

### Setup

Create a virtualenv, then install deps:

```bash
cd backend
python -m venv .venv
.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
```

Create your env file:

```bash
copy .env.example .env
```

Run:

```bash
uvicorn src.server:app --reload --port 8000
```

### Auth endpoints

- `POST /auth/register` `{ email, password, full_name? }`
- `POST /auth/login` `{ email, password }` → `{ access_token, token_type }`
- `GET /auth/me` with header `Authorization: Bearer <token>`

### Product endpoints (auth required)

- `POST /products` create product
- `GET /products` list products (`q`, `category`, `low_stock`, `skip`, `limit`)
- `GET /products/{product_id}` get one product
- `PUT /products/{product_id}` update product (partial updates supported)
- `DELETE /products/{product_id}` delete product

