// Helper to convert UTC ISO string to local time string
function formatTimestampToLocal(isoString) {
  const date = new Date(isoString);
  // Format: YYYY-MM-DD HH:mm:ss (local)
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const pool = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const webhooks = {}; 

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// API: Generate a new webhook endpoint with SHA256 hash
app.get('/api/generate-webhook', (req, res) => {
  (async () => {
    const clientEndpoint = req.query.endpoint;
    if (clientEndpoint) {
      const { rows } = await pool.query('SELECT endpoint, created_at FROM webhook_endpoints WHERE endpoint = $1', [clientEndpoint]);
      if (rows.length > 0) {
        const webhookUrl = `${req.protocol}://${req.get('host')}/webhook/${clientEndpoint}`;
        return res.json({
          success: true,
          endpoint: clientEndpoint,
          url: webhookUrl,
          createdAt: formatTimestampToLocal(rows[0].created_at),
          reused: true
        });
      }
    }
    // Generate new endpoint
    const randomData = crypto.randomBytes(32).toString('hex');
    const sha256Hash = crypto.createHash('sha256').update(randomData).digest('hex');
    await pool.query('INSERT INTO webhook_endpoints(endpoint) VALUES($1) ON CONFLICT DO NOTHING', [sha256Hash]);
    const webhookUrl = `${req.protocol}://${req.get('host')}/webhook/${sha256Hash}`;
    res.json({
      success: true,
      endpoint: sha256Hash,
      url: webhookUrl,
      createdAt: formatTimestampToLocal(new Date().toISOString())
    });
  })().catch(err => {
    res.status(500).json({ success: false, error: 'Database error', details: err.message });
  });
});

// API: Receive webhook requests (supports all HTTP methods)
app.all('/webhook/:endpoint', (req, res) => {
  (async () => {
    const { endpoint } = req.params;
    // Check if endpoint exists in DB
    const { rows } = await pool.query('SELECT endpoint FROM webhook_endpoints WHERE endpoint = $1', [endpoint]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Webhook endpoint not found'
      });
    }
    // Store the incoming request
    const requestData = {
      method: req.method,
      headers: req.headers,
      body: req.body,
      query: req.query,
      params: req.params,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress
    };
    await pool.query(
      'INSERT INTO webhook_requests(endpoint, method, headers, body, query, params, timestamp, ip) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
      [endpoint, requestData.method, requestData.headers, requestData.body, requestData.query, requestData.params, requestData.timestamp, requestData.ip]
    );
    res.status(200).json({
      success: true,
      message: 'Webhook received successfully',
      timestamp: formatTimestampToLocal(requestData.timestamp)
    });
  })().catch(err => {
    res.status(500).json({ success: false, error: 'Database error', details: err.message });
  });
});

// API: Get all requests for a specific webhook endpoint
app.get('/api/webhook/:endpoint/requests', (req, res) => {
  (async () => {
    const { endpoint } = req.params;
    // Check if endpoint exists in DB
    const { rows: endpointRows } = await pool.query('SELECT endpoint FROM webhook_endpoints WHERE endpoint = $1', [endpoint]);
    if (endpointRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Webhook endpoint not found'
      });
    }
    // Get requests from DB
    const { rows: requestRows } = await pool.query('SELECT * FROM webhook_requests WHERE endpoint = $1 ORDER BY timestamp ASC', [endpoint]);
    // Convert timestamps to local time for each request
    const requestsWithLocalTime = requestRows.map(r => ({
      ...r,
      timestamp: formatTimestampToLocal(r.timestamp)
    }));
    res.json({
      success: true,
      endpoint: endpoint,
      totalRequests: requestsWithLocalTime.length,
      requests: requestsWithLocalTime
    });
  })().catch(err => {
    res.status(500).json({ success: false, error: 'Database error', details: err.message });
  });
});

// API: Clear all requests for a specific webhook endpoint
app.delete('/api/webhook/:endpoint/requests', (req, res) => {
  (async () => {
    const { endpoint } = req.params;
    // Check if endpoint exists in DB
    const { rows: endpointRows } = await pool.query('SELECT endpoint FROM webhook_endpoints WHERE endpoint = $1', [endpoint]);
    if (endpointRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Webhook endpoint not found'
      });
    }
    await pool.query('DELETE FROM webhook_requests WHERE endpoint = $1', [endpoint]);
    res.json({
      success: true,
      message: 'All requests cleared'
    });
  })().catch(err => {
    res.status(500).json({ success: false, error: 'Database error', details: err.message });
  });
});

app.delete('/api/refresh', async (req, res) => {
  try {
    // Find endpoints not used in last hour
    const unusedEndpointsQuery = `
      SELECT endpoint FROM webhook_endpoints WHERE endpoint NOT IN (
        SELECT DISTINCT endpoint FROM webhook_requests WHERE timestamp > NOW() - INTERVAL '1 hour'
      )
      AND created_at < NOW() - INTERVAL '1 hour';
    `;
    const { rows } = await pool.query(unusedEndpointsQuery);
    const endpointsToDelete = rows.map(r => r.endpoint);
    if (endpointsToDelete.length === 0) {
      return res.json({ success: true, deleted: [], message: 'No unused endpoints found.' });
    }
    await pool.query('DELETE FROM webhook_requests WHERE endpoint = ANY($1)', [endpointsToDelete]);
    await pool.query('DELETE FROM webhook_endpoints WHERE endpoint = ANY($1)', [endpointsToDelete]);
    res.json({ success: true, deleted: endpointsToDelete, message: `${endpointsToDelete.length} endpoints deleted.` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Database error', details: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`[+] Webhook server running on port ${PORT}`);
  console.log(`[+] Access the app at http://localhost:${PORT}`);
});
