# TapTest Server

Backend API server for the TapTest typing speed test application.

## Features

- **Test Results API**: Store and retrieve typing test results
- **User Statistics**: Calculate performance metrics and trends
- **Leaderboards**: Global and difficulty-based rankings
- **SQLite Database**: Persistent data storage
- **TypeScript**: Full type safety
- **Data Validation**: Request validation with Zod schemas

## API Endpoints

### Test Results

#### POST /api/tests
Save a new test result.

**Request Body:**
```json
{
  "username": "john_doe",
  "wpm": 85.5,
  "cpm": 427,
  "accuracy": 96.8,
  "total_time": 60000,
  "difficulty": "medium",
  "total_characters": 450,
  "correct_characters": 436,
  "incorrect_characters": 14,
  "test_text": "optional text content"
}
```

#### GET /api/tests?username=XYZ
Get test results for a user with optional filtering.

**Query Parameters:**
- `username` (required): Username to fetch results for
- `limit` (optional, default: 50): Number of results per page
- `offset` (optional, default: 0): Number of results to skip
- `difficulty` (optional): Filter by difficulty level
- `start_date` (optional): Filter results after this date
- `end_date` (optional): Filter results before this date

### Statistics (Future Use)

#### GET /api/tests/stats/:username
Get comprehensive statistics for a user.

#### GET /api/tests/leaderboard
Get leaderboard rankings.

### Health Check

#### GET /health
Check server status and uptime.

## Database Schema

### users
- `id`: Primary key
- `username`: Unique username
- `password_hash`: Hashed password (for username/password auth)
- `google_id`: Google OAuth ID (for Google auth)
- `created_at`: Registration timestamp
- `updated_at`: Last update timestamp

### test_results
- `id`: Primary key
- `username`: Foreign key to users.username
- `wpm`: Words per minute
- `cpm`: Characters per minute
- `accuracy`: Accuracy percentage
- `total_time`: Test duration in milliseconds
- `difficulty`: Test difficulty level
- `total_characters`: Total characters in test
- `correct_characters`: Correctly typed characters
- `incorrect_characters`: Incorrectly typed characters
- `test_text`: Optional test content
- `created_at`: Test completion timestamp

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
cd server
npm install
```

### Scripts
```bash
# Development (with hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run both server and frontend
npm run dev:full
```

### Environment Variables

Create a `.env` file in the server directory:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
DATABASE_PATH=./database.sqlite

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

## Production Deployment

1. **Build the server:**
   ```bash
   npm run build
   ```

2. **Set environment variables:**
   ```bash
   export NODE_ENV=production
   export PORT=3001
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

## Database Migrations

The database schema is automatically initialized when the server starts. For production deployments, consider using proper database migration tools.

## Security Considerations

- Input validation with Zod schemas
- CORS configuration for allowed origins
- SQL injection prevention with parameterized queries
- Rate limiting (TODO)
- Authentication middleware (TODO)

## Future Enhancements

- [ ] User authentication with JWT
- [ ] Rate limiting for API endpoints
- [ ] Redis caching for leaderboards
- [ ] Database migrations system
- [ ] Comprehensive logging
- [ ] API documentation with Swagger
- [ ] Unit and integration tests