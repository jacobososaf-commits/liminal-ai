// ============================================================
// LIMINAL AI BACKEND v0.75
// BUG FIXES + SEARCH HARDENING + RATE LIMITING
// ============================================================

const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3000;

// ============================================================
// CONFIGURATION
// ============================================================

const VERSION = "0.75.0";

// Your GitHub Pages frontend.
// Change this if your frontend URL is different.
const ALLOWED_ORIGINS = [
    "https://jacobososaf-commits.github.io",
    "http://localhost:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500"
];

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
    cors({
        origin: function (origin, callback) {

            // Allow requests without an Origin header.
            // Useful for curl, Render health checks, etc.
            if (!origin) {
                return callback(null, true);
            }

            if (ALLOWED_ORIGINS.includes(origin)) {
                return callback(null, true);
            }

            return callback(
                new Error("Origin not allowed by CORS")
            );
        }
    })
);

app.use(
    express.json({
        limit: "50kb"
    })
);

// ============================================================
// BASIC REQUEST LOGGING
// ============================================================

app.use((req, res, next) => {

    console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.path}`
    );

    next();
});

// ============================================================
// RATE LIMITING
// ============================================================

// Simple in-memory per-IP rate limiter.
//
// This protects the search and chat endpoints from being
// spammed continuously.
//
// Note:
// This resets when the server restarts.
// For a larger production system, use Redis or another
// persistent rate-limit store.

const rateLimitStore = new Map();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

function getClientIP(req) {

    // Render / reverse proxy support
    const forwarded =
        req.headers["x-forwarded-for"];

    if (forwarded) {

        return forwarded
            .split(",")[0]
            .trim();

    }

    return (
        req.socket.remoteAddress ||
        "unknown"
    );
}

function rateLimit(req, res, next) {

    const ip =
        getClientIP(req);

    const now =
        Date.now();

    let record =
        rateLimitStore.get(ip);

    if (!record) {

        record = {
            count: 0,
            start: now
        };

        rateLimitStore.set(
            ip,
            record
        );

    }

    // Reset expired window
    if (
        now - record.start >=
        RATE_LIMIT_WINDOW
    ) {

        record.count = 0;
        record.start = now;

    }

    record.count++;

    if (
        record.count >
        MAX_REQUESTS_PER_WINDOW
    ) {

        const retryAfter =
            Math.ceil(
                (
                    RATE_LIMIT_WINDOW -
                    (now - record.start)
                ) / 1000
            );

        res.setHeader(
            "Retry-After",
            retryAfter
        );

        return res.status(429).json({

            success: false,

            error:
                "Too many requests. Please wait a moment."

        });

    }

    next();
}

// Clean old IP entries periodically
setInterval(() => {

    const now =
        Date.now();

    for (
        const [ip, record]
        of rateLimitStore.entries()
    ) {

        if (
            now - record.start >=
            RATE_LIMIT_WINDOW
        ) {

            rateLimitStore.delete(ip);

        }

    }

}, RATE_LIMIT_WINDOW);

// ============================================================
// SEARCH RATE LIMIT
// ============================================================

const searchRateLimitStore = new Map();

const SEARCH_WINDOW =
    60 * 1000;

const MAX_SEARCH_REQUESTS =
    10;

function searchRateLimit(req, res, next) {

    const ip =
        getClientIP(req);

    const now =
        Date.now();

    let record =
        searchRateLimitStore.get(ip);

    if (!record) {

        record = {
            count: 0,
            start: now
        };

        searchRateLimitStore.set(
            ip,
            record
        );

    }

    if (
        now - record.start >=
        SEARCH_WINDOW
    ) {

        record.count = 0;
        record.start = now;

    }

    record.count++;

    if (
        record.count >
        MAX_SEARCH_REQUESTS
    ) {

        const retryAfter =
            Math.ceil(
                (
                    SEARCH_WINDOW -
                    (now - record.start)
                ) / 1000
            );

        res.setHeader(
            "Retry-After",
            retryAfter
        );

        return res.status(429).json({

            success: false,

            available: false,

            error:
                "Search rate limit reached. Please wait."

        });

    }

    next();
}

// ============================================================
// HOME
// ============================================================

app.get("/", (req, res) => {

    res.json({

        success: true,

        name: "Liminal AI Backend",

        version: VERSION,

        status: "online"

    });

});

// ============================================================
// TEST ENDPOINT
// ============================================================

app.get("/api/test", (req, res) => {

    res.json({

        success: true,

        message:
            "Liminal AI backend is online!",

        version:
            VERSION,

        timestamp:
            new Date().toISOString()

    });

});

// ============================================================
// INFO ENDPOINT
// ============================================================

app.get("/api/info", (req, res) => {

    res.json({

        success: true,

        name:
            "Liminal AI",

        version:
            VERSION,

        backend:
            "Node.js + Express",

        features: [

            "Local memory",

            "Confidence system",

            "Corrections",

            "Web search",

            "Search rate limiting",

            "Chat rate limiting",

            "CORS protection",

            "Search failure detection"

        ],

        search:

            "DuckDuckGo HTML fallback",

        status:
            "online"

    });

});

// ============================================================
// SEARCH HELPERS
// ============================================================

function cleanSearchText(text) {

    if (
        typeof text !== "string"
    ) {

        return "";

    }

    return text
        .replace(
            /[\r\n\t]+/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();

}

function escapeHTML(text) {

    return String(text)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}

// ============================================================
// DUCKDUCKGO SEARCH
// ============================================================

async function searchDuckDuckGo(query) {

    const encodedQuery =
        encodeURIComponent(
            query
        );

    const url =
        `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

    try {

        const response =
            await fetch(
                url,
                {
                    method: "GET",

                    headers: {
                        "User-Agent":
                            "Mozilla/5.0 (compatible; LiminalAI/0.75)"
                    }
                }
            );

        if (
            !response.ok
        ) {

            throw new Error(
                `DuckDuckGo returned ${response.status}`
            );

        }

        const html =
            await response.text();

        if (
            !html ||
            html.length < 100
        ) {

            throw new Error(
                "DuckDuckGo returned an empty response"
            );

        }

        const results = [];

        // ====================================================
        // RESULT BLOCKS
        // ====================================================

        const resultRegex =
            /<div[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;

        const blocks =
            html.match(
                resultRegex
            ) || [];

        for (
            const block
            of blocks
        ) {

            if (
                results.length >= 10
            ) {

                break;

            }

            // -----------------------------------------------
            // TITLE
            // -----------------------------------------------

            const titleMatch =
                block.match(
                    /class="result__a"[^>]*>([\s\S]*?)<\/a>/i
                );

            // -----------------------------------------------
            // URL
            // -----------------------------------------------

            const urlMatch =
                block.match(
                    /class="result__a"[^>]*href="([^"]+)"/i
                );

            // -----------------------------------------------
            // SNIPPET
            // -----------------------------------------------

            const snippetMatch =
                block.match(
                    /class="result__snippet"[^>]*>([\s\S]*?)<\/a?>/i
                );

            if (
                !titleMatch ||
                !urlMatch
            ) {

                continue;

            }

            let title =
                titleMatch[1];

            let resultURL =
                urlMatch[1];

            let snippet =
                snippetMatch
                    ? snippetMatch[1]
                    : "";

            // Remove HTML
            title =
                title.replace(
                    /<[^>]+>/g,
                    ""
                );

            snippet =
                snippet.replace(
                    /<[^>]+>/g,
                    ""
                );

            // Decode common entities
            title =
                title
                    .replace(
                        /&amp;/g,
                        "&"
                    )
                    .replace(
                        /&quot;/g,
                        '"'
                    )
                    .replace(
                        /&#x27;/g,
                        "'"
                    )
                    .replace(
                        /&#39;/g,
                        "'"
                    );

            snippet =
                snippet
                    .replace(
                        /&amp;/g,
                        "&"
                    )
                    .replace(
                        /&quot;/g,
                        '"'
                    )
                    .replace(
                        /&#x27;/g,
                        "'"
                    )
                    .replace(
                        /&#39;/g,
                        "'"
                    );

            // DDG sometimes returns redirect URLs.
            try {

                if (
                    resultURL.startsWith(
                        "//"
                    )
                ) {

                    resultURL =
                        "https:" +
                        resultURL;

                }

                const parsed =
                    new URL(
                        resultURL
                    );

                if (
                    parsed.hostname.includes(
                        "duckduckgo.com"
                    ) &&
                    parsed.searchParams.has(
                        "uddg"
                    )
                ) {

                    resultURL =
                        decodeURIComponent(
                            parsed.searchParams.get(
                                "uddg"
                            )
                        );

                }

            } catch (
                error
            ) {

                // Keep original URL if parsing fails.

            }

            results.push({

                title:
                    cleanSearchText(
                        title
                    ),

                url:
                    resultURL,

                snippet:
                    cleanSearchText(
                        snippet
                    )

            });

        }

        // ====================================================
        // IMPORTANT 0.75 HARDENING
        // ====================================================

        // If HTML was received but our parser found nothing,
        // DO NOT pretend there were simply no search results.
        //
        // This detects when DDG changes its HTML structure.

        if (
            results.length === 0
        ) {

            throw new Error(
                "Search page was received, but no results could be parsed"
            );

        }

        return {

            success: true,

            available: true,

            results

        };

    } catch (
        error
    ) {

        console.error(
            "DuckDuckGo search failed:",
            error.message
        );

        return {

            success: false,

            available: false,

            results: [],

            message:
                "Search is temporarily unavailable."

        };

    }

}

