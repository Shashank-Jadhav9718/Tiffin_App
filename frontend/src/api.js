// Centralized API handler for Tiffin App backend

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

async function fetchAPI(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  // Set default content type to JSON
  if (options.body && !(options.body instanceof FormData)) {
    options.headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
  }

  try {
    const response = await fetch(url, options);
    
    // Parse response body if possible
    let data = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    }

    if (!response.ok) {
      const errorMsg = (data && data.detail) || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error(`[API Error] URL: ${url}`, error);
    throw error;
  }
}

/**
 *Centralized API Calls
 */
export async function getDailyCount(dateStr) {
  return fetchAPI(`/api/v1/daily-count?date=${dateStr}`);
}

export async function postAttendance(attendanceBody) {
  return fetchAPI('/api/v1/attendance', {
    method: 'POST',
    body: JSON.stringify(attendanceBody),
  });
}

export async function getCustomers() {
  return fetchAPI('/api/v1/customers');
}

export async function postCustomer(customerBody) {
  return fetchAPI('/api/v1/customers', {
    method: 'POST',
    body: JSON.stringify(customerBody),
  });
}

export async function deactivateCustomer(customerId) {
  return fetchAPI(`/api/v1/customers/${customerId}/deactivate`, {
    method: 'PATCH',
  });
}

export async function calculateBilling(month, year) {
  return fetchAPI(`/api/v1/billing/calculate?month=${month}&year=${year}`);
}

export async function markPaid(customerId, month, year) {
  return fetchAPI(`/api/v1/billing/${customerId}/mark-paid?month=${month}&year=${year}`, {
    method: 'PATCH',
  });
}
