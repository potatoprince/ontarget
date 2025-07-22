

## API Endpoints

### 1. Get User Summary Data
```
GET /api/users/{userId}/summary
```

Response:
```json
{
  "userId": "445566",
  "balance": 19.2,
  "earned": 51.2,
  "spent": 12,
  "payout": 20,
  "paidOut": 20
}
```

### 2. Get Payout Summaries
```
GET /api/payouts
```

Response:
```json
[
  {
    "userId": "112233",
    "payoutAmount": 30
  },
  {
    "userId": "778899",
    "payoutAmount": 25
  }
]
```

### 3. Force Transaction Sync (Development)
```
POST /api/sync
```

## Architecture

- **Database**: SQLite (for development), TypeORM for data persistence
- **Background Jobs**: Cron-based transaction syncing every minute
- **External API Client**: HTTP client with fallback to mock data
- **Data Summaries**: Real-time calculation and caching of user balances

## Development

### Prerequisites
- Node.js 18+
- npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run start:dev
```

The server will start on `http://localhost:3000`

### Building for Production

```bash
npm run build
npm run start:prod
```

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Describe testing strategy

```
I’ve implemented unit tests for the core business logic. It covers:
- Service methods (getUserSummary, getPayourSUmmaries, syncTransactions)
- Edge cases (user not found, empty transaction lists)
- Business logic validation (balance calculations, transaction processing)

If I had more time using TDD, I would first create more failing tests for the required features, then implement the working core logic and finally refactor the code to improve implementation (red-green-refactor). I’d definitely focus more on integration tests and security testing because gaming economy that can be exchanged with real currency demands exceptional reliability since financial errors directly impact user trust and business revenue.

```
