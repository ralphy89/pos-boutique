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

### Database on an external drive or network share

The API uses SQLite via `DATABASE_URL`. The application code can stay on the PC while the **`.db` file lives elsewhere** (second disk, USB key, NAS) so you can swap machines or recover after hardware failure—provided you still have that file and backups.

1. Create a folder on the external location (e.g. `D:\POS-Backup\`).
2. Set in `.env` (use forward slashes):

   `DATABASE_URL=sqlite:///D:/POS-Backup/pos_boutique.db`

3. For a UNC path (SMB share), use four slashes after the scheme, e.g.  
   `DATABASE_URL=sqlite:////SERVER/Share/pos_boutique.db`

**Important:** Keep the volume **mounted and connected** while the server runs. Disconnecting during a write can corrupt SQLite. Network paths work for light single-user use; for several concurrent writers, prefer PostgreSQL. Schedule **regular copies** of the `.db` file (or use a proper backup tool) in addition to storing it externally.

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

