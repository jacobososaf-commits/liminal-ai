// ==========================================
// LIMINAL AI 0.7
// MEMORY + LEARNING + CONFIDENCE + BACKEND + SEARCH
// ==========================================


// ==========================================
// BACKEND
// ==========================================

const BACKEND_URL =
    "https://liminal-ai-backend.onrender.com";


// ==========================================
// MEMORY
// ==========================================

let memory =
    JSON.parse(
        localStorage.getItem("liminalMemory")
    ) || {};


function saveMemory() {

    localStorage.setItem(
        "liminalMemory",
        JSON.stringify(memory)
    );

}


// ==========================================
// CORRECTIONS
// ==========================================

let corrections =
    JSON.parse(
        localStorage.getItem("liminalCorrections")
    ) || [];


function saveCorrections() {

    localStorage.setItem(
        "liminalCorrections",
        JSON.stringify(corrections)
    );

}


// ==========================================
// CONVERSATION CONTEXT
// ==========================================

let lastTopic = null;
let lastResponse = "";
let lastAction = null;
let lastQuestion = "";
let waitingForClarification = false;


// ==========================================
// CONFIDENCE
// ==========================================

let lastConfidence = "high";


function setConfidence(level) {

    lastConfidence = level;

}


// ==========================================
// BACKEND CONNECTION TEST
// ==========================================

async function testBackend() {

    try {

        const response =
            await fetch(
                BACKEND_URL + "/api/test"
            );


        if (!response.ok) {

            throw new Error(
                "Backend returned " +
                response.status
            );

        }


        const data =
            await response.json();


        console.log(
            "Backend response:",
            data.message
        );


        console.log(
            "✅ Liminal AI 0.7 backend connected!"
        );


        return true;

    } catch (error) {

        console.warn(
            "⚠️ Liminal AI backend is offline."
        );

        console.error(error);

        return false;

    }

}


// ==========================================
// BACKEND INFO
// ==========================================

async function getBackendInfo() {

    try {

        const response =
            await fetch(
                BACKEND_URL + "/api/info"
            );


        if (!response.ok) {

            throw new Error(
                "Backend info unavailable"
            );

        }


        const data =
            await response.json();


        console.log(
            "Liminal backend info:",
            data
        );


        return data;

    } catch (error) {

        console.warn(
            "Could not get backend info."
        );

        return null;

    }

}


// ==========================================
// SEARCH
// ==========================================

async function searchWeb(query) {

    try {

        const response =
            await fetch(
                BACKEND_URL +
                "/api/search?q=" +
                encodeURIComponent(query)
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Search failed"
            );

        }


        return data;

    } catch (error) {

        console.error(
            "Search error:",
            error
        );


        return {

            success: false,

            available: false,

            results: [],

            message:
                "The search service is currently unavailable."

        };

    }

}


// ==========================================
// SEARCH DETECTION
// ==========================================

function isSearchRequest(text) {

    const searchPhrases = [

        "search for ",
        "search ",
        "look up ",
        "look for ",
        "find information about ",
        "find info about ",
        "find out about ",
        "search the web for ",
        "search the web ",
        "google "

    ];


    for (
        const phrase of searchPhrases
    ) {

        if (
            text.startsWith(phrase)
        ) {

            return true;

        }

    }


    return false;

}


// ==========================================
// GET SEARCH QUERY
// ==========================================

function getSearchQuery(text) {

    const searchPhrases = [

        "search for ",
        "search ",
        "look up ",
        "look for ",
        "find information about ",
        "find info about ",
        "find out about ",
        "search the web for ",
        "search the web ",
        "google "

    ];


    for (
        const phrase of searchPhrases
    ) {

        if (
            text.startsWith(phrase)
        ) {

            return text
                .substring(
                    phrase.length
                )
                .trim();

        }

    }


    return text.trim();

}


// ==========================================
// PERSONALITY
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
// THEME
// ==========================================

function updateThemeButton() {

    const button =
        document.getElementById(
            "themeButton"
        );


    if (!button) {

        return;

    }


    const lightMode =
        document.body.classList.contains(
            "light-mode"
        );


    if (lightMode) {

        button.textContent =
            "🌙 Dark";

    } else {

        button.textContent =
            "☀️ Light";

    }

}