// ============================================================
// SEARCH ENDPOINT
// ============================================================

app.get(
    "/api/search",
    searchRateLimit,
    async (req, res) => {

        let query =
            req.query.q;

        query =
            cleanSearchText(
                query
            );

        // -----------------------------------------------
        // VALIDATION
        // -----------------------------------------------

        if (
            !query
        ) {

            return res.status(400).json({

                success: false,

                available: false,

                error:
                    "Missing search query."

            });

        }

        // Prevent enormous search queries
        if (
            query.length > 300
        ) {

            return res.status(400).json({

                success: false,

                available: false,

                error:
                    "Search query is too long."

            });

        }

        console.log(
            `🔎 Search: "${query}"`
        );

        const result =
            await searchDuckDuckGo(
                query
            );

        // -----------------------------------------------
        // SEARCH FAILED
        // -----------------------------------------------

        if (
            !result.success
        ) {

            return res.status(503).json({

                success: false,

                available: false,

                results: [],

                message:
                    "The search service is temporarily unavailable."

            });

        }

        // -----------------------------------------------
        // SUCCESS
        // -----------------------------------------------

        return res.json({

            success: true,

            available: true,

            query:

                query,

            results:
                result.results

        });

    }
);

// ============================================================
// CHAT ENDPOINT
// ============================================================

