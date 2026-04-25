# zero-backend

API Node/Express do projeto Zero.

## Stack

- Node + Express
- MongoDB + Mongoose
- Clerk para autenticação
- Mapbox Directions para rotas sob demanda
- GeoJSON como formato canônico de geodados
- Socket.IO para tracking em tempo real
- Jest + Supertest para testes

## Autenticação

- a autenticação do backend é `100% Clerk`
- o backend não emite JWT próprio e não mantém fluxo local de senha com `bcrypt`
- variáveis como `JWT_SECRET`, `JWT_EXPIRES_IN` e `BCRYPT_ROUNDS` foram removidas do setup porque não fazem parte da arquitetura atual

## Endpoints base

- Base local: `http://localhost:PORT/api`
- Health check: `GET /health`
- Principais recursos:
  - `/api/users`
  - `/api/vendors`
  - `/api/products`
  - `/api/orders`
  - `/api/deliveries`
  - `/api/drivers`
  - `/api/notifications`
  - `/api/routes`
  - `/api/personal-delivery`
  - `/api/promotions`
  - `/api/coupons`
  - `/api/loyalty`

## Scripts

- `npm run build`
- `npm test -- --runInBand`
- `npm run dev`
- `npm run smoke:realtime`

## Tracking Geoespacial

O backend está preparado com a estratégia de baixo custo:

- `Mapbox` apenas para geometria de rota quando necessário
- `GeoJSON` como formato de saída e persistência complementar
- `Socket.IO` para streaming de snapshot/update em tempo real
- camada de sync com fallback automático `memory -> Redis`

Arquivos centrais:

- [src/integrations/mapbox/mapbox-directions.service.ts](/Users/fumanefilms/Desktop/Desktop/zero/zero-backend/src/integrations/mapbox/mapbox-directions.service.ts:1)
- [src/core/delivery/delivery-tracking.service.ts](/Users/fumanefilms/Desktop/Desktop/zero/zero-backend/src/core/delivery/delivery-tracking.service.ts:1)
- [src/realtime/tracking.gateway.ts](/Users/fumanefilms/Desktop/Desktop/zero/zero-backend/src/realtime/tracking.gateway.ts:1)
- [src/realtime/tracking-sync.service.ts](/Users/fumanefilms/Desktop/Desktop/zero/zero-backend/src/realtime/tracking-sync.service.ts:1)
- [src/utils/geojson.ts](/Users/fumanefilms/Desktop/Desktop/zero/zero-backend/src/utils/geojson.ts:1)

Endpoint principal:

- `GET /api/deliveries/:id/track`
  Retorna snapshot rico com `geojson`, `tracking` e configuração `realtime`.

Sala realtime:

- `delivery:<deliveryId>`
- `order:<orderId>`

Multi-instância:

- sem `REDIS_URL`, o realtime funciona em memória local
- com `REDIS_URL`, snapshots passam a ser sincronizados via Redis e o `Socket.IO` usa adapter distribuído

## Setup operacional local

Arquivo de ambiente:

- copie [zero-backend/.env.example](/Users/fumanefilms/Desktop/Desktop/zero/zero-backend/.env.example:1) para `.env` quando quiser rodar fora do Docker

Stack local com containers:

- [docker-compose.yml](/Users/fumanefilms/Desktop/Desktop/zero/docker-compose.yml:1) sobe `mongo + redis + zero-backend`
- comando esperado: `docker compose up --build`
- backend publicado em `http://localhost:4203`

Smoke test do tracking:

- defina `SMOKE_DELIVERY_ID`
- se a rota estiver protegida, defina também `SMOKE_AUTH_TOKEN`
- execute `npm run smoke:realtime`
- o script valida `GET /api/deliveries/:id/track`, conecta no `Socket.IO` e tenta receber `tracking:snapshot` ou `tracking:update`

## Notas de ambiente

- Em `NODE_ENV=test`, a inicialização do Clerk e da conexão principal com Mongo é pulada para permitir testes de integração com `mongodb-memory-server`.
- Em produção, configure corretamente:
  - `MONGODB_URI`
  - `CLERK_SECRET_KEY`
  - `CLERK_PUBLISHABLE_KEY`
  - `ALLOWED_ORIGINS` ou `CORS_ORIGIN`
  - `MAPBOX_ACCESS_TOKEN`
  - `PUBLIC_API_URL` ou `PUBLIC_APP_URL`
  - `REDIS_URL` para multi-instância
  - opcionalmente `TRACKING_SYNC_ADAPTER=memory`

## Estado atual

- Build TypeScript verde
- Testes Jest verdes
- Contrato de usuários alinhado com `userId` e compatibilidade com `clerkId`
