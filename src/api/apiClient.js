const API_BASE_URL = "http://192.168.1.41:8000/api";

export const apiCall = async (endpoint, method = "GET", data = null) => {
  try {
    const config = {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};
