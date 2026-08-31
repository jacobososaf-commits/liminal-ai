// ==========================================
// LIMINAL AI 0.8 BACKEND
// SEARCH FIX
// ==========================================

const express = require("express");
const cors = require("cors");
const https = require("https");

const app = express();

const PORT = process.env.PORT || 3000;


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
        version: "0.8.1"
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
// DUCKDUCKGO WEB SEARCH
//
// IMPORTANT:
// api.duckduckgo.com is an Instant Answer API,
// NOT a normal web-search-results API.
//
// We use DuckDuckGo's HTML search endpoint
// instead and parse the results.
// ==========================================

function duckDuckGoSearch(query) {

    return new Promise((resolve, reject) => {

        const url =
            "https://html.duckduckgo.com/html/?q=" +
            encodeURIComponent(query);


        const request = https.get(
            url,
            {
                headers: {

                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
                        "AppleWebKit/537.36 " +
                        "(KHTML, like Gecko) " +
                        "Chrome/140.0 Safari/537.36",

                    "Accept":
                        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

                    "Accept-Language":
                        "en-US,en;q=0.9",

                    "Referer":
                        "https://html.duckduckgo.com/"

                }
            },

            (response) => {

                let data = "";


                response.on("data", (chunk) => {

                    data += chunk;

                });


                response.on("end", () => {

                    if (
                        response.statusCode < 200 ||
                        response.statusCode >= 300
                    ) {

                        reject(
                            new Error(
                                "DuckDuckGo HTTP " +
                                response.statusCode
                            )
                        );

                        return;
                    }


                    try {

                        const results =
                            parseDuckDuckGoHTML(data);


                        resolve(results);

                    } catch (error) {

                        reject(error);

                    }

                });

            }
        );


        request.setTimeout(20000, () => {

            request.destroy();

            reject(
                new Error(
                    "DuckDuckGo request timed out."
                )
            );

        });


        request.on("error", (error) => {

            reject(error);

        });

    });

}


// ==========================================
// HTML ENTITY DECODER
// ==========================================

function decodeHTML(text) {

    return String(text || "")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/gi, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ")
        .replace(/&#(\d+);/g, (match, code) => {

            return String.fromCharCode(
                Number(code)
            );

        })
        .replace(/&#x([0-9a-f]+);/gi, (match, code) => {

            return String.fromCharCode(
                parseInt(code, 16)
            );

        });

}


// ==========================================
// REMOVE HTML
// ==========================================

function stripHTML(text) {

    return decodeHTML(
        String(text || "")
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
    );

}


// ==========================================
// PARSE DUCKDUCKGO RESULTS
// ==========================================

function parseDuckDuckGoHTML(html) {

    const results = [];


    // ======================================
    // RESULT BLOCKS
    // ======================================

    const resultRegex =
        /<div[^>]*class="[^"]*result[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi;


    const blocks =
        html.match(resultRegex) || [];


    // ======================================
    // PARSE EACH RESULT
    // ======================================

    for (const block of blocks) {

        if (results.length >= 10) {
            break;
        }


        // ----------------------------------
        // RESULT LINK
        // ----------------------------------

        const linkMatch =
            block.match(
                /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i
            );


        if (!linkMatch) {
            continue;
        }


        let url =
            decodeHTML(linkMatch[1]);


        let title =
            stripHTML(linkMatch[2]);


        // ----------------------------------
        // RESULT SNIPPET
        // ----------------------------------

        const snippetMatch =
            block.match(
                /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i
            );


        let snippet = "";


        if (snippetMatch) {

            snippet =
                stripHTML(
                    snippetMatch[1]
                );

        }


        // Some DuckDuckGo versions use
        // <div class="result__snippet"> instead.
        if (!snippet) {

            const divSnippet =
                block.match(
                    /<div[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/i
                );


            if (divSnippet) {

                snippet =
                    stripHTML(
                        divSnippet[1]
                    );

            }

        }


        // ----------------------------------
        // CLEAN RESULT
        // ----------------------------------

        if (
            title &&
            url
        ) {

            // DuckDuckGo can sometimes return
            // redirect URLs. Try to extract the
            // actual URL when possible.

            try {

                const parsed =
                    new URL(url);


                const uddg =
                    parsed.searchParams.get("uddg");


                if (uddg) {

                    url =
                        decodeURIComponent(
                            uddg
                        );

                }

            } catch (error) {

                // Keep original URL.
            }


            results.push({

                title:
                    title,

                url:
                    url,

                snippet:
                    snippet

            });

        }

    }


    return results;

}


// ==========================================
// SEARCH ENDPOINT
// ==========================================

app.get("/api/search", async (req, res) => {

    const query =
        String(
            req.query.q || ""
        ).trim();


    // ======================================
    // VALIDATE QUERY
    // ======================================

    if (!query) {

        return res.status(400).json({

            success: false,

            available: false,

            results: [],

            message:
                "Missing search query."

        });

    }


    console.log(
        "Liminal web search:",
        query
    );


    // ======================================
    // SEARCH
    // ======================================

    try {

        const results =
            await duckDuckGoSearch(
                query
            );


        console.log(
            "Search results:",
            results.length
        );


        // ==================================
        // SUCCESS
        // ==================================

        return res.json({

            success: true,

            available: true,

            results:

                results,

            query:
                query

        });


    } catch (error) {

        console.error(
            "Web search failed:",
            error.message
        );


        // ==================================
        // FAILURE
        // ==================================

        return res.status(503).json({

            success: false,

            available: false,

            results: [],

            message:
                "The search service is temporarily unavailable."

        });

    }

});


// ==========================================
// 404
// ==========================================

app.use((req, res) => {

    res.status(404).json({

        success: false,

        message:
            "Endpoint not found."

    });

});


// ==========================================
// START
// ==========================================

app.listen(
    PORT,
    () => {

        console.log(
            `Liminal AI backend running on port ${PORT}`
        );

    }
);