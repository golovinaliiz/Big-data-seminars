// app.js (ES module version using transformers.js for local sentiment classification)

import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6/dist/transformers.min.js";

// ===== Константа с URL Web App Google Apps Script =====
const SHEET_WEBAPP_URL = "https://script.google.com/macros/s/XXXX/exec"; // TODO: вставь свой URL веб-приложения[web:12]

// Global variables
let reviews = [];
let apiToken = ""; // kept for UI compatibility, but not used with local inference
let sentimentPipeline = null; // transformers.js text-classification pipeline

// DOM elements (инициализируем позже)
let analyzeBtn;
let reviewText;
let sentimentResult;
let loadingElement;
let errorElement;
let apiTokenInput;
let statusElement;

// Универсальная инициализация (DOM может быть уже загружен)
function init() {
  // Если DOM ещё грузится — дождёмся
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initOnce);
  } else {
    initOnce();
  }
}

function initOnce() {
  // Защита от повторной инициализации
  if (initOnce._initialized) return;
  initOnce._initialized = true;

  // Получаем элементы
  analyzeBtn = document.getElementById("analyze-btn");
  reviewText = document.getElementById("review-text");
  sentimentResult = document.getElementById("sentiment-result");
  loadingElement = document.querySelector(".loading");
  errorElement = document.getElementById("error-message");
  apiTokenInput = document.getElementById("api-token");
  statusElement = document.getElementById("status");

  // Базовые проверки
  if (!analyzeBtn || !reviewText || !sentimentResult) {
    console.error("Required DOM elements not found. Check IDs in HTML.");
    return;
  }

  // Load the TSV file (Papa Parse)
  loadReviews();

  // Set up event listeners
  analyzeBtn.addEventListener("click", analyzeRandomReview);

  if (apiTokenInput) {
    apiTokenInput.addEventListener("change", saveApiToken);

    const savedToken = localStorage.getItem("hfApiToken");
    if (savedToken) {
      apiTokenInput.value = savedToken;
      apiToken = savedToken;
    }
  }

  // Initialize transformers.js sentiment model
  initSentimentModel();
}

// Запускаем инициализацию
init();

// Initialize transformers.js text-classification pipeline with a supported model
async function initSentimentModel() {
  try {
    if (statusElement) {
      statusElement.textContent = "Loading sentiment model...";
    }

    sentimentPipeline = await pipeline(
      "text-classification",
      "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
    );[web:26][web:39]

    if (statusElement) {
      statusElement.textContent = "Sentiment model ready";
    }
  } catch (error) {
    console.error("Failed to load sentiment model:", error);
    showError(
      "Failed to load sentiment model. Please check your network connection and try again."
    );
    if (statusElement) {
      statusElement.textContent = "Model load failed";
    }
  }
}

// Load and parse the TSV file using Papa Parse
function loadReviews() {
  fetch("reviews_test.tsv")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load TSV file");
      }
      return response.text();
    })
    .then((tsvData) => {
      Papa.parse(tsvData, {
        header: true,
        delimiter: "\\t",
        complete: (results) => {
          reviews = results.data
            .map((row) => row.text)
            .filter((text) => typeof text === "string" && text.trim() !== "");
          console.log("Loaded", reviews.length, "reviews");
        },
        error: (error) => {
          console.error("TSV parse error:", error);
          showError("Failed to parse TSV file: " + error.message);
        },
      });
    })
    .catch((error) => {
      console.error("TSV load error:", error);
      showError("Failed to load TSV file: " + error.message);
    });
}

// Save API token to localStorage (UI compatibility; not used with local inference)
function saveApiToken() {
  apiToken = apiTokenInput.value.trim();
  if (apiToken) {
    localStorage.setItem("hfApiToken", apiToken);
  } else {
    localStorage.removeItem("hfApiToken");
  }
}

// Analyze a random review
function analyzeRandomReview() {
  hideError();

  if (!Array.isArray(reviews) || reviews.length === 0) {
    showError("No reviews available. Please try again later.");
    return;
  }

  if (!sentimentPipeline) {
    showError("Sentiment model is not ready yet. Please wait a moment.");
    return;
  }

  const selectedReview =
    reviews[Math.floor(Math.random() * reviews.length)];

  // Display the review
  reviewText.textContent = selectedReview;

  // Show loading state
  if (loadingElement) {
    loadingElement.style.display = "block";
  }
  analyzeBtn.disabled = true;
  sentimentResult.innerHTML = ""; // Reset previous result
  sentimentResult.className = "sentiment-result"; // Reset classes

  // Call local sentiment model (transformers.js)
  analyzeSentiment(selectedReview)
    .then((result) => displaySentiment(result))
    .catch((error) => {
      console.error("Error:", error);
      showError(error.message || "Failed to analyze sentiment.");
    })
    .finally(() => {
      if (loadingElement) {
        loadingElement.style.display = "none";
      }
      analyzeBtn.disabled = false;
    });
}

// Call local transformers.js pipeline for sentiment classification
async function analyzeSentiment(text) {
  if (!sentimentPipeline) {
    throw new Error("Sentiment model is not initialized.");
  }

  const output = await sentimentPipeline(text);

  if (!Array.isArray(output) || output.length === 0) {
    throw new Error("Invalid sentiment output from local model.");
  }

  // Wrap to match [[{ label, score }]] shape expected by displaySentiment
  return [output];
}

// ===== Функция логирования в Google Sheets через Web App =====
async function logToSheet({ review, label, score, sentiment }) {
  if (!SHEET_WEBAPP_URL || SHEET_WEBAPP_URL.includes("XXXX")) {
    console.warn("SHEET_WEBAPP_URL is not configured, skipping logging.");
    return;
  }

  try {
    const payload = {
      review,
      label,
      score,
      sentiment,
      ts: new Date().toISOString(),
      
