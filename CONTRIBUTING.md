# Contributing

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Set up Neon database:
   - Create a free account at https://neon.tech
   - Create a new project
   - Copy the connection string to your `.env` file as `DATABASE_URL`

   **Alternative:** For local development, you can use Docker:
   ```bash
   docker-compose up -d postgres
   # Then use: DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pushindexer
   ```

4. Run database migrations:
   ```bash
   npm run db:migrate
   ```
   
   **Note:** For Neon, you can also run migrations via the Neon console SQL editor by copying `src/db/schema.sql`.

5. Deploy facilitator contract:
```bash
npm run compile
npm run deploy
```

6. Update `.env` with the deployed contract address

7. Start the indexer:
```bash
npm run indexer
```

8. Start the API (in another terminal):
```bash
npm run api
```

## Code Style

- Use TypeScript for all new code
- Follow existing code patterns
- Add JSDoc comments for public functions
- Use the logger utility for all logging
- Handle errors gracefully with proper logging

## Testing

Run tests with:
```bash
npm test
```

## Pull Requests

1. Create a feature branch
2. Make your changes
3. Ensure all tests pass
4. Update documentation if needed
5. Submit a pull request

