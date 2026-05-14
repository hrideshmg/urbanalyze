"use server";
import { GoogleGenAI } from "@google/genai";
import { BigQuery } from "@google-cloud/bigquery";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { getCached, setCached } from "./cache";
import { geminiQueue, overpassQueue } from "./queue";

let aiClient = null;

async function getAIClient() {
  if (aiClient) return aiClient;
  const apiKey = await getSecret("GEMINI_API_KEY") || process.env.GEMINI_API_KEY;
  if (apiKey) {
    aiClient = new GoogleGenAI({ apiKey });
  } else {
    console.warn("GEMINI_API_KEY not found. Falling back to Vertex AI.");
    aiClient = new GoogleGenAI(
      process.env.GOOGLE_CLOUD_PROJECT 
        ? { vertexai: true, project: process.env.GOOGLE_CLOUD_PROJECT, location: 'us-central1' }
        : { vertexai: true, location: 'us-central1' }
    );
  }
  return aiClient;
}
const bigquery = new BigQuery({projectId: process.env.GOOGLE_CLOUD_PROJECT});
const secretManager = new SecretManagerServiceClient();

async function getSecret(secretName) {
  if (process.env[secretName]) {
    return process.env[secretName];
  }
  
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    if (!projectId) {
      console.warn(`GOOGLE_CLOUD_PROJECT is not set. Cannot fetch secret ${secretName} from Secret Manager.`);
      return null;
    }
    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
    const [version] = await secretManager.accessSecretVersion({ name });
    if (!version?.payload?.data) {
      throw new Error("Secret payload is empty");
    }
    const payload = version.payload.data.toString('utf8');
    process.env[secretName] = payload; // Cache it
    return payload;
  } catch (error) {
    console.warn(`Failed to fetch secret ${secretName} from Secret Manager: ${error?.message || error}`);
    return null;
  }
}

