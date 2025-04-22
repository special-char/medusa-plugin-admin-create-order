# Admin Create Order Plugin

A plugin that provides administrative capabilities to create orders through a dedicated endpoint. This plugin extends the core functionality by adding admin-specific order creation features.

## Plugin Structure

```
src/
├── admin/         # Admin-specific implementations
├── api/           # API endpoint handlers
│   └── admin/     
│       └── create-order/  # Order creation endpoint logic
├── modules/       # Plugin modules and business logic
├── providers/     # Plugin service providers
├── subscribers/   # Event subscribers
├── workflows/     # Order creation workflows
└── jobs/         # Background processing jobs
```

## Features

- Secure admin-only endpoint for order creation
- Validation of order data
- Integration with existing order management system
- Event-driven architecture for order processing
- Background job support for async operations

## Installation

1. Install the plugin in your project:

```bash
npm install @tsc_tech/medusa-admin-create-orde
# or
yarn add @tsc_tech/medusa-admin-create-orde
```

2. Register the plugin in your application:

```typescript
import { AdminCreateOrderPlugin } from '@tsc_tech/medusa-admin-create-orde'

// Register plugin
const plugin = new AdminCreateOrderPlugin()
await app.registerPlugin(plugin)
```

## Configuration

Add the following to your configuration file:

```typescript
{
  "plugins": {
     {
      resolve: "@tsc_tech/medusa-admin-create-orde",
      options: {},
    },
  }
}
```

## API Reference

### Create Order Endpoint

**Route:** `POST /admin/orders`

**Required Headers:**
- `Authorization`: Bearer token with admin privileges

**Request Body:**
```json
{
  "order": {
    "customerId": "string",
    "items": [
      {
        "productId": "string",
        "quantity": number,
        "price": number
      }
    ],
    "shippingAddress": {
      "street": "string",
      "city": "string",
      "state": "string",
      "zipCode": "string",
      "country": "string"
    },
    "notes": "string" // Optional
  }
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "string",
    "status": "string",
    "createdAt": "ISO-8601 timestamp",
    "total": number
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string"
  }
}
```

## Development

For plugin development:

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build plugin
npm run build
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[Your License Type] © [Year] [Your Organization]
