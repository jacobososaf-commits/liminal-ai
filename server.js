// ==========================================
// LIMINAL AI 0.8 BACKEND
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
        version: "0.8.0"
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
// DUCKDUCKGO JSON SEARCH
// ==========================================

function duckDuckGoSearch(query) {

    return new Promise((resolve, reject) => {

        const url =
            "https://api.duckduckgo.com/?q=" +
            encodeURIComponent(query) +
            "&format=json" +
            "&no_html=1" +
            "&skip_disambig=1";


        const request = https.get(
            url,
            {
                headers: {
                    "User-Agent": "LiminalAI/0.8"
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

                        const json =
                            JSON.parse(data);

                        resolve(json);

                    } catch (error) {

                        reject(
                            new Error(
                                "Invalid DuckDuckGo response."
                            )
                        );

                    }

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
        "Liminal web search:",
        query
    );


    try {

        const data =
            await duckDuckGoSearch(query);


        const results = [];


        // ==================================
        // MAIN RESULT
        // ==================================

        if (
            data.AbstractText &&
            data.AbstractURL
        ) {

            results.push({

                title:
                    data.Heading ||
                    query,

                url:
                    data.AbstractURL,

                snippet:
                    data.AbstractText

            });

        }


        // ==================================
        // RELATED TOPICS
        // ==================================

        function addTopics(topics) {

            if (!Array.isArray(topics)) {
                return;
            }


            for (const topic of topics) {

                if (results.length >= 10) {
                    break;
                }


                // Some topics contain nested Topics
                if (topic.Topics) {

                    addTopics(topic.Topics);

                    continue;

                }


                if (
                    topic.Text &&
                    topic.FirstURL
                ) {

                    results.push({

                        title:
                            topic.Text,

                        url:
                            topic.FirstURL,

                        snippet:
                            topic.Text

                    });

                }

            }

        }


        addTopics(data.RelatedTopics);


        // ==================================
        // RESPONSE
        // ==================================

        console.log(
            "Search results:",
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
            "Web search failed:",
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
        `Liminal AI 0.8 backend running on port ${PORT}`
    );

});