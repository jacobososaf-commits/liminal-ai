
// ==========================================
// LIMINAL AI 0.8.1 BACKEND
// TAVILY WEB SEARCH
// ==========================================

const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3000;

// ==========================================
// PUT YOUR TAVILY KEY HERE
// ==========================================

const TAVILY_API_KEY = "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";

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors());
app.use(express.json());

// ==========================================
// HOME
// ==========================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Liminal AI backend is online.",
        version: "0.8.1",
        search: "Tavily"
    });
});

// ==========================================
// TEST
// ==========================================

app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "Backend is working."
    });
});

// ==========================================
// SEARCH
// ==========================================

app.get("/api/search", async (req, res) => {

    const query = String(req.query.q || "").trim();

    // No query
    if (!query) {
        return res.status(400).json({
            success: false,
            available: false,
            results: [],
            message: "Missing search query."
        });
    }

    // No API key
    if (
        !TAVILY_API_KEY ||
        TAVILY_API_KEY === "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"
    ) {
        console.error("Tavily API key is missing.");

        return res.status(503).json({
            success: false,
            available: false,
            results: [],
            message: "Tavily API key is missing."
        });
    }

    console.log("Liminal web search:", query);

    try {

        const response = await fetch(
            "https://api.tavily.com/search",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    api_key: TAVILY_API_KEY,
                    query: query,
                    search_depth: "basic",
                    topic: "general",
                    max_results: 10,
                    include_answer: false,
                    include_raw_content: false,
                    include_images: false
                })
            }
        );

        // ======================================
        // TAVILY ERROR
        // ======================================

        if (!response.ok) {

            const errorText = await response.text();

            console.error(
                "Tavily error:",
                response.status,
                errorText
            );

            return res.status(503).json({
                success: false,
                available: false,
                results: [],
                message: "Tavily search failed."
            });
        }

        // ======================================
        // READ RESPONSE
        // ======================================

        const data = await response.json();

        const tavilyResults =
            Array.isArray(data.results)
                ? data.results
                : [];

        // ======================================
        // CONVERT TO LIMINAL FORMAT
        // ======================================

        const results = tavilyResults
            .slice(0, 10)
            .map(result => ({
                title: String(result.title || "").trim(),
                url: String(result.url || "").trim(),
                snippet: String(result.content || "").trim()
            }))
            .filter(result =>
                result.title &&
                result.url
            );

        console.log(
            "Tavily returned",
            results.length,
            "results."
        );

        // ======================================
        // SUCCESS
        // ======================================

        return res.json({
            success: true,
            available: true,
            results: results,
            query: query
        });

    } catch (error) {

        console.error(
            "Search request failed:",
            error
        );

        return res.status(503).json({
            success: false,
            available: false,
            results: [],
            message: "The search service is temporarily unavailable."
        });
    }
});

// ==========================================
// 404
// ==========================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Endpoint not found."
    });
});

// ==========================================
// START
// ==========================================

app.listen(PORT, () => {

    console.log(
        `Liminal AI backend running on port ${PORT}`
    );

    console.log(
        "Search provider: Tavily"
    );

    console.log(
        TAVILY_API_KEY &&
        TAVILY_API_KEY !== "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"
            ? "Tavily API key: configured"
            : "Tavily API key: MISSING"
    );

});