# GoldyQuote - Auto Insurance Comparison Tool

GoldyQuote is a web application that allows users to compare auto insurance quotes from multiple providers in real-time. The application uses a headless browser automation approach to scrape data from insurance provider websites.

## Features

- Real-time quote retrieval from multiple insurance providers
- Step-by-step form process that matches the provider's requirements
- Quote comparison interface
- Automatic form filling based on user-provided information

## Project Structure

The project is split into two main parts:

1. **Frontend**: React application with TypeScript and Tailwind CSS
2. **Backend**: Node.js server that handles browser automation using Puppeteer

## Setup

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Chrome/Chromium browser (for Puppeteer)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/goldy-quote.git
   cd goldy-quote
   ```

2. Install frontend dependencies:
   ```
   npm install
   ```

3. Install backend dependencies:
   ```
   cd server
   npm install
   ```

### Environment Setup

1. Create a `.env` file in the server directory:
   ```
   PORT=3001
   NODE_ENV=development
   ```

### Running the Application

1. Start the backend server:
   ```
   cd server
   npm run dev
   ```

2. Start the frontend development server (in a separate terminal):
   ```
   npm run dev
   ```

3. Open your browser and go to http://localhost:5173

## How It Works

1. The user navigates to the quote form page and selects insurance providers
2. For each provider, our backend launches a Puppeteer browser instance
3. The browser navigates to the provider's website and extracts the form fields
4. The frontend displays these fields to the user
5. As the user fills out each step, the data is sent to the browser automation process
6. The automation process fills in the forms on the provider's website
7. Once the quote is obtained, it's returned to the frontend for display
8. The user can compare quotes from different providers

## Adding More Providers

To add more insurance providers:

1. Create a new agent file in `server/src/agents/`
2. Implement the same interface as the Geico agent
3. Add the new provider to the frontend selection

## Technologies Used

- React
- TypeScript
- Tailwind CSS
- Express.js
- Puppeteer
- Vite

## License

MIT 