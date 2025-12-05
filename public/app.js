let currentEndpoint = null;
let currentWebhookUrl = null;
let pollInterval = null;

// DOM Elements
const generateBtn = document.getElementById('generateBtn');
const copyBtn = document.getElementById('copyBtn');
const refreshBtn = document.getElementById('refreshBtn');
const clearBtn = document.getElementById('clearBtn');
const webhookUrlInput = document.getElementById('webhookUrl');
const requestsList = document.getElementById('requestsList');
const totalRequestsEl = document.getElementById('totalRequests');
const lastRequestTimeEl = document.getElementById('lastRequestTime');

// Generate new webhook endpoint
async function generateWebhook() {
    try {
        // Try to send stored endpoint to backend
        const storedEndpoint = localStorage.getItem('webhookEndpoint');
        let url = '/api/generate-webhook';
        if (storedEndpoint) {
            url += `?endpoint=${storedEndpoint}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        if (data.success) {
            currentEndpoint = data.endpoint;
            currentWebhookUrl = data.url;
            webhookUrlInput.value = data.url;
            copyBtn.disabled = false;
            clearBtn.disabled = false;
            // Save to localStorage
            localStorage.setItem('webhookEndpoint', currentEndpoint);
            localStorage.setItem('webhookUrl', currentWebhookUrl);
            // Start polling for requests
            startPolling();
            // Clear previous requests
            requestsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <p>No requests received yet</p>
                    <p class="empty-subtitle">Send requests to your webhook URL to see them here</p>
                </div>
            `;
            totalRequestsEl.textContent = '0';
            lastRequestTimeEl.textContent = '-';
        }
    } catch (error) {
        console.error('Error generating webhook:', error);
        alert('Failed to generate webhook endpoint');
    }
}

// Copy webhook URL to clipboard
function copyToClipboard() {
    webhookUrlInput.select();
    document.execCommand('copy');
    
    const originalText = copyBtn.textContent;
    copyBtn.textContent = 'Copied!';
    
    setTimeout(() => {
        copyBtn.textContent = originalText;
    }, 2000);
}

// Fetch requests for current endpoint
async function fetchRequests() {
    if (!currentEndpoint) return;
    
    try {
        const response = await fetch(`/api/webhook/${currentEndpoint}/requests`);
        const data = await response.json();
        
        if (data.success) {
            updateStats(data);
            displayRequests(data.requests);
        }
    } catch (error) {
        console.error('Error fetching requests:', error);
    }
}

// Update statistics
function updateStats(data) {
    totalRequestsEl.textContent = data.totalRequests;
    
    if (data.requests.length > 0) {
        const lastRequest = data.requests[data.requests.length - 1];
        lastRequestTimeEl.textContent = formatTime(lastRequest.timestamp);
    } else {
        lastRequestTimeEl.textContent = '-';
    }
}

// Display requests in the list
function displayRequests(requests) {
    if (requests.length === 0) {
        requestsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fa-solid fa-envelope-open-text"></i></div>
                <p>No requests received yet</p>
                <p class="empty-subtitle">Send requests to your webhook URL to see them here</p>
            </div>
        `;
        return;
    }
    
    // Track expanded/collapsed state by request index
    if (!window._expandedRequests) window._expandedRequests = {};
    const expandedRequests = window._expandedRequests;

    // Reverse to show newest first
    const reversedRequests = [...requests].reverse();
    requestsList.innerHTML = '';
    reversedRequests.forEach((req, index) => {
        const isLatest = index === 0;
        const item = document.createElement('div');
        item.className = 'request-item';

        // Header
        const header = document.createElement('div');
        header.className = 'request-header';
        header.innerHTML = `
            <div>
                <span class="request-method method-${req.method}">${req.method}</span>
                <span class="request-ip">from ${req.ip}</span>
            </div>
            <div class="request-time">${formatTimestamp(req.timestamp)}</div>
        `;

        // Collapse/expand button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'btn btn-small';
        const expanded = expandedRequests[index] ?? isLatest;
        toggleBtn.innerHTML = expanded
            ? '<i class="fa-solid fa-chevron-down"></i> Collapse'
            : '<i class="fa-solid fa-chevron-right"></i> Expand';
        toggleBtn.style.marginLeft = '10px';
        header.appendChild(toggleBtn);

        // Details
        const details = document.createElement('div');
        details.className = 'request-details';
        details.style.display = expanded ? 'block' : 'none';
        details.innerHTML = `
            ${req.query && Object.keys(req.query).length > 0 ? `
                <div class="detail-section">
                    <div class="detail-title">Query Parameters:</div>
                    <div class="detail-content">${JSON.stringify(req.query, null, 2)}</div>
                </div>
            ` : ''}
            ${req.body && Object.keys(req.body).length > 0 ? `
                <div class="detail-section">
                    <div class="detail-title">Request Body:</div>
                    <div class="detail-content">${JSON.stringify(req.body, null, 2)}</div>
                </div>
            ` : ''}
            <div class="detail-section">
                <div class="detail-title">Headers:</div>
                <div class="detail-content">${JSON.stringify(req.headers, null, 2)}</div>
            </div>
        `;

        // Toggle logic
        toggleBtn.addEventListener('click', () => {
            if (details.style.display === 'none') {
                details.style.display = 'block';
                toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-down"></i> Collapse';
                expandedRequests[index] = true;
            } else {
                details.style.display = 'none';
                toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i> Expand';
                expandedRequests[index] = false;
            }
        });

        item.appendChild(header);
        item.appendChild(details);
        requestsList.appendChild(item);
    });
}

// Clear all requests
async function clearRequests() {
    if (!currentEndpoint) return;
    
    if (!confirm('Are you sure you want to clear all requests?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/webhook/${currentEndpoint}/requests`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            fetchRequests();
        }
    } catch (error) {
        console.error('Error clearing requests:', error);
        alert('Failed to clear requests');
    }
}

// Start polling for new requests
function startPolling() {
    // Clear existing interval
    if (pollInterval) {
        clearInterval(pollInterval);
    }
    
    // Poll every 2 seconds
    pollInterval = setInterval(fetchRequests, 2000);
    
    // Fetch immediately
    fetchRequests();
}

// Format timestamp
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Format time for last request
function formatTime(timestamp) {
    // Always add 5 hours 30 minutes to the timestamp
    let date = new Date(timestamp);
    if (isNaN(date.getTime())) {
        date = new Date(Date.parse(timestamp));
    }
    // Add 5 hours 30 minutes (19800000 ms)
    date = new Date(date.getTime() + 19800000);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // seconds
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    // Show local time string for older requests
    return date.toLocaleString();
}

// Event Listeners
generateBtn.addEventListener('click', generateWebhook);
copyBtn.addEventListener('click', copyToClipboard);
refreshBtn.addEventListener('click', fetchRequests);
clearBtn.addEventListener('click', clearRequests);

// Initial load - generate webhook automatically
window.addEventListener('load', () => {
    // If no endpoint in localStorage, enable Generate button and clear input
    const storedEndpoint = localStorage.getItem('webhookEndpoint');
    if (!storedEndpoint) {
        webhookUrlInput.value = "Click 'Generate' to create your webhook URL";
        copyBtn.disabled = true;
        clearBtn.disabled = true;
    }
    // Always allow user to generate
    generateBtn.disabled = false;
    generateBtn.addEventListener('click', generateWebhook);
    // Try to sync with backend
    generateWebhook();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (pollInterval) {
        clearInterval(pollInterval);
    }
});
