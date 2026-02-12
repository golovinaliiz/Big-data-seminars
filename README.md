# Big-data-seminars
Assignment: AI-Driven Decision System (From Insight to Action)
📌 Overview
Last week, we successfully connected the Hugging Face API to collect and log sentiment data. You built a Sensor that detects customer mood.

This week, we will upgrade that sensor into a Brain. In a real-world business context, knowing a customer is angry is useless unless you do something about it. Your task is to implement an Automated Decision Logic that triggers specific business actions based on the AI's analysis.

🎯 Objectives
Business Logic Implementation: Translate raw AI probability scores into actionable business rules.
Dynamic UI/UX: Update the frontend to reflect the system's decision in real-time.
Action Logging: Log not just the sentiment, but the action taken to Google Sheets for future ROI analysis.
🏢 The Scenario: "The Automatic Firefighter"
You are building the CRM system for an e-commerce platform. Management wants to automate customer service responses.

If a customer is furious (High Negative Risk): We must apologize immediately and offer a discount to prevent churn.
If a customer is vague (Neutral): We need more data. Ask for specific feedback.
If a customer is happy (High Positive): Capitalize on the moment. Ask them to refer a friend.
🛠️ Task Specifications
1. The Logic Matrix
You must implement the following logic. Note that Hugging Face usually returns a label (POSITIVE/NEGATIVE) and a score (confidence). You need to normalize this into a single "Positivity Index" or handle the conditional logic carefully.

AI Outcome (Label / Conf)	Normalized Score (0~1)	Business Risk	Automated Action	UI Response
NEGATIVE (High Conf)	
0.0
≤
S
≤
0.4
Churn Risk	OFFER_COUPON	🚨 Show Apology & 50% Off Coupon Button
NEUTRAL / Low Conf	
0.4
<
S
<
0.7
Uncertain	REQUEST_FEEDBACK	📝 Show Detailed Survey Link
POSITIVE (High Conf)	
0.7
≤
S
≤
1.0
Loyal	ASK_REFERRAL	⭐ Show "Refer a Friend" Button
2. Implementation Steps
Step A: Logic Function
Write a function determineBusinessAction(score, label) that returns the Action Code, UI Message, and Color.

Step B: UI Update
Modify your HTML/JS so that after the API responds, a new section (e.g., <div id="action-result">) appears displaying the correct message and style defined in your logic.

Step C: Enhanced Logging
Update your Google Sheets App Script and Frontend code to send an extra column:

Old Columns: timestamp, review, sentiment, confidence
New Column: action_taken (e.g., "OFFER_COUPON")
💻 Starter Code Snippet
Use this logic function as a baseline for your implementation. You need to integrate this into your existing script.js.

/**
 * Determines the appropriate business action based on sentiment analysis results.
 * 
 * Normalizes the AI output into a linear scale (0.0 to 1.0) to simplify
 * threshold comparisons.
 * 
 * @param {number} confidence - The confidence score returned by the API (0.0 to 1.0).
 * @param {string} label - The label returned by the API (e.g., "POSITIVE", "NEGATIVE").
 * @returns {object} An object containing the action metadata (code, message, color).
 */
function determineBusinessAction(confidence, label) {
    // 1. Normalize Score: Map everything to a 0 (Worst) to 1 (Best) scale.
    // If Label is NEGATIVE, a high confidence means a VERY BAD score (near 0).
    let normalizedScore = 0.5; // Default neutral

    if (label === "POSITIVE") {
        normalizedScore = confidence; // e.g., 0.9 -> 0.9 (Great)
    } else if (label === "NEGATIVE") {
        normalizedScore = 1.0 - confidence; // e.g., 0.9 conf -> 0.1 (Terrible)
    }

    // 2. Apply Business Thresholds
    if (normalizedScore <= 0.4) {
        // CASE: Critical Churn Risk
        return {
            actionCode: "OFFER_COUPON",
            uiMessage: "We are truly sorry. Please accept this 50% discount coupon.",
            uiColor: "#ef4444" // Red
        };
    } else if (normalizedScore < 0.7) {
        // CASE: Ambiguous / Neutral
        return {
            actionCode: "REQUEST_FEEDBACK",
            uiMessage: "Thank you! Could you tell us how we can improve?",
            uiColor: "#6b7280" // Gray
        };
    } else {
        // CASE: Happy Customer
        return {
            actionCode: "ASK_REFERRAL",
            uiMessage: "Glad you liked it! Refer a friend and earn rewards.",
            uiColor: "#3b82f6" // Blue
        };
    }
}

// Usage Example inside your API callback:
// const decision = determineBusinessAction(result.score, result.label);
// console.log("System Decision:", decision.actionCode);
// updateDOM(decision); 
// logToGoogleSheet(..., decision.actionCode);
📤 Requirements
Deploy your updated web page (GitHub Pages).
Screen of your Google Sheet showing the new action_taken column populated with different actions ("OFFER_COUPON", "ASK_REFERRAL", etc.).
💡 Evaluation Criteria
Logic Accuracy: Does a negative review actually trigger the coupon logic?
UI Feedback: Does the user see the result of the logic? (Not just console logs).
Data Integrity: Is the action_taken correctly logged in the database (Sheets)?