function toggleTheme() {

    document.body.classList.toggle(
        "light-mode"
    );


    const lightMode =
        document.body.classList.contains(
            "light-mode"
        );


    localStorage.setItem(
        "liminalTheme",
        lightMode
            ? "light"
            : "dark"
    );


    updateThemeButton();

}


function loadTheme() {

    const savedTheme =
        localStorage.getItem(
            "liminalTheme"
        );


    if (
        savedTheme === "light"
    ) {

        document.body.classList.add(
            "light-mode"
        );

    }


    updateThemeButton();

}


// ==========================================
// TEXT NORMALIZATION
// ==========================================

function normalizeText(text) {

    text =
        text
            .toLowerCase()
            .trim();


    const replacements = {

        "what's": "what is",
        "whats": "what is",

        "who's": "who is",
        "whos": "who is",

        "wats": "what is",
        "wat": "what",

        "fav": "favorite",
        "favourite": "favorite",

        "colour": "color",

        "u": "you",
        "ur": "your",

        "pls": "please",
        "plz": "please",

        "im": "i am",
        "i'm": "i am",

        "ive": "i have",
        "i've": "i have",

        "do u": "do you",
        "can u": "can you"

    };


    for (
        const wrong in replacements
    ) {

        const correct =
            replacements[wrong];


        const regex =
            new RegExp(
                "\\b" +
                wrong.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                ) +
                "\\b",
                "g"
            );


        text =
            text.replace(
                regex,
                correct
            );

    }


    text =
        text.replace(
            /\s+/g,
            " "
        );


    return text.trim();

}


// ==========================================
// FUZZY MATCHING
// ==========================================

function levenshtein(a, b) {

    const matrix = [];


    for (
        let i = 0;
        i <= b.length;
        i++
    ) {

        matrix[i] = [i];

    }


    for (
        let j = 0;
        j <= a.length;
        j++
    ) {

        matrix[0][j] = j;

    }


    for (
        let i = 1;
        i <= b.length;
        i++
    ) {

        for (
            let j = 1;
            j <= a.length;
            j++
        ) {

            if (
                b.charAt(i - 1) ===
                a.charAt(j - 1)
            ) {

                matrix[i][j] =
                    matrix[i - 1][j - 1];

            } else {

                matrix[i][j] =
                    Math.min(

                        matrix[i - 1][j - 1] + 1,

                        matrix[i][j - 1] + 1,

                        matrix[i - 1][j] + 1

                    );

            }

        }

    }


    return matrix[b.length][a.length];

}


function similarWord(word, target) {

    const distance =
        levenshtein(
            word,
            target
        );


    const maxDistance =
        word.length <= 4
            ? 1
            : 2;


    return distance <= maxDistance;

}


// ==========================================
// MEMORY HELPERS
// ==========================================

function cleanMemoryKey(key) {

    key =
        normalizeText(key)
            .replace(
                /[?!.]/g,
                ""
            )
            .trim();


    if (
        key.startsWith("my ")
    ) {

        key =
            key.substring(3);

    }


    return key;

}


function remember(key, value) {

    key =
        cleanMemoryKey(key);


    memory[key] =
        value;


    lastTopic =
        key;


    saveMemory();


    console.log(
        "🧠 Memory saved:",
        key,
        "=",
        value
    );

}


function getMemory(key) {

    key =
        cleanMemoryKey(key);


    return memory[key];

}


// ==========================================
// FIND MEMORY KEY
// ==========================================

