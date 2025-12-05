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

### 1. Generate New Webhook
**GET** `/api/generate-webhook`

**Request:**
```
GET /api/generate-webhook
```
Optionally, reuse an existing endpoint:
```
GET /api/generate-webhook?endpoint=<existing-endpoint>
```

**Response:**
```json
{
	"success": true,
	"endpoint": "<sha256-endpoint>",
	"url": "http://localhost:3000/webhook/<sha256-endpoint>",
	"createdAt": "2025-12-06T12:34:56.789Z",
	"reused": false
}
```

---

### 2. Receive Webhook
**ALL HTTP METHODS** `/webhook/:endpoint`

**Request:**
```
POST /webhook/<endpoint>
Content-Type: application/json

{
	"key": "value"
}
```

**Response:**
```json
{
	"success": true,
	"message": "Webhook received successfully",
	"timestamp": "2025-12-06T12:34:56.789Z"
}
```

---

### 3. Get Requests for Endpoint
**GET** `/api/webhook/:endpoint/requests`

**Request:**
```
GET /api/webhook/<endpoint>/requests
```

**Response:**
```json
{
	"success": true,
	"endpoint": "<endpoint>",
	"totalRequests": 2,
	"requests": [
		{
			"method": "POST",
			"headers": { ... },
			"body": { ... },
			"query": { ... },
			"params": { ... },
			"timestamp": "2025-12-06T12:34:56.789Z",
			"ip": "127.0.0.1"
		},
		// ...more requests
	]
}
```

---

### 4. Clear Requests for Endpoint
**DELETE** `/api/webhook/:endpoint/requests`

**Request:**
```
DELETE /api/webhook/<endpoint>/requests
```

**Response:**
```json
{
	"success": true,
	"message": "All requests cleared"
}
```

## Tech Stack

- **Backend:** Express.js, Node.js
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Storage:** In-memory (no database)

## Notes

- Perfect for testing, debugging, and development
- Use ngrok or similar tools to expose your local server to the internet

## License

ISC