async function fetchWithRetry(endpoint, options, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      // Add a timeout using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds max
      
      const res = await fetch(endpoint, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (res.ok) return res;
      
      if (i < retries && (res.status === 429 || res.status >= 500)) {
        console.warn(`Request to ${endpoint} failed with ${res.status}. Retrying... (${i+1}/${retries})`);
        await new Promise(r => setTimeout(r, 2000 * (i + 1))); // Exponential backoff
        continue;
      }
      return res; // Let the caller handle the final non-ok response
    } catch (err) {
      if (i < retries) {
        console.warn(`Request to ${endpoint} error: ${err.message}. Retrying... (${i+1}/${retries})`);
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
}

async function handleFetchResponse(response, endpoint) {
  try {
    if (!response.ok) {
      console.error(
        `Request to ${endpoint} failed with status ${response.status}`,
      );
      return null;
    }
    const data = await response.json();
    if (!data) {
      console.error(`Empty response received from ${endpoint}`);
      return null;
    }
    return data;
  } catch (error) {
    console.error(`Error handling response from ${endpoint}:`, error);
    return null;
  }
}

function validateCoordinates(lat, lon) {
  if (
    typeof lat !== "number" ||
    typeof lon !== "number" ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    console.error("Invalid coordinates provided");
    return false;
  }
  return true;
}

export async function logSearchQuery(location, prompt, weights) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5002";
    const response = await fetch(`${backendUrl}/log_query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        location,
        prompt,
        weights
      })
    });
    if (response.ok) {
      console.log(`Logged search query for ${location} to Backend BigQuery`);
    } else {
      console.error("Backend error logging to BigQuery");
    }
  } catch (error) {
    console.error("Error logging to BigQuery:", error);
  }
}

export async function getCoordinates(location_string) {
  if (!location_string?.trim()) {
    console.error("Location string is required");
    return null;
  }

  try {
    const geoKey = await getSecret("GEO_KEY") || process.env.NEXT_PUBLIC_GEO_KEY;
    const endpoint = `https://api.geoapify.com/v1/geocode/search?text=${location_string}&apiKey=${geoKey}`;
    const response = await fetch(endpoint, {
      headers: {
        "User-Agent": "YourApp/1.0",
      },
    });

    const jsonData = await handleFetchResponse(response, endpoint);
    if (!response.ok) {
      console.error("Location not found");
      return null;
    }
    const lat = jsonData.features[0].properties.lat;
    const lon = jsonData.features[0].properties.lon;
    const coordinates = [parseFloat(lat), parseFloat(lon)];

    if (coordinates.some(isNaN)) {
      console.error("Invalid coordinates received from API");
      return null;
    }

    return coordinates;
  } catch (error) {
    console.error("Error getting coordinates:", error);
    return null;
  }
}

export async function nomainatimQuery(lat, lon) {
  if (!validateCoordinates(lat, lon)) return null;

  try {
    const geoKey = await getSecret("GEO_KEY") || process.env.NEXT_PUBLIC_GEO_KEY;
    const endpoint = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${geoKey}`;
    const response = await fetch(endpoint, {
      headers: {
        "User-Agent": "YourApp/1.0",
      },
    });
    return await handleFetchResponse(response, endpoint);
  } catch (error) {
    console.error("Error in nominatim query:", error);
    return null;
  }
}
export async function getPexelsImage(query) {
  const apiKey = await getSecret("PEXELS_KEY") || process.env.NEXT_PUBLIC_PEXELS_KEY; // Your Pexels API key
  const endpoint = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      console.error("Error fetching image from Pexels:", response.statusText);
      return null;
    }

    const data = await response.json();
    if (data.photos && data.photos.length > 0) {
      return data; // Get a medium-sized image
    } else {
      console.error("No images found for the query:", query);
      return null;
    }
  } catch (error) {
    console.error("Error fetching image from Pexels:", error);
    return null;
  }
}

export async function getNearbySettlements(lat, lon, radius) {
  if (!validateCoordinates(lat, lon)) return null;

  if (!radius || radius <= 0) {
    console.error("Invalid radius provided");
    return null;
  }

  try {
    const cacheKey = `nearby_settlements_${lat}_${lon}_${radius}`;
    const cachedData = getCached(cacheKey);
    if (cachedData) return cachedData;

    const endpoint = "https://overpass-api.de/api/interpreter";
    const query = `
      [out:json];
      node[place~"town|city|village"](around:${radius},${lat},${lon});
      out;
    `;

    const response = await overpassQueue.enqueue(() => fetchWithRetry(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "User-Agent": "Urbanalyze/1.0"
      },
      body: "data=" + encodeURIComponent(query),
    }));

    const data = await handleFetchResponse(response, endpoint);
    if (data) setCached(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Error getting nearby settlements:", error);
    return null;
  }
}

export async function getAQI(lat, lon) {
  if (!validateCoordinates(lat, lon)) return null;

  const aqiKey = await getSecret("AQI_KEY") || process.env.NEXT_PUBLIC_AQI_KEY;
  if (!aqiKey) {
    console.error("AQI API key not configured");
    return null;
  }

  try {
    const endpoint = "https://api.waqi.info/feed/geo";
    const response = await fetch(
      `${endpoint}:${lat};${lon}?token=${aqiKey}`,
    );
    const data = await handleFetchResponse(response, endpoint);

    if (data?.status !== "ok") {
      console.error("AQI API returned error status");
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error getting AQI:", error);
    return null;
  }
}

export async function getWeather(lat, lon) {
  if (!validateCoordinates(lat, lon)) return null;

  try {
    const endpoint = "https://api.open-meteo.com/v1/forecast";
    const response = await fetch(
      `${endpoint}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&past_days=7`,
    );
    return await handleFetchResponse(response, endpoint);
  } catch (error) {
    console.error("Error getting weather:", error);
    return null;
  }
}

export async function getRiverDischarge(lat, lon) {
  if (!validateCoordinates(lat, lon)) return null;

  try {
    const endpoint = "https://flood-api.open-meteo.com/v1/flood";
    const response = await fetch(
      `${endpoint}?latitude=${lat}&longitude=${lon}&daily=river_discharge&start_date=2020-01-01&end_date=2024-12-31`,
    );
    return await handleFetchResponse(response, endpoint);
  } catch (error) {
    console.error("Error getting river discharge:", error);
    return null;
  }
}

export async function getEarthquake(lat, lon) {
  if (!validateCoordinates(lat, lon)) return null;

  try {
    const endpoint = "https://earthquake.usgs.gov/fdsnws/event/1/query";
    const response = await fetch(
      `${endpoint}?latitude=${lat}&maxradiuskm=100&longitude=${lon}&format=geojson&starttime=2022-01-01`,
    );
    return await handleFetchResponse(response, endpoint);
  } catch (error) {
    console.error("Error getting earthquake data:", error);
    return null;
  }
}

export async function getHospital(lat, lon) {
  if (!validateCoordinates(lat, lon)) return null;

  try {
    const cacheKey = `hospital_${lat}_${lon}`;
    const cachedData = getCached(cacheKey);
    if (cachedData) return cachedData;

    const endpoint = "https://overpass-api.de/api/interpreter";
    const query = `
      [out:json];
      node["amenity"="hospital"](around:10000,${lat},${lon});
      out 1;
    `;

    const response = await overpassQueue.enqueue(() => fetchWithRetry(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "User-Agent": "Urbanalyze/1.0"
      },
      body: "data=" + encodeURIComponent(query),
    }));

    const data = await handleFetchResponse(response, endpoint);
    if (data) setCached(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Error getting hospital data:", error);
    return null;
  }
}

export async function geminiSummarise(settlementData, retries = 3) {
  if (!settlementData || typeof settlementData !== "object") {
    console.error("Invalid settlement data provided");
    return null;
  }

  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5002";
    const response = await fetch(`${backendUrl}/summarize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        settlementData
      })
    });
    const data = await response.json();
    if (!data || !data.success) {
      console.error("Failed to generate summary");
      return "Unable to generate a summary for this location due to service limits.";
    }

    return data.summary;
  } catch (error) {
    console.error("Error generating summary:", error?.message || error);
    return "This peaceful settlement offers a blend of local amenities and natural climate. Consider visiting to experience its unique lifestyle and community first-hand.";
  }
}

export async function geminiGenerateWeights(user_input) {
  const defaultWeights = {"h_w": 0.05,"t_w": 0.05,"r_w": 0.2,"e_w": 0.2,"aqi_w": 0.3,"ho_w": 0.2};
  
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5002";
    const response = await fetch(`${backendUrl}/generate_weights`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user_input: user_input || "Default search"
      })
    });
    const data = await response.json();
    if (!data || !data.success) {
      console.warn("Failed to generate weights, using defaults");
      return defaultWeights;
    }
    return data.weights;
  } catch (error) {
    console.error("Error generating weights, using defaults:", error);
    return defaultWeights;
  }
}

export async function translateSummary(text, targetLanguage = 'hi') {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5002";
    const response = await fetch(`${backendUrl}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, target_language: targetLanguage })
    });
    
    const data = await response.json();
    if (data.success) {
      return data.translated_text;
    }
    return text; // fallback to original English
  } catch (error) {
    console.error("Translation failed:", error);
    return text;
  }
}
