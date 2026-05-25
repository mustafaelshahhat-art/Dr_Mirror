# Dr Mirror WhatsApp Service

Standalone Baileys runtime for Dr Mirror WhatsApp transactional notifications. Deploy this service separately from the .NET API, for example on Render Free.

## Deployment

1. Deploy the Dr Mirror backend separately.
2. Create a MongoDB Atlas database for WhatsApp Baileys auth/session state.
3. Deploy this `whatsapp-service/` folder to Render Free.
4. Set the Render environment variables from `.env.example`.
5. Set the .NET backend variables:
   - `WhatsApp__Enabled=true`
   - `WhatsApp__ServiceUrl=https://<your-render-service>.onrender.com`
   - `WhatsApp__InternalApiKey=<same value as INTERNAL_API_KEY>`
   - `WhatsApp__TimeoutSeconds=10`
6. Pair WhatsApp using the protected pairing endpoint: `GET /pair` or `GET /qr` with `Authorization: Bearer <PAIRING_ADMIN_TOKEN>`.

## Local Run

```powershell
cd whatsapp-service
npm install
npm start
```

`GET /health` works without the .NET backend. For WhatsApp pairing/sending, configure `MONGODB_URI`, `INTERNAL_API_KEY`, and `PAIRING_ADMIN_TOKEN`.

## Endpoints

- `GET /health` public liveness endpoint.
- `GET /status` protected by `PAIRING_ADMIN_TOKEN` or `INTERNAL_API_KEY`.
- `GET /pair` protected by `PAIRING_ADMIN_TOKEN` or `INTERNAL_API_KEY`; returns `{ qrDataUri, state }`.
- `GET /qr` alias for `/pair`.
- `POST /send-message` protected by `INTERNAL_API_KEY`; body `{ "phone": "+201234567890", "message": "..." }`.
- `POST /send-template` protected by `INTERNAL_API_KEY`; body `{ "phone": "...", "template": "orderStatusChanged", "data": { "orderNumber": "DM-...", "status": "Shipped" } }`.

## Session Storage

Baileys auth state is stored only in MongoDB Atlas through `MONGODB_URI`. This service does not persist session data to the Render filesystem and does not write session data to Dr Mirror SQL Server.

## Render Free Notes

- Uses `process.env.PORT`.
- Handles cold starts by reconnecting Baileys on boot.
- Handles graceful shutdown on `SIGTERM` and `SIGINT`.
- Does not rely on local persistent storage.
- Free instances can sleep; the Dr Mirror backend outbox will retry failed sends.
