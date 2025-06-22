# GoldyQuote

A modern auto insurance comparison tool that automates the quote collection process across multiple insurance carriers using headless browser automation.

## 🏗️ Architecture

GoldyQuote is built as a monorepo with two main components:

### Frontend (`src/`)
- **React + TypeScript SPA** that provides a clean, unified user interface
- Collects user data once and streams progress via WebSockets
- Responsive design optimized for mobile and desktop

### Backend (`server/`)
- **Express.js server** with WebSocket support for real-time updates
- **Playwright-based automation** using Chrome (stable channel)
- **Multi-carrier support** with unified data collection
- **Memory-efficient browser management** with single browser instance → multiple tabs

## 🚀 Features

### Automation Engine
- **Playwright Integration**: Migrated from Puppeteer for better reliability and performance
- **Single Browser Instance**: Efficient resource usage with multiple browser contexts
- **Chrome Channel**: Uses system Chrome instead of bundled Chromium
- **Auto-retry Logic**: Robust error handling with automatic retries
- **Smart Locators**: Playwright's modern locator strategy for better element detection

### Carrier Coverage
- ✅ **GEICO** - Fully implemented
- ✅ **Progressive** - Fully implemented  
- ✅ **State Farm** - Fully implemented
- ✅ **Liberty Mutual** - Fully implemented

### Data Collection
- **Unified Schema**: Collect user data once across all carriers
- **Smart Field Mapping**: Automatic mapping to carrier-specific field names
- **Data Validation**: Client and server-side validation
- **Memory Caching**: Efficient user data storage and reuse

### Developer Experience
- **TypeScript**: Full type safety across frontend and backend
- **Real-time Updates**: WebSocket integration for live progress tracking
- **Comprehensive Testing**: Playwright Test suite with Docker support
- **CI/CD Pipeline**: GitHub Actions with automated testing and deployment
- **Docker Support**: Production-ready containerization

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ and pnpm
- Google Chrome (stable) installed system-wide
- Docker (optional, for containerized deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/goldy-quote.git
cd goldy-quote

# Install frontend dependencies
pnpm install

# Install backend dependencies
cd server && pnpm install

# Install Playwright
pnpm exec playwright install chromium --with-deps
```

### Development

```bash
# Start both frontend and backend in development mode
pnpm run dev:all

# Or start them separately:
pnpm run dev          # Frontend only (http://localhost:5173)
pnpm run dev:server   # Backend only (http://localhost:3001)
```

### Environment Configuration

Create `server/.env`:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Browser Configuration  
HEADFUL=1                    # Set to 0 for headless mode
BROWSER_TIMEOUT=60000        # Global browser timeout (60s)
STEP_TIMEOUT=15000           # Per-step timeout (15s)

# Directories
SCREENSHOTS_DIR=./screenshots
```

## 📡 API Reference

### Multi-Carrier Workflow

#### 1. Start Multi-Carrier Process
```http
POST /api/quotes/start
Content-Type: application/json

{
  "carriers": ["geico", "progressive", "statefarm", "libertymutual"]
}
```

#### 2. Submit Unified User Data
```http
POST /api/quotes/{taskId}/data
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "555-123-4567",
  "dateOfBirth": "1990-01-01",
  "zipCode": "12345",
  "streetAddress": "123 Main St",
  "city": "Anytown", 
  "state": "CA",
  "vehicleYear": "2020",
  "vehicleMake": "Honda",
  "vehicleModel": "Civic"
}
```

#### 3. Start Individual Carrier Process
```http
POST /api/quotes/{taskId}/carriers/{carrier}/start
```

#### 4. Process Carrier Steps
```http
POST /api/quotes/{taskId}/carriers/{carrier}/step
Content-Type: application/json

{
  "additionalData": "if needed"
}
```

#### 5. Check Status
```http
GET /api/quotes/{taskId}/carriers/{carrier}/status
```

#### 6. Cleanup
```http
DELETE /api/quotes/{taskId}/carriers/{carrier}  # Single carrier
DELETE /api/quotes/{taskId}                     # Entire task
```

### Real-time Updates via WebSocket

Connect to `ws://localhost:3001` to receive real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'task_started':
      console.log('Task started:', data.taskId);
      break;
    case 'carrier_started':
      console.log('Carrier started:', data.carrier);
      break;
    case 'quote_completed':
      console.log('Quote completed:', data.quote);
      break;
  }
};
```

## 🧪 Testing

### Running Tests

```bash
# Run Playwright tests
cd server && pnpm run test

# Run tests with UI (interactive mode)
pnpm run test:ui