app.post(
    "/api/chat",
    rateLimit,
    async (req, res) => {

        const message =
            req.body &&
            req.body.message;

        if (
            typeof message !==
            "string"
        ) {

            return res.status(400).json({

                success: false,

                error:
                    "Message must be a string."

            });

        }

        const cleanedMessage =
            message.trim();

        if (
            !cleanedMessage
        ) {

            return res.status(400).json({

                success: false,

                error:
                    "Message cannot be empty."

            });

        }

        if (
            cleanedMessage.length > 2000
        ) {

            return res.status(400).json({

                success: false,

                error:
                    "Message is too long."

            });

        }

        console.log(
            `💬 Chat message: "${cleanedMessage}"`
        );

        // ====================================================
        // IMPORTANT
        // ====================================================
        //
        // Liminal's actual memory/understanding system lives
        // in script.js right now.
        //
        // The backend should NOT replace that system.
        //
        // This endpoint exists so the frontend can verify that
        // the backend is alive and ready for future backend AI.
        // ====================================================

        return res.json({

            success: true,

            reply:
                "Liminal AI's backend is online, but no remote AI chat provider is connected yet.",

            version:
                VERSION

        });

    }
);

// ============================================================
// 404
// ============================================================

app.use(
    (req, res) => {

        res.status(404).json({

            success: false,

            error:
                "Endpoint not found."

        });

    }
);

// ============================================================
// ERROR HANDLER
// ============================================================

app.use(
    (err, req, res, next) => {

        console.error(
            "Server error:",
            err
        );

        if (
            err.message &&
            err.message.includes(
                "Origin not allowed"
            )
        ) {

            return res.status(403).json({

                success: false,

                error:
                    "Origin not allowed."

            });

        }

        res.status(500).json({

            success: false,

            error:
                "Internal server error."

        });

    }
);

// ============================================================
// START SERVER
// ============================================================

app.listen(
    PORT,
    () => {

        console.log("");
        console.log(
            "=========================================="
        );
        console.log(
            `🤖 Liminal AI Backend v${VERSION}`
        );
        console.log(
            "=========================================="
        );
        console.log(
            `🚀 Server running on port ${PORT}`
        );
        console.log(
            "🔒 Rate limiting: ENABLED"
        );
        console.log(
            "🌐 Search hardening: ENABLED"
        );
        console.log(
            "🛡️ CORS protection: ENABLED"
        );
        console.log(
            "=========================================="
        );
        console.log("");

    }
);