
// ============================================================
// LIMINAL AI BACKEND v0.75
// WEB KNOWLEDGE + SEARCH HARDENING + RATE LIMITING
// ============================================================

const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3000;

// ============================================================
// CONFIGURATION
// ============================================================

const VERSION = "0.75.0";

// Your GitHub Pages frontend
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
            // Useful for direct requests and Render health checks.
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
// REQUEST LOGGING
// ============================================================

app.use((req, res, next) => {

    console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.path}`
    );

    next();

});

// ============================================================
// GENERAL RATE LIMITING
// ============================================================

const rateLimitStore = new Map();

const RATE_LIMIT_WINDOW =
    60 * 1000;

const MAX_REQUESTS_PER_WINDOW =
    30;

function getClientIP(req) {

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

// ============================================================
// CLEAN GENERAL RATE-LIMIT RECORDS
// ============================================================

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
// SEARCH RATE LIMITING
// ============================================================

const searchRateLimitStore =
    new Map();

const SEARCH_WINDOW =
    60 * 1000;

const MAX_SEARCH_REQUESTS =
    10;

function searchRateLimit(
    req,
    res,
    next
) {

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

        name:
            "Liminal AI Backend",

        version:
            VERSION,

        status:
            "online"

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

            "DuckDuckGo search",

            "Search rate limiting",

            "Chat rate limiting",

            "CORS protection",

            "Search failure detection"

        ],

        search:
            "DuckDuckGo HTML",

        chat:
            "Handled by frontend",

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

// ============================================================
// HTML ENTITY DECODER
// ============================================================

function decodeHTML(text) {

    return String(text)

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
        )

        .replace(
            /&lt;/g,
            "<"
        )

        .replace(
            /&gt;/g,
            ">"
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
                            "Mozilla/5.0 (compatible; LiminalAI/0.75)",

                        "Accept":
                            "text/html"

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
        // FIND RESULT BLOCKS
        // ====================================================

        const resultRegex =
            /<div[^>]*class="[^"]*\bresult\b[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*\bresult\b|<\/body>)/gi;

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

            // =================================================
            // TITLE + URL
            // =================================================

            const titleMatch =
                block.match(
                    /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i
                );

            if (
                !titleMatch
            ) {

                continue;

            }

            let resultURL =
                titleMatch[1];

            let title =
                titleMatch[2];

            // =================================================
            // SNIPPET
            // =================================================

            const snippetMatch =
                block.match(
                    /<[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i
                );

            let snippet =
                snippetMatch
                    ? snippetMatch[1]
                    : "";

            // =================================================
            // REMOVE HTML
            // =================================================

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

            // =================================================
            // DECODE HTML
            // =================================================

            title =
                decodeHTML(title);

            snippet =
                decodeHTML(snippet);

            // =================================================
            // CLEAN URL
            // =================================================

            try {

                if (
                    resultURL.startsWith("//")
                ) {

                    resultURL =
                        "https:" +
                        resultURL;

                }

                const parsed =
                    new URL(
                        resultURL
                    );

                // DuckDuckGo redirect URL
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

                console.log(
                    "Could not parse result URL."
                );

            }

            // =================================================
            // CLEAN TEXT
            // =================================================

            const cleanedTitle =
                cleanSearchText(
                    title
                );

            const cleanedSnippet =
                cleanSearchText(
                    snippet
                );

            if (
                !cleanedTitle ||
                !resultURL
            ) {

                continue;

            }

            // =================================================
            // ADD RESULT
            // =================================================

            results.push({

                title:
                    cleanedTitle,

                url:
                    resultURL,

                snippet:
                    cleanedSnippet

            });

        }

        // ====================================================
        // SEARCH HARDENING
        // ====================================================

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

            results:
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

        // ====================================================
        // VALIDATION
        // ====================================================

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

        // ====================================================
        // SEARCH
        // ====================================================

        const result =
            await searchDuckDuckGo(
                query
            );

        // ====================================================
        // SEARCH FAILED
        // ====================================================

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

        // ====================================================
        // SUCCESS
        // ====================================================

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
//
// IMPORTANT:
//
// Liminal's actual conversation system is in script.js.
//
// The backend does NOT replace it.
//
// This endpoint simply confirms that the backend is alive.
// script.js should continue handling normal Liminal replies.
//
// ============================================================

app.post(
    "/api/chat",
    rateLimit,
    async (req, res) => {

        const message =
            req.body &&
            req.body.message;

        // ====================================================
        // VALIDATION
        // ====================================================

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
            `💬 Chat message received: "${cleanedMessage}"`
        );

        // ====================================================
        // IMPORTANT
        // ====================================================
        //
        // DO NOT generate a fake AI response here.
        //
        // The frontend handles Liminal's actual thinking,
        // memory, confidence, corrections, and responses.
        //
        // The backend simply acknowledges the request.
        //
        // ====================================================

        return res.json({

            success: true,

            backend:
                "online",

            handledBy:
                "frontend",

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
            "🌐 DuckDuckGo search: ENABLED"
        );

        console.log(
            "🛡️ CORS protection: ENABLED"
        );

        console.log(
            "🧠 Frontend AI system: ENABLED"
        );

        console.log(
            "=========================================="
        );

        console.log("");

    }
);