function findMemoryKey(text) {

    text =
        normalizeText(text);


    // ======================================
    // FAVORITE GAME
    // ======================================

    if (
        text.includes("favorite game") ||
        text.includes("what game do i like") ||
        text.includes("which game do i like") ||
        text.includes("what videogame do i like") ||
        text.includes("what video game do i like") ||
        text.includes("what is my favorite game") ||
        text.includes("tell me my favorite game") ||
        text.includes("what is my favorite videogame") ||
        text.includes("what is my favorite video game")
    ) {

        return "favorite game";

    }


    // ======================================
    // FAVORITE COLOR
    // ======================================

    if (
        text.includes("favorite color") ||
        text.includes("what color do i like") ||
        text.includes("which color do i like") ||
        text.includes("what is my favorite color") ||
        text.includes("tell me my favorite color")
    ) {

        return "favorite color";

    }


    // ======================================
    // FAVORITE FOOD
    // ======================================

    if (
        text.includes("favorite food") ||
        text.includes("what food do i like") ||
        text.includes("which food do i like") ||
        text.includes("what is my favorite food") ||
        text.includes("tell me my favorite food")
    ) {

        return "favorite food";

    }


    // ======================================
    // NAME
    // ======================================

    if (
        text === "what is my name" ||
        text === "who am i" ||
        text.includes("my name")
    ) {

        return "name";

    }


    // ======================================
    // LOCATION
    // ======================================

    if (
        text.includes("where do i live") ||
        text.includes("where am i from") ||
        text.includes("what is my location") ||
        text.includes("my location")
    ) {

        return "location";

    }


    // ======================================
    // GENERIC MEMORY MATCH
    // ======================================

    const memoryKeys =
        Object.keys(memory);


    for (
        const key of memoryKeys
    ) {

        const normalizedKey =
            cleanMemoryKey(key);


        if (
            normalizedKey &&
            text.includes(normalizedKey)
        ) {

            return key;

        }

    }


    return null;

}


// ==========================================
// CORRECTIONS
// ==========================================

function isCorrection(text) {

    const correctionPhrases = [

        "no",
        "no that's wrong",
        "no that is wrong",
        "that's wrong",
        "that is wrong",
        "you are wrong",
        "you're wrong",
        "incorrect",
        "not correct",
        "actually",
        "that isn't right",
        "that is not right"

    ];


    for (
        const phrase of correctionPhrases
    ) {

        if (
            text === phrase ||
            text.startsWith(
                phrase + " "
            )
        ) {

            return true;

        }

    }


    return false;

}


function handleCorrection(text) {

    const original =
        text.trim();


    let correctionText =
        original
            .replace(
                /^no[, ]*/i,
                ""
            )
            .replace(
                /^actually[, ]*/i,
                ""
            )
            .replace(
                /^that's wrong[, ]*/i,
                ""
            )
            .replace(
                /^that is wrong[, ]*/i,
                ""
            )
            .trim();


    correctionText =
        normalizeText(
            correctionText
        );


    // ======================================
    // DIRECT MEMORY CORRECTION
    // ======================================

    if (
        correctionText.startsWith("my ") &&
        correctionText.includes(" is ")
    ) {

        const parts =
            correctionText.split(
                " is "
            );


        const key =
            parts[0]
                .substring(3)
                .trim();


        const value =
            parts
                .slice(1)
                .join(" is ")
                .trim();


        if (
            key &&
            value
        ) {

            const oldValue =
                memory[key];


            memory[key] =
                value;


            lastTopic =
                key;


            saveMemory();


            corrections.push({

                type:
                    "memory_update",

                key:
                    key,

                oldValue:
                    oldValue || null,

                newValue:
                    value,

                time:
                    new Date().toISOString()

            });


            saveCorrections();


            setConfidence(
                "high"
            );


            if (
                oldValue
            ) {

                return (
                    "You're right! I'll update my memory. " +
                    "Your " +
                    key +
                    " is now " +
                    value +
                    "."
                );

            }


            return (
                "Got it! I'll remember that your " +
                key +
                " is " +
                value +
                "."
            );

        }

    }


    // ======================================
    // IT IS / IT'S
    // ======================================

    if (
        correctionText.startsWith("it is ") ||
        correctionText.startsWith("it's ")
    ) {

        const value =
            correctionText.substring(
                6
            ).trim();


        if (
            lastTopic &&
            value
        ) {

            const oldValue =
                memory[lastTopic];


            memory[lastTopic] =
                value;


            saveMemory();


            corrections.push({

                type:
                    "context_update",

                key:
                    lastTopic,

                oldValue:
                    oldValue || null,

                newValue:
                    value,

                time:
                    new Date().toISOString()

            });


            saveCorrections();


            setConfidence(
                "high"
            );


            return (
                "You're right! I've corrected my memory. " +
                "Your " +
                lastTopic +
                " is now " +
                value +
                "."
            );

        }

    }


    // ======================================
    // GENERAL CORRECTION
    // ======================================

    if (
        lastTopic &&
        lastResponse
    ) {

        corrections.push({

            type:
                "response_correction",

            topic:
                lastTopic,

            previousResponse:
                lastResponse,

            correction:
                original,

            time:
                new Date().toISOString()

        });


        saveCorrections();


        setConfidence(
            "low"
        );


        return (
            "Got it. I know my previous answer was incorrect, " +
            "but I need the correct information to update my memory. " +
            "You can tell me by saying something like " +
            "\"my " +
            lastTopic +
            " is ...\"."
        );

    }


    setConfidence(
        "low"
    );


    return (
        "Got it. I understand that my previous answer was wrong. " +
        "Tell me what the correct answer is and I'll learn from it."
    );

}