according to the rules, create a simple html page that accepts the token for the sentiment prediciton model to work, then create a second page where a user inputs the product review, then make a decision according to the provided table of churn handling
also, make logging to the provided google sheets, using the code that looks like this and is qualifying the criterion listed in the document above

- Lets the user paste and save a Google Apps Script Web App URL (/exec).
- Logs events according to the description file to Google Sheets via that Web App./**
 * app.js — MVP Logger (CORS-safe)
 *
 * Purpose
 * - Send cross-origin POSTs to a Google Apps Script Web App without CORS preflight.
 * - Uses application/x-www-form-urlencoded via URLSearchParams (no custom headers).
 *
 * How it avoids preflight
 * - No custom headers (e.g., no Content-Type: application/json).
 * - Body encoded as form data; method is POST (simple request spec).
 *
 * Requirements
 * - index.html contains:
 *    - <input id="gasUrl"> and <button id="saveUrl">
 *    - <button id="ctaA">, <button id="ctaB">, <button id="heartbeat">
 *    - <div id="status">
 * - Deploy Apps Script Web App as “Anyone” and use the /exec URL.
 *
 * Notes
 * - For higher throughput, consider switching to Sheets API values.append server-side.
 */

const LS_KEY_URL = "gas_url";
const LS_KEY_UID = "uid";

/** Get or create a stable pseudo user id. */
function getUserId() {
  let uid = localStorage.getItem(LS_KEY_UID);
  if (!uid) {
    uid = (crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
    localStorage.setItem(LS_KEY_UID, uid);
  }
  return uid;
}

/** Read the GAS URL from input or storage; hydrate input if stored. */
function getGasUrl() {
  const input = document.getElementById("gasUrl");
  const entered = (input?.value || "").trim();
  if (entered) return entered;
  const saved = (localStorage.getItem(LS_KEY_URL) || "").trim();
  if (input && saved) input.value = saved;
  return saved;
}

/** Save the GAS URL from input after basic validation. */
function saveGasUrl() {
  const status = document.getElementById("status");
  const url = (document.getElementById("gasUrl")?.value || "").trim();
  if (!url) {
    status.textContent = "Please paste your Apps Script Web App URL (ending with /exec).";
    return;
  }
  try { new URL(url); } catch { status.textContent = "Invalid URL format."; return; }
  localStorage.setItem(LS_KEY_URL, url);
  status.textContent = "Saved Web App URL.";
}

/**
 * Send one event as a CORS simple request (no preflight).
 * Payload fields are flattened into form data.
 * Returns a Promise resolving to raw response text.
 */
async function sendLogSimple(payload) {
  const status = document.getElementById("status");
  const url = getGasUrl();
  if (!url) {
    status.textContent = "Missing Web App URL. Paste it and click Save URL first.";
    return "MISSING_URL";
  }

  const form = new URLSearchParams();
  form.set("event", payload.event || "");
  form.set("variant", payload.variant || "");
  form.set("userId", payload.userId || "");
  form.set("ts", String(payload.ts || Date.now()));
  form.set("meta", JSON.stringify(payload.meta || {}));

  try {
    const res = await fetch(url, {
      method: "POST",
      body: form // application/x-www-form-urlencoded; no headers to avoid preflight
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
    status.textContent = "Logged ✅";
    return text;
  } catch (err) {
    status.textContent = `Log failed: ${String(err)}`;
    return `ERROR: ${String(err)}`;
  }
}

/** Wire UI interactions. */
(function init() {
  const status = document.getElementById("status");
  const saved = localStorage.getItem(LS_KEY_URL);
  if (saved) {
    const input = document.getElementById("gasUrl");
    if (input) input.value = saved;
    status.textContent = "Loaded saved Web App URL.";
  }

  document.getElementById("saveUrl")?.addEventListener("click", saveGasUrl);

  const userId = getUserId();
  const baseMeta = { page: location.pathname, ua: navigator.userAgent };

  document.getElementById("ctaA")?.addEventListener("click", () => {
    sendLogSimple({ event: "cta_click", variant: "A", userId, ts: Date.now(), meta: baseMeta });
  });

  document.getElementById("ctaB")?.addEventListener("click", () => {
    sendLogSimple({ event: "cta_click", variant: "B", userId, ts: Date.now(), meta: baseMeta });
  });

  document.getElementById("heartbeat")?.addEventListener("click", () => {
    sendLogSimple({ event: "heartbeat", userId, ts: Date.now(), meta: baseMeta });
  });
})();


/**
 * Minimal Web App receiver for MVP logging.
 * Expects JSON: { event: "cta_click", variant: "B", userId: "...", ts: 1699999999999 }
 * Returns JSON { ok: true } on success.
 * Accepts x-www-form-urlencoded from e.parameter and appends to Sheet.
 */
function doPost(e) {
  var p = e && e.parameter ? e.parameter : {};
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('logs') || ss.insertSheet('logs');
  if (sh.getLastRow() === 0) {
    sh.appendRow(['ts_iso','event','variant','userId','meta']);
  }
  var ts = p.ts ? new Date(Number(p.ts)) : new Date();
  sh.appendRow([
    ts.toISOString(),
    p.event || '',
    p.variant || '',
    p.userId || '',
    p.meta || ''
  ]);
  return ContentService.createTextOutput('OK'); // text is fine for simple requests
}
