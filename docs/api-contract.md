# REST API contract

Prefix: `/api`. JSON requests and responses. Money is integer centavos, currency
is always `GTQ`. User-facing error messages use Spanish; machine codes use English.
Shared Zod schemas in `packages/shared` are the executable contract.

| Method and path | Request | Success |
| --- | --- | --- |
| `GET /health` | None | 200 when database is ready |
| `GET /products` | None | 200 catalog, including unavailable products |
| `POST /products` | Name, `priceMinor`, availability | 201 persisted product |
| `PATCH /products/:id` | At least one editable product field | 200 updated product |
| `POST /orders` | `items: [{ productId, quantity }]` | 201 persisted order |
| `GET /orders/:id` | None | 200 persisted order and item snapshots |

Product fields: `id`, `name`, `priceMinor`, `available`. Product names are trimmed
and contain 1–100 characters. Prices are integers from 1 to 1,000,000,000 centavos
(Q0.01–Q10,000,000.00). Availability is boolean.
Product IDs are stable strings; generated order IDs are UUIDs.

Order fields include `id`, `totalMinor`, `currency`, UTC `createdAt`, and `items`.
Items include product ID, product-name snapshot, unit price in centavos, and quantity.
The server reads current prices during the transaction; the request accepts no prices
or totals. Reject empty carts, duplicate product IDs, more than 50 items, quantities
outside integer 1–99, unsafe totals, and unexpected request fields.

Two Espresso items at 1500 centavos plus one Latte at 2200 produce `totalMinor: 5200`
and UI display `Q52.00`. Mocha is unavailable in the deterministic seed.

| Status | Meaning |
| --- | --- |
| 400 | Malformed JSON or request validation failure |
| 404 | Product or order does not exist |
| 409 | Requested product is unavailable |
| 500 | Unexpected server failure; no internal details exposed |

Errors use a consistent code and Spanish message under an `error` object.
The API validates independently of the browser. The frontend maps unexpected
transport/server failures to a recoverable Spanish message and retains cart data.