// ==========================================
// CLARIFICATION
// ==========================================

function needsClarification(text) {

    const ambiguous = [

        "what",
        "why",
        "how",
        "which",
        "when",
        "where",
        "tell me",
        "explain"

    ];


    return ambiguous.includes(
        text
    );

}


function askClarification(text) {

    waitingForClarification =
        true;


    lastQuestion =
        text;


    setConfidence(
        "low"
    );


    if (
        text === "what"
    ) {

        return (
            "What would you like me to tell you about?"
        );

    }


    if (
        text === "why"
    ) {

        return (
            "What would you like me to explain why?"
        );

    }


    if (
        text === "how"
    ) {

        return (
            "What would you like to know how to do?"
        );

    }


    if (
        text === "which"
    ) {

        return (
            "Which things are you comparing?"
        );

    }


    if (
        text === "when"
    ) {

        return (
            "When are you asking about?"
        );

    }


    if (
        text === "where"
    ) {

        return (
            "Where are you asking about?"
        );

    }


    return (
        "Could you give me a little more detail?"
    );

}


// ==========================================
// SMART UNKNOWN
// ==========================================

function smartUnknown(text) {

    const words =
        normalizeText(text)
            .replace(
                /[?!.]/g,
                ""
            )
            .split(" ")
            .filter(
                word =>
                    word.length > 0
            );


    const memoryWords = [

        "my",
        "remember",
        "memory",
        "favorite",
        "color",
        "game",
        "food",
        "name",
        "live",
        "like"

    ];


    let memoryScore = 0;


    words.forEach(
        word => {

            for (
                const memoryWord of memoryWords
            ) {

                if (
                    word === memoryWord ||
                    similarWord(
                        word,
                        memoryWord
                    )
                ) {

                    memoryScore++;

                    break;

                }

            }

        }
    );


    if (
        memoryScore >= 2
    ) {

        setConfidence(
            "medium"
        );


        return (
            "I think you're asking about something I remember. " +
            "Try asking me something like " +
            "\"what is my favorite color?\""
        );

    }


    const timeWords = [
        "time",
        "clock",
        "hour"
    ];


    const dateWords = [
        "date",
        "day",
        "today"
    ];


    for (
        const word of words
    ) {

        for (
            const timeWord of timeWords
        ) {

            if (
                similarWord(
                    word,
                    timeWord
                )
            ) {

                setConfidence(
                    "medium"
                );


                return (
                    "I think you're asking about the time. " +
                    "Try asking \"what time is it?\""
                );

            }

        }


        for (
            const dateWord of dateWords
        ) {

            if (
                similarWord(
                    word,
                    dateWord
                )
            ) {

                setConfidence(
                    "medium"
                );


                return (
                    "I think you're asking about the date. " +
                    "Try asking \"what is the date?\""
                );

            }

        }

    }


    if (
        words.some(
            word =>
                similarWord(
                    word,
                    "joke"
                )
        )
    ) {

        setConfidence(
            "medium"
        );


        return (
            "I think you want a joke. " +
            "Try asking \"tell me a joke.\""
        );

    }


    setConfidence(
        "low"
    );


    return (
        "I'm not sure what you mean. Could you rephrase that?"
    );

}


