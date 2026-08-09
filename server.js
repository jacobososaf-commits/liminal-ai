// ==========================================
// LIMINAL AI 0.7
// BACKEND API
// FREE WEB SEARCH
// ==========================================

const http = require("http");

const PORT = process.env.PORT || 3000;



// ==========================================
// RESPONSE HELPER
// ==========================================

function sendJSON(res, status, data) {

    res.writeHead(
        status,
        {
            "Content-Type":
                "application/json",

            "Access-Control-Allow-Origin":
                "*",

            "Access-Control-Allow-Methods":
                "GET, POST, OPTIONS",

            "Access-Control-Allow-Headers":
                "Content-Type"
        }
    );

    res.end(
        JSON.stringify(data)
    );

}


// ==========================================
// RANDOM RESPONSE
// ==========================================

function randomResponse(responses) {

    return responses[
        Math.floor(
            Math.random() *
            responses.length
        )
    ];

}


// ==========================================
// LOCAL BACKEND THINKING
// ==========================================

function think(message) {

    const text =
        message
            .toLowerCase()
            .trim();


    // -------------------------------
    // HELLO
    // -------------------------------

    if (
        text === "hello" ||
        text === "hi" ||
        text === "hey"
    ) {

        return randomResponse([

            "Hello! 👋",

            "Hey there!",

            "Hi! 🤖",

            "Hello! How can I help?"

        ]);

    }


    // -------------------------------
    // NAME
    // -------------------------------

    if (
        text.includes("what is your name") ||
        text.includes("who are you")
    ) {

        return "I'm Liminal AI 0.7.";

    }


    // -------------------------------
    // CREATOR
    // -------------------------------

    if (
        text.includes("who made you") ||
        text.includes("who created you") ||
        text.includes("who built you")
    ) {

        return "I was created by Jacobo. 🤖";

    }


    // -------------------------------
    // TIME
    // -------------------------------

    if (
        text.includes("what time is it") ||
        text === "time"
    ) {

        return (
            "The current time is " +
            new Date().toLocaleTimeString()
        );

    }


    // -------------------------------
    // DATE
    // -------------------------------

    if (
        text.includes("what is the date") ||
        text === "date"
    ) {

        return (
            "Today is " +
            new Date().toLocaleDateString()
        );

    }


    // -------------------------------
    // JOKE
    // -------------------------------

    if (
        text.includes("tell me a joke") ||
        text === "joke"
    ) {

        return randomResponse([

            "Why did the computer get cold? It left its Windows open. 😂",

            "What do computers eat? Microchips! 🤖",

            "Why was the computer tired? It had too many tabs open."

        ]);

    }


    // -------------------------------
    // MATH
    // -------------------------------

    if (
        /^[0-9+\-*/().\s]+$/.test(text)
    ) {

        try {

            const answer =
                Function(
                    '"use strict"; return (' +
                    text +
                    ')'
                )();


            return (
                "The answer is " +
                answer +
                "."
            );

        } catch {

            return (
                "I couldn't calculate that."
            );

        }

    }


    // -------------------------------
    // UNKNOWN
    // -------------------------------

    return (
        "I don't know that yet, but you can ask me to search the web."
    );

}


// ==========================================
// FREE WEB SEARCH
// DUCKDUCKGO HTML
// ==========================================

async function searchWeb(query) {

    try {

        const searchURL =
            "https://html.duckduckgo.com/html/?q=" +
            encodeURIComponent(query);


        const response =
            await fetch(
                searchURL,
                {
                    headers: {
                        "User-Agent":
                            "LiminalAI/0.7"
                    }
                }
            );


        if (!response.ok) {

            throw new Error(
                "DuckDuckGo returned HTTP " +
                response.status
            );

        }


        const html =
            await response.text();


        const results = [];


        // ==================================
        // FIND RESULT BLOCKS
        // ==================================

        const resultPattern =
            /<div class="result[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;


        const matches =
            html.match(
                resultPattern
            ) || [];


        // ==================================
        // PARSE RESULTS
        // ==================================

        for (
            let i = 0;
            i < matches.length &&
            results.length < 5;
            i++
        ) {

            const block =
                matches[i];


            // ------------------------------
            // TITLE
            // ------------------------------

            const titleMatch =
                block.match(
                    /<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/i
                );


            // ------------------------------
            // URL
            // ------------------------------

            const urlMatch =
                block.match(
                    /<a[^>]*class="result__a"[^>]*href="([^"]+)"/i
                );


            // ------------------------------
            // SNIPPET
            // ------------------------------

            const snippetMatch =
                block.match(
                    /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i
                );


            if (
                !titleMatch
            ) {

                continue;

            }


            const title =
                cleanHTML(
                    titleMatch[1]
                );


            const snippet =
                snippetMatch
                    ? cleanHTML(
                        snippetMatch[1]
                    )
                    : "";


            let url =
                urlMatch
                    ? cleanHTML(
                        urlMatch[1]
                    )
                    : "";


            // DuckDuckGo sometimes gives
            // redirect URLs instead of the
            // final destination.

            if (
                url.startsWith(
                    "//duckduckgo.com/l/?"
                )
            ) {

                try {

                    const redirectURL =
                        new URL(
                            "https:" +
                            url
                        );


                    const actualURL =
                        redirectURL.searchParams.get(
                            "uddg"
                        );


                    if (
                        actualURL
                    ) {

                        url =
                            decodeURIComponent(
                                actualURL
                            );

                    }

                } catch {

                    // Keep original URL

                }

            }


            results.push({

                title:
                    title,

                snippet:
                    snippet,

                url:
                    url

            });

        }


        return {

            success:
                true,

            available:
                true,

            results:
                results,

            query:
                query

        };


    } catch (error) {

        console.error(
            "Web search error:",
            error
        );


        return {

            success:
                false,

            available:
                false,

            results:
                [],

            message:
                "Free web search is currently unavailable."

        };

    }

}


