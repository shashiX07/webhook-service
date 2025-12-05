# Webhook Server

A simple webhook server built with Express.js that generates unique SHA256-based endpoints to receive and inspect incoming HTTP requests in real-time.

## Features

- 🎲 Generate unique SHA256-based webhook URLs
- 📨 Receive requests via all HTTP methods (GET, POST, PUT, DELETE, etc.)
- 👀 Real-time request monitoring with auto-refresh
- 📋 Copy webhook URL to clipboard
- 🗑️ Clear request history
- 💾 No database required - all data stored in memory
- 🎨 Beautiful, responsive UI

## Installation

```bash
npm install
```

## Usage

Start the server:

```bash
npm start
```

The server will run on `http://localhost:3000`

## How It Works

1. Open `http://localhost:3000` in your browser
2. A unique webhook URL with SHA256 hash will be automatically generated
3. Share this URL with any service that needs to send webhooks
4. View all incoming requests in real-time on the dashboard
5. Inspect headers, body, query parameters, and more

## API Endpoints

### Generate New Webhook
- **GET** `/api/generate-webhook`
- Returns a new SHA256-based webhook endpoint

### Receive Webhook
- **ALL** `/webhook/:endpoint`
- Accepts any HTTP method and stores the request data

### Get Requests
- **GET** `/api/webhook/:endpoint/requests`
- Returns all requests received for a specific endpoint

### Clear Requests
- **DELETE** `/api/webhook/:endpoint/requests`
- Clears all stored requests for an endpoint

## Tech Stack

- **Backend:** Express.js, Node.js
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Storage:** In-memory (no database)

## Notes

- All data is stored in memory and will be lost when the server restarts
- Perfect for testing, debugging, and development
- Use ngrok or similar tools to expose your local server to the internet

## License

ISC