// ==========================================
// THINK
// ==========================================

function think(originalText) {

    const text =
        normalizeText(
            originalText
        );


    setConfidence(
        "high"
    );


    // ======================================
    // CORRECTIONS
    // ======================================

    if (
        isCorrection(text)
    ) {

        return handleCorrection(
            text
        );

    }


    // ======================================
    // IMPORTANT:
    // CHECK MEMORY BEFORE CLARIFICATION
    // ======================================

    const possibleMemoryKey =
        findMemoryKey(
            text
        );


    if (
        possibleMemoryKey
    ) {

        const value =
            getMemory(
                possibleMemoryKey
            );


        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {

            lastTopic =
                possibleMemoryKey;


            setConfidence(
                "high"
            );


            console.log(
                "🧠 MEMORY HIT:",
                possibleMemoryKey,
                "=",
                value
            );


            return (
                "Your " +
                cleanMemoryKey(
                    possibleMemoryKey
                ) +
                " is " +
                value +
                "."
            );

        }


        setConfidence(
            "low"
        );


        return (
            "I don't remember your " +
            cleanMemoryKey(
                possibleMemoryKey
            ) +
            " yet."
        );

    }


    // ======================================
    // CLARIFICATION
    // ======================================

    if (
        needsClarification(
            text
        )
    ) {

        return askClarification(
            text
        );

    }


    waitingForClarification =
        false;


    // ======================================
    // TIME
    // ======================================

    if (
        text.includes(
            "what time is it"
        ) ||
        text === "time" ||
        text.includes(
            "current time"
        )
    ) {

        const now =
            new Date();


        return (
            "The current time is " +
            now.toLocaleTimeString(
                [],
                {
                    hour:
                        "2-digit",
                    minute:
                        "2-digit"
                }
            ) +
            "."
        );

    }


    // ======================================
    // DATE
    // ======================================

    if (
        text.includes(
            "what is the date"
        ) ||
        text === "date" ||
        text.includes(
            "what day is it"
        )
    ) {

        const now =
            new Date();


        return (
            "Today is " +
            now.toLocaleDateString(
                [],
                {
                    weekday:
                        "long",
                    year:
                        "numeric",
                    month:
                        "long",
                    day:
                        "numeric"
                }
            ) +
            "."
        );

    }


    // ======================================
    // GREETINGS
    // ======================================

    if (
        text === "hello" ||
        text === "hi" ||
        text === "hey" ||
        text === "hello there" ||
        text === "hey there"
    ) {

        return randomResponse([

            "Hello!",
            "Hey!",
            "Hey there!",
            "Hello there!",
            "Hi! 👋"

        ]);

    }


    // ======================================
    // HOW ARE YOU
    // ======================================

    if (
        text.includes(
            "how are you"
        ) ||
        text.includes(
            "how is it going"
        )
    ) {

        return randomResponse([

            "I'm doing great!",
            "I'm doing pretty well!",
            "I'm good! Thanks for asking.",
            "I'm running perfectly!",
            "Doing great! 🤖"

        ]);

    }


    // ======================================
    // NAME
    // ======================================

    if (
        text.includes(
            "what is your name"
        ) ||
        text.includes(
            "who are you"
        )
    ) {

        return (
            "I'm Liminal AI 0.7."
        );

    }


    // ======================================
    // CREATOR
    // ======================================

    if (
        text.includes(
            "who made you"
        ) ||
        text.includes(
            "who created you"
        ) ||
        text.includes(
            "who built you"
        )
    ) {

        return randomResponse([

            "I was created by Jacobo.",
            "Jacobo created me.",
            "My creator is Jacobo.",
            "I was made by Jacobo."

        ]);

    }


    // ======================================
    // JOKES
    // ======================================

    if (
        text.includes(
            "tell me a joke"
        ) ||
        text.includes(
            "make me laugh"
        ) ||
        text === "joke"
    ) {

        const jokes = [

            "Why did the computer go to the doctor? Because it had a virus.",

            "Why was the computer cold? It left its Windows open.",

            "What do computers eat? Microchips!",

            "Why did the programmer quit his job? He didn't get arrays."

        ];


        return randomResponse(
            jokes
        );

    }


    // ======================================
    // REMEMBER THAT
    // ======================================

    if (
        text.startsWith(
            "remember that "
        )
    ) {

        const information =
            text.substring(
                14
            ).trim();


        const parts =
            information.split(
                " is "
            );


        if (
            parts.length >= 2
        ) {

            const key =
                parts[0].trim();


            const value =
                parts
                    .slice(1)
                    .join(" is ")
                    .trim();


            remember(
                key,
                value
            );


            return (
                "I'll remember that your " +
                cleanMemoryKey(
                    key
                ) +
                " is " +
                value +
                "."
            );

        }


        return (
            "Try saying: remember that my favorite color is yellow."
        );

    }


    // ======================================
    // NATURAL MEMORY
    // ======================================

    if (
        text.startsWith("my ") &&
        text.includes(" is ")
    ) {

        const parts =
            text.split(
                " is "
            );


        const key =
            parts[0]
                .substring(3)
                .trim();


        const value =
            parts
                .slice(1)
                .join(" is ")
                .trim();


        remember(
            key,
            value
        );


        return (
            "Got it. I'll remember that your " +
            cleanMemoryKey(
                key
            ) +
            " is " +
            value +
            "."
        );

    }


    // ======================================
    // I AM
    // ======================================

    if (
        text.startsWith(
            "i am "
        )
    ) {

        const value =
            text.substring(
                5
            ).trim();


        remember(
            "identity",
            value
        );


        return (
            "Got it. I'll remember that you are " +
            value +
            "."
        );

    }


    // ======================================
    // I LIVE IN
    // ======================================

    if (
        text.startsWith(
            "i live in "
        )
    ) {

        const value =
            text.substring(
                10
            ).trim();


        remember(
            "location",
            value
        );


        return (
            "Got it. I'll remember that you live in " +
            value +
            "."
        );

    }


    // ======================================
    // WHAT IS MY
    // ======================================

    if (
        text.startsWith(
            "what is my "
        ) ||
        text.startsWith(
            "tell me my "
        )
    ) {

        const key =
            text.substring(
                11
            );


        const cleanKey =
            cleanMemoryKey(
                key
            );


        const value =
            getMemory(
                cleanKey
            );


        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {

            lastTopic =
                cleanKey;


            return (
                "Your " +
                cleanKey +
                " is " +
                value +
                "."
            );

        }


        setConfidence(
            "low"
        );


        return (
            "I don't remember your " +
            cleanKey +
            " yet."
        );

    }


    // ======================================
    // SHOW MEMORY
    // ======================================

    if (
        text === "what do you remember" ||
        text === "show my memories" ||
        text === "what do you know about me"
    ) {

        const keys =
            Object.keys(
                memory
            );


        if (
            keys.length === 0
        ) {

            return (
                "I don't remember anything yet."
            );

        }


        let response =
            "Here's what I remember:\n\n";


        keys.forEach(
            function(key) {

                response +=
                    "• " +
                    key +
                    " = " +
                    memory[key] +
                    "\n";

            }
        );


        return response;

    }


    // ======================================
    // SHOW CORRECTIONS
    // ======================================

    if (
        text === "show corrections" ||
        text === "what have you learned" ||
        text === "show what you learned"
    ) {

        if (
            corrections.length === 0
        ) {

            return (
                "I haven't learned any corrections yet."
            );

        }


        let response =
            "Here's what I've learned:\n\n";


        corrections.forEach(
            function(item, index) {

                if (
                    item.key
                ) {

                    response +=
                        "• " +
                        item.key +
                        ": " +
                        (
                            item.oldValue ||
                            "unknown"
                        ) +
                        " → " +
                        item.newValue +
                        "\n";

                } else {

                    response +=
                        "• Correction " +
                        (
                            index + 1
                        ) +
                        "\n";

                }

            }
        );


        return response;

    }


    // ======================================
    // FORGET
    // ======================================

    if (
        text.startsWith("forget my ") ||
        text.startsWith("forget ")
    ) {

        let key;


        if (
            text.startsWith("forget my ")
        ) {

            key =
                text.substring(10);

        } else {

            key =
                text.substring(7);

        }


        key =
            cleanMemoryKey(
                key
            );


        if (
            memory[key]
        ) {

            delete memory[key];

            saveMemory();


            return (
                "Okay, I forgot your " +
                key +
                "."
            );

        }


        return (
            "I don't have a memory about your " +
            key +
            "."
        );

    }


    // ======================================
    // CONTEXT
    // ======================================

    if (
        text === "what is it" ||
        text === "what is that" ||
        text === "what was it" ||
        text === "what's it" ||
        text === "what's that" ||
        text === "tell me about it"
    ) {

        if (
            lastTopic
        ) {

            const value =
                getMemory(
                    lastTopic
                );


            if (
                value
            ) {

                return (
                    "Your " +
                    lastTopic +
                    " is " +
                    value +
                    "."
                );

            }

        }


        setConfidence(
            "low"
        );


        return (
            "I'm not sure what \"it\" refers to yet."
        );

    }


    // ======================================
    // FOLLOW-UP
    // ======================================

    if (
        text === "why" ||
        text === "how come"
    ) {

        if (
            lastTopic
        ) {

            setConfidence(
                "medium"
            );


            return (
                "Because that's the information I currently " +
                "have stored about your " +
                lastTopic +
                "."
            );

        }


        setConfidence(
            "low"
        );


        return (
            "I'm not sure what you're referring to."
        );

    }


    if (
        text === "which one" ||
        text === "what one"
    ) {

        if (
            lastTopic
        ) {

            const value =
                getMemory(
                    lastTopic
                );


            if (
                value
            ) {

                return (
                    "The one I remember is " +
                    value +
                    "."
                );

            }

        }


        setConfidence(
            "low"
        );


        return (
            "I'm not sure which one you mean."
        );

    }


    // ======================================
    // MATH
    // ======================================

    if (
        text.match(
            /^[0-9+\-*/().\s]+$/
        )
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

        } catch (error) {

            setConfidence(
                "low"
            );


            return (
                "I couldn't calculate that."
            );

        }

    }


    // ======================================
    // UNKNOWN
    // ======================================

    return smartUnknown(
        text
    );

}