# Run tests in debug mode
pnpm run test:debug
```

### Test Structure

```
server/tests/
├── e2e/
│   ├── multi-carrier.spec.ts    # End-to-end carrier tests
│   └── api.spec.ts              # API endpoint tests
├── setup/
│   ├── global-setup.ts          # Test environment setup
│   └── global-teardown.ts       # Test cleanup
└── fixtures/                    # Mock data and test fixtures
```

## 🐳 Docker Deployment

### Build and Run

```bash
# Build the Docker image
cd server && docker build -t goldy-quote-server .

# Run the container
docker run -p 3001:3001 \
  -e HEADFUL=0 \
  -e NODE_ENV=production \
  goldy-quote-server
```

### Docker Compose

```yaml
version: '3.8'
services:
  server:
    build: ./server
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - HEADFUL=0
      - BROWSER_TIMEOUT=60000
    volumes:
      - ./screenshots:/app/screenshots
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## 🏛️ Project Structure

```
goldy-quote/
├── src/                          # Frontend React application
│   ├── components/
│   │   ├── common/              # Reusable UI components
│   │   ├── home/                # Homepage components
│   │   ├── layout/              # Layout components
│   │   └── quotes/              # Quote-related components
│   ├── pages/                   # Route components
│   ├── types/                   # TypeScript type definitions
│   └── data/                    # Mock data for development
├── server/                      # Backend Node.js application
│   ├── src/
│   │   ├── agents/              # Carrier automation agents
│   │   │   ├── BaseCarrierAgent.ts
│   │   │   ├── geicoAgent.ts
│   │   │   ├── progressiveAgent.ts
│   │   │   ├── stateFarmAgent.ts
│   │   │   ├── libertyMutualAgent.ts
│   │   │   └── index.ts
│   │   ├── browser/             # Browser management
│   │   │   └── BrowserManager.ts
│   │   ├── helpers/             # Automation helpers
│   │   │   └── locators.ts
│   │   ├── schemas/             # Data schemas
│   │   │   └── unifiedSchema.ts
│   │   ├── services/            # Business logic
│   │   │   └── TaskManager.ts
│   │   ├── types/               # TypeScript definitions
│   │   │   └── index.ts
│   │   ├── config.ts            # Configuration
│   │   └── index.ts             # Server entry point
│   ├── tests/                   # Playwright tests
│   ├── playwright.config.ts     # Playwright configuration
│   └── Dockerfile              # Container definition
├── .github/workflows/           # CI/CD pipelines
└── docs/                        # Additional documentation
```

## 🔧 Adding a New Carrier

1. **Create Agent Class**:
```typescript
// server/src/agents/newCarrierAgent.ts
import { BaseCarrierAgent } from './BaseCarrierAgent.js';

export class NewCarrierAgent extends BaseCarrierAgent {
  readonly name = 'newcarrier';
  
  async start(context: CarrierContext): Promise<CarrierResponse> {
    // Implementation
  }
  
  async step(context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    // Implementation  
  }
}
```

2. **Register Agent**:
```typescript
// server/src/agents/index.ts
import { newCarrierAgent } from './newCarrierAgent.js';

export const carrierAgents: Record<string, CarrierAgent> = {
  // existing carriers...
  newcarrier: newCarrierAgent,
};
```

3. **Add Tests**:
```typescript
// server/tests/e2e/newcarrier.spec.ts
test('should handle NewCarrier quote process', async ({ request }) => {
  // Test implementation
});
```

## 🔒 Security

- **Input Validation**: Comprehensive validation on all user inputs
- **Environment Variables**: Secure configuration management
- **Dependency Scanning**: Automated vulnerability scanning in CI
- **Container Security**: Minimal attack surface with Alpine-based images
- **Rate Limiting**: API rate limiting to prevent abuse

## 📊 Monitoring

### Health Checks
- `GET /api/health` - Application health status
- `GET /api/browser/status` - Browser manager status  
- `GET /api/tasks` - Active task monitoring

### Logging
- Structured logging with Winston
- Request/response logging
- Browser automation step tracking
- Error reporting with stack traces

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- **TypeScript**: All code must be properly typed
- **Testing**: Add tests for new features
- **Documentation**: Update README and inline docs
- **Linting**: Follow ESLint configuration
- **Commits**: Use conventional commit format

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- **Issues**: [GitHub Issues](https://github.com/your-org/goldy-quote/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/goldy-quote/discussions)
- **Wiki**: [Project Wiki](https://github.com/your-org/goldy-quote/wiki)

---

Built with ❤️ using React, Node.js, and Playwright 