// ==========================================
// HTML CLEANER
// ==========================================

function cleanHTML(text) {

    if (!text) {

        return "";

    }


    return text

        // Remove HTML tags
        .replace(
            /<[^>]*>/g,
            ""
        )

        // Decode common HTML entities
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
        )

        .replace(
            /&nbsp;/g,
            " "
        )

        .trim();

}


// ==========================================
// SERVER
// ==========================================

const server =
    http.createServer(
        (req, res) => {

            // ==================================
            // CORS
            // ==================================

            res.setHeader(
                "Access-Control-Allow-Origin",
                "*"
            );


            res.setHeader(
                "Access-Control-Allow-Methods",
                "GET, POST, OPTIONS"
            );


            res.setHeader(
                "Access-Control-Allow-Headers",
                "Content-Type"
            );


            // ==================================
            // OPTIONS
            // ==================================

            if (
                req.method === "OPTIONS"
            ) {

                res.writeHead(204);

                res.end();

                return;

            }


            // ==================================
            // PARSE URL
            // ==================================

            const parsedURL =
                new URL(
                    req.url,
                    "http://localhost:" + PORT
                );


            // ==================================
            // API STATUS
            // ==================================

            if (
                req.method === "GET" &&
                parsedURL.pathname === "/api/test"
            ) {

                sendJSON(
                    res,
                    200,
                    {

                        success:
                            true,

                        version:
                            "0.7",

                        status:
                            "online",

                        message:
                            "Liminal AI backend is working!"

                    }
                );

                return;

            }


            // ==================================
            // API INFO
            // ==================================

            if (
                req.method === "GET" &&
                parsedURL.pathname === "/api/info"
            ) {

                sendJSON(
                    res,
                    200,
                    {

                        name:
                            "Liminal AI",

                        version:
                            "0.7",

                        backend:
                            true,

                        search:
                            true,

                        searchProvider:
                            "DuckDuckGo",

                        status:
                            "online"

                    }
                );

                return;

            }


            // ==================================
            // FREE WEB SEARCH
            // ==================================

            if (
                req.method === "GET" &&
                parsedURL.pathname === "/api/search"
            ) {

                const query =
                    parsedURL.searchParams.get(
                        "q"
                    );


                if (
                    !query ||
                    query.trim() === ""
                ) {

                    sendJSON(
                        res,
                        400,
                        {

                            success:
                                false,

                            available:
                                true,

                            error:
                                "Search query is empty."

                        }
                    );

                    return;

                }


                console.log(
                    "🌐 Web search:",
                    query
                );


                searchWeb(
                    query
                )
                    .then(
                        result => {

                            sendJSON(
                                res,
                                result.success
                                    ? 200
                                    : 502,
                                result
                            );

                        }
                    )
                    .catch(
                        error => {

                            console.error(
                                error
                            );


                            sendJSON(
                                res,
                                500,
                                {

                                    success:
                                        false,

                                    available:
                                        false,

                                    results:
                                        [],

                                    error:
                                        "Search failed."

                                }
                            );

                        }
                    );


                return;

            }


            // ==================================
            // CHAT
            // ==================================

            if (
                req.method === "POST" &&
                parsedURL.pathname === "/api/chat"
            ) {

                let body = "";


                req.on(
                    "data",
                    chunk => {

                        body += chunk;

                    }
                );


                req.on(
                    "end",
                    () => {

                        try {

                            const data =
                                JSON.parse(
                                    body
                                );


                            const message =
                                String(
                                    data.message || ""
                                ).trim();


                            if (
                                message === ""
                            ) {

                                sendJSON(
                                    res,
                                    400,
                                    {

                                        success:
                                            false,

                                        error:
                                            "Message is empty."

                                    }
                                );

                                return;

                            }


                            console.log(
                                "Liminal received:",
                                message
                            );


                            const reply =
                                think(
                                    message
                                );


                            sendJSON(
                                res,
                                200,
                                {

                                    success:
                                        true,

                                    version:
                                        "0.7",

                                    reply:
                                        reply

                                }
                            );


                        } catch (
                            error
                        ) {

                            console.error(
                                error
                            );


                            sendJSON(
                                res,
                                400,
                                {

                                    success:
                                        false,

                                    error:
                                        "Invalid JSON."

                                }
                            );

                        }

                    }
                );


                return;

            }


            // ==================================
            // 404
            // ==================================

            sendJSON(
                res,
                404,
                {

                    success:
                        false,

                    error:
                        "API endpoint not found."

                }
            );

        }
    );


// ==========================================
// START
// ==========================================

server.listen(
    PORT,
    () => {

        console.log(
            "=================================="
        );

        console.log(
            "LIMINAL AI 0.7 BACKEND"
        );

        console.log(
            "=================================="
        );

        console.log(
            "Server: http://localhost:" +
            PORT
        );

        console.log(
            "Status: ONLINE"
        );

        console.log(
            "Chat:   /api/chat"
        );

        console.log(
            "Info:   /api/info"
        );

        console.log(
            "Search: /api/search"
        );

        console.log(
            "Provider: DuckDuckGo"
        );

        console.log(
            "=================================="
        );

    }
);
