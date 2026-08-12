// ==========================================
// LIMINAL AI 0.75 BACKEND
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
        version: "0.75"
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
// DUCKDUCKGO SEARCH
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
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",

                    "Accept":
                        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

                    "Accept-Language":
                        "en-US,en;q=0.9"
                }
            },

            (response) => {

                let data = "";


                response.on("data", (chunk) => {

                    data += chunk;

                });


                response.on("end", () => {

                    if (response.statusCode < 200 ||
                        response.statusCode >= 300) {

                        reject(
                            new Error(
                                "DuckDuckGo HTTP " +
                                response.statusCode
                            )
                        );

                        return;
                    }


                    resolve(data);

                });

            }
        );


        request.setTimeout(15000, () => {

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
// SEARCH ENDPOINT
// ==========================================

app.get("/api/search", async (req, res) => {

    const query =
        String(req.query.q || "").trim();


    if (!query) {

        return res.status(400).json({

            success: false,

            available: false,

            results: [],

            message: "Missing search query."

        });

    }


    console.log(
        "DuckDuckGo search:",
        query
    );


    try {

        const html =
            await duckDuckGoSearch(query);


        const results = [];


        // ==================================
        // FIND RESULT BLOCKS
        // ==================================

        const resultRegex =
            /<div[^>]+class="[^"]*result[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi;


        const blocks =
            html.match(resultRegex) || [];


        // ==================================
        // PARSE RESULTS
        // ==================================

        for (const block of blocks) {

            if (results.length >= 10) {
                break;
            }


            const linkMatch =
                block.match(
                    /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i
                );


            if (!linkMatch) {
                continue;
            }


            let url =
                linkMatch[1];


            let title =
                linkMatch[2];


            // ==================================
            // CLEAN TITLE
            // ==================================

            title = title
                .replace(/<[^>]+>/g, "")
                .replace(/&amp;/g, "&")
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .trim();


            // ==================================
            // GET REAL URL
            // ==================================

            try {

                if (url.includes("uddg=")) {

                    const parsed =
                        new URL(
                            url,
                            "https://html.duckduckgo.com"
                        );


                    const realURL =
                        parsed.searchParams.get("uddg");


                    if (realURL) {

                        url =
                            decodeURIComponent(realURL);

                    }

                }

            } catch (error) {

                console.log(
                    "URL parsing error:",
                    error.message
                );

            }


            // ==================================
            // SNIPPET
            // ==================================

            let snippet = "";


            const snippetMatch =
                block.match(
                    /class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div)>/i
                );


            if (snippetMatch) {

                snippet =
                    snippetMatch[1]
                        .replace(/<[^>]+>/g, "")
                        .replace(/&amp;/g, "&")
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .trim();

            }


            results.push({

                title: title,

                url: url,

                snippet: snippet

            });

        }


        // ==================================
        // RESPONSE
        // ==================================

        console.log(
            "DuckDuckGo results:",
            results.length
        );


        res.json({

            success: true,

            available: true,

            results: results,

            query: query

        });


    } catch (error) {

        console.error(
            "DuckDuckGo search failed:",
            error.message
        );


        res.status(503).json({

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

        message: "Endpoint not found."

    });

});


// ==========================================
// START
// ==========================================

app.listen(PORT, () => {

    console.log(
        `Liminal AI 0.75 backend running on port ${PORT}`
    );

});
