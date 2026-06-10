import axios from 'axios';
import { MOCK_DATA } from './mockData.js';

const USE_MOCK = true; // flip to false when backend is running

const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 8000,
});

/**
 * Simulate a network delay for mock data (300ms)
 */
const mockDelay = () => new Promise((r) => setTimeout(r, 300));

/**
 * Format an INR value using the Indian numbering system (lakhs/crores)
 * @param {number} value - Amount in INR
 * @returns {string} Formatted string like "₹18.5L" or "₹1.2Cr"
 */
export function formatINR(value) {
  if (value == null || isNaN(value)) return '₹0';
  const absVal = Math.abs(value);
  if (absVal >= 10000000) {
    return `₹${(value / 10000000).toFixed(1)}Cr`;
  }
  if (absVal >= 100000) {
    return `₹${(value / 100000).toFixed(1)}L`;
  }
  if (absVal >= 1000) {
    return `₹${value.toLocaleString('en-IN')}`;
  }
  return `₹${value}`;
}

/**
 * Format an ISO timestamp into a relative time string
 * @param {string} isoString - ISO 8601 timestamp
 * @returns {string} Relative time like "2 min ago" or absolute "10 Jun, 06:04"
 */
export function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month}, ${hours}:${mins}`;
}

/**
 * Upload parsed CSV shipment data
 * @param {Array} data - Array of shipment objects
 * @returns {Promise<Array>} Uploaded/processed shipments
 */
export async function uploadShipments(data) {
  if (USE_MOCK) {
    await mockDelay();
    return data;
  }
  try {
    const res = await api.post('/shipments', data);
    return res.data;
  } catch (err) {
    throw new Error(`Upload failed: ${err.response?.data?.detail || err.message}`, { cause: err });
  }
}

/**
 * Fetch current alerts
 * @returns {Promise<Array>} Array of alert objects
 */
export async function fetchAlerts() {
  if (USE_MOCK) {
    await mockDelay();
    return MOCK_DATA.alerts;
  }
  try {
    const res = await api.get('/alerts');
    return res.data;
  } catch (err) {
    throw new Error(`Failed to fetch alerts: ${err.response?.data?.detail || err.message}`, { cause: err });
  }
}

/**
 * Fetch live signal feed
 * @returns {Promise<Array>} Array of signal objects
 */
export async function fetchSignals() {
  if (USE_MOCK) {
    await mockDelay();
    return MOCK_DATA.signals;
  }
  try {
    const res = await api.get('/signals');
    return res.data;
  } catch (err) {
    throw new Error(`Failed to fetch signals: ${err.response?.data?.detail || err.message}`, { cause: err });
  }
}

/**
 * Fetch shipments list
 * @returns {Promise<Array>} Array of shipment objects
 */
export async function fetchShipments() {
  if (USE_MOCK) {
    await mockDelay();
    return MOCK_DATA.shipments;
  }
  try {
    const res = await api.get('/shipments');
    return res.data;
  } catch (err) {
    throw new Error(`Failed to fetch shipments: ${err.response?.data?.detail || err.message}`, { cause: err });
  }
}

/**
 * Generate a forwarder brief for a specific alert
 * @param {string} alertId - The alert ID to generate a brief for
 * @returns {Promise<string>} The generated brief text
 */
export async function generateBrief(alertId) {
  if (USE_MOCK) {
    await mockDelay();
    return MOCK_DATA.briefText;
  }
  try {
    const res = await api.post('/brief', { alert_id: alertId });
    return res.data?.brief || res.data;
  } catch (err) {
    throw new Error(`Brief generation failed: ${err.response?.data?.detail || err.message}`, { cause: err });
  }
}

/**
 * Trigger a simulated disruption event
 * @returns {Promise<object>} Simulation result
 */
export async function simulateEvent() {
  if (USE_MOCK) {
    await mockDelay();
    // Return a new simulated signal to prepend
    return {
      signal: {
        id: `SIG-SIM-${Date.now()}`,
        source: 'AIS',
        title: 'EVER GIVEN II — unexpected speed reduction detected, 3.2kn in open water',
        timestamp: new Date().toISOString(),
        simulated: true,
        affectedPort: null,
      },
    };
  }
  try {
    const res = await api.post('/simulate');
    return res.data;
  } catch (err) {
    throw new Error(`Simulation failed: ${err.response?.data?.detail || err.message}`, { cause: err });
  }
}