// ==========================================
// DISPLAY RESPONSE SAFELY
// ==========================================

function displayAIResponse(
    element,
    text
) {

    element.textContent =
        text;

}


// ==========================================
// SEND MESSAGE
// ==========================================

async function sendMessage() {

    const input =
        document.getElementById(
            "userInput"
        );


    const messages =
        document.getElementById(
            "messages"
        );


    if (
        !input ||
        !messages
    ) {

        return;

    }


    const originalText =
        input.value.trim();


    if (
        originalText === ""
    ) {

        return;

    }


    const normalized =
        normalizeText(
            originalText
        );


    // ======================================
    // USER MESSAGE
    // ======================================

    const userMessage =
        document.createElement(
            "div"
        );


    userMessage.className =
        "user";


    userMessage.textContent =
        originalText;


    messages.appendChild(
        userMessage
    );


    input.value = "";


    messages.scrollTop =
        messages.scrollHeight;


    // ======================================
    // AI MESSAGE
    // ======================================

    const aiMessage =
        document.createElement(
            "div"
        );


    aiMessage.className =
        "ai";


    aiMessage.textContent =
        "Thinking... 🤔";


    messages.appendChild(
        aiMessage
    );


    messages.scrollTop =
        messages.scrollHeight;


    // ======================================
    // EXPLICIT SEARCH
    // ======================================

    if (
        isSearchRequest(
            normalized
        )
    ) {

        const query =
            getSearchQuery(
                normalized
            );


        if (
            query
        ) {

            aiMessage.textContent =
                "Searching... 🌐";


            const searchResult =
                await searchWeb(
                    query
                );


            if (
                searchResult.success &&
                searchResult.available
            ) {

                let response =
                    "Search results for: " +
                    query +
                    "\n\n";


                if (
                    searchResult.results &&
                    searchResult.results.length > 0
                ) {

                    searchResult.results.forEach(
                        function(result, index) {

                            response +=
                                (
                                    index + 1
                                ) +
                                ". " +
                                (
                                    result.title ||
                                    "Untitled result"
                                ) +
                                "\n";


                            if (
                                result.snippet
                            ) {

                                response +=
                                    result.snippet +
                                    "\n";

                            }


                            if (
                                result.url
                            ) {

                                response +=
                                    result.url +
                                    "\n";

                            }


                            response +=
                                "\n";

                        }
                    );

                } else {

                    response +=
                        "No results were found.";

                }


                displayAIResponse(
                    aiMessage,
                    response
                );


                lastResponse =
                    response;

            } else {

                displayAIResponse(
                    aiMessage,
                    "The search endpoint is working, but a real search provider hasn't been connected yet. 🌐"
                );


                lastResponse =
                    aiMessage.textContent;

            }


            messages.scrollTop =
                messages.scrollHeight;


            return;

        }

    }


    // ======================================
    // LOCAL BRAIN FIRST
    // ======================================

    const localReply =
        think(
            originalText
        );


    console.log(
        "Liminal local confidence:",
        lastConfidence
    );


    // ======================================
    // HIGH CONFIDENCE
    // ======================================

    if (
        lastConfidence === "high"
    ) {

        displayAIResponse(
            aiMessage,
            localReply
        );


        lastResponse =
            localReply;


        messages.scrollTop =
            messages.scrollHeight;


        console.log(
            "🧠 Local 0.6 brain answered."
        );


        return;

    }


    // ======================================
    // MEDIUM CONFIDENCE
    // ======================================

    if (
        lastConfidence === "medium"
    ) {

        displayAIResponse(
            aiMessage,
            localReply
        );


        lastResponse =
            localReply;


        messages.scrollTop =
            messages.scrollHeight;


        console.log(
            "🧠 Local brain answered with medium confidence."
        );


        return;

    }


    // ======================================
    // LOW CONFIDENCE
    // ======================================

    aiMessage.textContent =
        "Thinking harder... 🧠";


    try {

        const response =
            await fetch(
                BACKEND_URL +
                "/api/chat",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            message:
                                originalText

                        })

                }
            );


        if (
            !response.ok
        ) {

            throw new Error(
                "Backend returned " +
                response.status
            );

        }


        const data =
            await response.json();


        if (
            data.success &&
            data.reply
        ) {

            displayAIResponse(
                aiMessage,
                data.reply
            );


            lastResponse =
                data.reply;


            setConfidence(
                "medium"
            );


            console.log(
                "🌐 Backend answered."
            );

        } else {

            throw new Error(
                "Invalid backend response"
            );

        }

    } catch (error) {

        console.warn(
            "Backend unavailable. Using local Liminal AI."
        );


        console.error(
            error
        );


        displayAIResponse(
            aiMessage,
            localReply
        );


        lastResponse =
            localReply;

    }


    messages.scrollTop =
        messages.scrollHeight;

}


// ==========================================
// ENTER KEY
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        const input =
            document.getElementById(
                "userInput"
            );


        if (
            input
        ) {

            input.addEventListener(
                "keydown",
                function(event) {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        sendMessage();

                    }

                }
            );

        }


        loadTheme();


        testBackend();


        getBackendInfo();

    }
);


// ==========================================
// CLEAR CHAT
// ==========================================

function clearChat() {

    const messages =
        document.getElementById(
            "messages"
        );


    if (
        !messages
    ) {

        return;

    }


    messages.innerHTML = "";


    const welcome =
        document.createElement(
            "div"
        );


    welcome.className =
        "ai";


    welcome.textContent =
        "Hello! I'm Liminal AI 0.7.";


    messages.appendChild(
        welcome
    );


    lastTopic =
        null;

    lastResponse =
        "";

    lastAction =
        null;

    lastQuestion =
        "";

    waitingForClarification =
        false;

    setConfidence(
        "high"
    );

}
