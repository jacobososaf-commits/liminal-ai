// ==========================================
// LIMINAL AI 0.75.1
// liminal.js
//
// ORIGINAL LIMINAL AI AGENT
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
        localStorage.getItem("liminalMemory") || "{}"
    );

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
        localStorage.getItem("liminalCorrections") || "[]"
    );

function saveCorrections() {

    localStorage.setItem(
        "liminalCorrections",
        JSON.stringify(corrections)
    );

}


// ==========================================
// CONTEXT
// ==========================================

let lastTopic = null;
let lastResponse = "";
let lastQuestion = "";
let waitingForClarification = false;

let lastConfidence = "high";

function setConfidence(level) {

    lastConfidence = level;

}


// ==========================================
// NORMALIZATION
// ==========================================

function normalizeText(text) {

    text = String(text || "")
        .toLowerCase()
        .trim();

    const replacements = {

        "whats": "what is",
        "wats": "what is",
        "wat": "what",
        "whos": "who is",
        "fav": "favorite",
        "favourite": "favorite",
        "colour": "color",
        "pls": "please",
        "plz": "please",
        "im": "i am",
        "ive": "i have",
        "u": "you",
        "ur": "your"

    };

    for (const wrong in replacements) {

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
                replacements[wrong]
            );

    }

    return text
        .replace(/\s+/g, " ")
        .trim();

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

    return normalizeText(key)
        .replace(/[?!.]/g, "")
        .replace(/^my\s+/, "")
        .trim();

}


function remember(key, value) {

    key =
        cleanMemoryKey(key);

    memory[key] =
        value;

    lastTopic =
        key;

    saveMemory();

}


function getMemory(key) {

    return memory[
        cleanMemoryKey(key)
    ];

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

    if (
        document.body.classList.contains(
            "light-mode"
        )
    ) {

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

    const isLight =
        document.body.classList.contains(
            "light-mode"
        );

    localStorage.setItem(
        "liminalTheme",
        isLight
            ? "light"
            : "dark"
    );

    updateThemeButton();

}


function loadTheme() {

    const saved =
        localStorage.getItem(
            "liminalTheme"
        );

    if (saved === "light") {

        document.body.classList.add(
            "light-mode"
        );

    } else {

        document.body.classList.remove(
            "light-mode"
        );

    }

    updateThemeButton();

}


// ==========================================
// SEARCH
// ==========================================

function isSearchRequest(text) {

    const phrases = [

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

    return phrases.some(
        phrase =>
            text.startsWith(phrase)
    );

}


function getSearchQuery(text) {

    const phrases = [

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
        const phrase of phrases
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
                data.message ||
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
// MEMORY KEY DETECTION
// ==========================================

function findMemoryKey(text) {

    text =
        normalizeText(text);

    if (
        text.includes(
            "favorite color"
        ) ||
        text.includes(
            "what color do i like"
        )
    ) {

        return "favorite color";

    }

    if (
        text.includes(
            "favorite game"
        ) ||
        text.includes(
            "what game do i like"
        )
    ) {

        return "favorite game";

    }

    if (
        text.includes(
            "favorite food"
        ) ||
        text.includes(
            "what food do i like"
        )
    ) {

        return "favorite food";

    }

    if (
        text.includes(
            "my name"
        )
    ) {

        return "name";

    }

    if (
        text.includes(
            "where do i live"
        ) ||
        text.includes(
            "my location"
        )
    ) {

        return "location";

    }

    return null;

}


// ==========================================
// CORRECTIONS
// ==========================================

function isCorrection(text) {

    const phrases = [

        "no",
        "no that's wrong",
        "no that is wrong",
        "that's wrong",
        "that is wrong",
        "you are wrong",
        "you're wrong",
        "incorrect",
        "not correct",
        "actually"

    ];

    return phrases.some(
        phrase =>
            text === phrase ||
            text.startsWith(
                phrase + " "
            )
    );

}


function handleCorrection(text) {

    let correctionText =
        text
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


    // MY ... IS ...

    if (
        correctionText.startsWith(
            "my "
        ) &&
        correctionText.includes(
            " is "
        )
    ) {

        const parts =
            correctionText.split(
                " is "
            );

        const key =
            cleanMemoryKey(
                parts[0].substring(3)
            );

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
                memory[key] ||
                null;

            remember(
                key,
                value
            );

            corrections.push({

                type:
                    "memory_update",

                key,

                oldValue,

                newValue:
                    value,

                time:
                    new Date()
                        .toISOString()

            });

            saveCorrections();

            setConfidence(
                "high"
            );

            return oldValue

                ? `You're right! I've updated my memory. Your ${key} is now ${value}.`

                : `Got it! I'll remember that your ${key} is ${value}.`;

        }

    }


    // CONTEXT CORRECTION

    if (
        lastTopic &&
        correctionText.startsWith(
            "it is "
        )
    ) {

        const value =
            correctionText
                .substring(6)
                .trim();

        if (value) {

            const oldValue =
                memory[lastTopic] ||
                null;

            remember(
                lastTopic,
                value
            );

            corrections.push({

                type:
                    "context_update",

                key:
                    lastTopic,

                oldValue,

                newValue:
                    value,

                time:
                    new Date()
                        .toISOString()

            });

            saveCorrections();

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


    setConfidence(
        "low"
    );

    return (
        "Got it. I know my previous answer was incorrect. " +
        "Tell me the correct information and I'll learn it."
    );

}


// ==========================================
// LOCAL LIMINAL THINKING
// ==========================================

function think(originalText) {

    const text =
        normalizeText(
            originalText
        );

    setConfidence(
        "high"
    );


    // CORRECTION

    if (
        isCorrection(text)
    ) {

        return handleCorrection(
            text
        );

    }


    // TIME

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


    // DATE

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


    // GREETINGS

    if (
        [
            "hello",
            "hi",
            "hey",
            "hello there",
            "hey there"
        ].includes(text)
    ) {

        return randomResponse([

            "Hello!",
            "Hey!",
            "Hey there!",
            "Hello there!",
            "Hi! 👋"

        ]);

    }


    // HOW ARE YOU

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


    // NAME

    if (
        text.includes(
            "what is your name"
        ) ||
        text.includes(
            "who are you"
        )
    ) {

        return (
            "I'm Liminal AI 0.75."
        );

    }


    // CREATOR

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


    // JOKES

    if (
        text.includes(
            "tell me a joke"
        ) ||
        text.includes(
            "make me laugh"
        ) ||
        text === "joke"
    ) {

        return randomResponse([

            "Why did the computer go to the doctor? Because it had a virus.",

            "Why was the computer cold? It left its Windows open.",

            "What do computers eat? Microchips!",

            "Why did the programmer quit his job? He didn't get arrays."

        ]);

    }


    // REMEMBER THAT

    if (
        text.startsWith(
            "remember that "
        )
    ) {

        const information =
            text.substring(14)
                .trim();

        const parts =
            information.split(
                " is "
            );

        if (
            parts.length >= 2
        ) {

            const key =
                cleanMemoryKey(
                    parts[0]
                );

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

                remember(
                    key,
                    value
                );

                return oldValue

                    ? `Got it. I've updated my memory. Your ${key} is now ${value}.`

                    : `I'll remember that your ${key} is ${value}.`;

            }

        }

        return (
            "Try saying: remember that my favorite color is yellow."
        );

    }


    // NATURAL MEMORY

    if (
        text.startsWith(
            "my "
        ) &&
        text.includes(
            " is "
        )
    ) {

        const parts =
            text.split(
                " is "
            );

        const key =
            cleanMemoryKey(
                parts[0].substring(3)
            );

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

            remember(
                key,
                value
            );

            return oldValue

                ? `Got it. I've updated my memory. Your ${key} is now ${value}.`

                : `Got it. I'll remember that your ${key} is ${value}.`;

        }

    }


    // I AM

    if (
        text.startsWith(
            "i am "
        )
    ) {

        const value =
            text.substring(5)
                .trim();

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


    // I LIVE IN

    if (
        text.startsWith(
            "i live in "
        )
    ) {

        const value =
            text.substring(10)
                .trim();

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


    // MEMORY QUESTION

    const possibleKey =
        findMemoryKey(text);

    if (
        possibleKey
    ) {

        const value =
            getMemory(
                possibleKey
            );

        if (value) {

            lastTopic =
                possibleKey;

            return (
                "Your " +
                possibleKey +
                " is " +
                value +
                "."
            );

        }

        return (
            "I don't remember your " +
            possibleKey +
            " yet."
        );

    }


    // WHAT IS MY

    if (
        text.startsWith(
            "what is my "
        ) ||
        text.startsWith(
            "tell me my "
        )
    ) {

        const key =
            text.startsWith(
                "what is my "
            )
                ? text.substring(11)
                : text.substring(11);

        const cleanKey =
            cleanMemoryKey(
                key
            );

        const value =
            getMemory(
                cleanKey
            );

        if (value) {

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

        return (
            "I don't remember your " +
            cleanKey +
            " yet."
        );

    }


    // SHOW MEMORY

    if (
        text ===
            "what do you remember" ||
        text ===
            "show my memories" ||
        text ===
            "what do you know about me"
    ) {

        const keys =
            Object.keys(
                memory
            );

        if (!keys.length) {

            return (
                "I don't remember anything yet."
            );

        }

        let response =
            "Here's what I remember:\n\n";

        for (
            const key of keys
        ) {

            response +=
                "• " +
                key +
                " = " +
                memory[key] +
                "\n";

        }

        return response;

    }


    // SHOW CORRECTIONS

    if (
        text ===
            "show corrections" ||
        text ===
            "what have you learned" ||
        text ===
            "show what you learned"
    ) {

        if (
            !corrections.length
        ) {

            return (
                "I haven't learned any corrections yet."
            );

        }

        let response =
            "Here's what I've learned:\n\n";

        corrections.forEach(
            (item, index) => {

                if (
                    item.key &&
                    item.newValue
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
                        (index + 1) +
                        "\n";

                }

            }
        );

        return response;

    }


    // FORGET

    if (
        text.startsWith(
            "forget my "
        ) ||
        text.startsWith(
            "forget "
        )
    ) {

        let key =
            text.startsWith(
                "forget my "
            )
                ? text.substring(10)
                : text.substring(7);

        key =
            cleanMemoryKey(
                key
            );

        if (
            Object.prototype.hasOwnProperty.call(
                memory,
                key
            )
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


    // CONTEXT

    if (
        text === "what is it" ||
        text === "what is that" ||
        text === "what was it" ||
        text === "tell me about it"
    ) {

        if (
            lastTopic
        ) {

            const value =
                getMemory(
                    lastTopic
                );

            if (value) {

                return (
                    "Your " +
                    lastTopic +
                    " is " +
                    value +
                    "."
                );

            }

        }

        return (
            'I\'m not sure what "it" refers to yet.'
        );

    }


    // FOLLOW-UP

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


    // MATH

    if (
        /^[0-9+\-*/().\s]+$/.test(
            text
        )
    ) {

        try {

            const answer =
                Function(
                    '"use strict"; return (' +
                    text +
                    ')'
                )();

            if (
                typeof answer ===
                    "number" &&
                Number.isFinite(
                    answer
                )
            ) {

                return (
                    "The answer is " +
                    answer +
                    "."
                );

            }

        } catch (error) {

            // Fall through.

        }

    }


    // UNKNOWN

    setConfidence(
        "low"
    );

    return (
        "I'm not sure what you mean. Could you rephrase that?"
    );

}


// ==========================================
// SAFE DISPLAY
// ==========================================

function displayAIResponse(
    element,
    text
) {

    if (!element) {
        return;
    }

    element.textContent =
        String(text);

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

    if (!originalText) {
        return;
    }

    const normalized =
        normalizeText(
            originalText
        );


    // USER MESSAGE

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


    // AI MESSAGE

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


    // SEARCH

    if (
        isSearchRequest(
            normalized
        )
    ) {

        const query =
            getSearchQuery(
                normalized
            );

        if (query) {

            aiMessage.textContent =
                "Searching... 🌐";

            const result =
                await searchWeb(
                    query
                );

            if (
                result.success &&
                result.available
            ) {

                let response =
                    "Search results for: " +
                    query +
                    "\n\n";

                if (
                    Array.isArray(
                        result.results
                    ) &&
                    result.results.length
                ) {

                    result.results.forEach(
                        (item, index) => {

                            response +=
                                `${index + 1}. ` +
                                (
                                    item.title ||
                                    "Untitled result"
                                ) +
                                "\n";

                            if (
                                item.snippet
                            ) {

                                response +=
                                    item.snippet +
                                    "\n";

                            }

                            if (
                                item.url
                            ) {

                                response +=
                                    item.url +
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
                    "The search service is currently unavailable. 🌐"
                );

                lastResponse =
                    aiMessage.textContent;

                setConfidence(
                    "low"
                );

            }

            messages.scrollTop =
                messages.scrollHeight;

            return;

        }

    }


    // ======================================
    // LOCAL LIMINAL FIRST
    // ======================================

    const localReply =
        think(
            originalText
        );

    displayAIResponse(
        aiMessage,
        localReply
    );

    lastResponse =
        localReply;

    messages.scrollTop =
        messages.scrollHeight;


    // ======================================
    // BACKEND DOES NOT REPLACE
    // LIMINAL'S LOCAL BRAIN
    // ======================================

    console.log(
        "Liminal confidence:",
        lastConfidence
    );

}


// ==========================================
// CLEAR CHAT
// ==========================================

function clearChat() {

    const messages =
        document.getElementById(
            "messages"
        );

    if (!messages) {
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
        "Hello! I'm Liminal AI 0.75.";

    messages.appendChild(
        welcome
    );

    lastTopic = null;
    lastResponse = "";
    lastQuestion = "";
    waitingForClarification = false;

}


// ==========================================
// BACKEND TEST
// ==========================================

async function testBackend() {

    try {

        const response =
            await fetch(
                BACKEND_URL +
                "/api/test"
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
            "✅ Liminal AI backend connected!",
            data
        );

        return true;

    } catch (error) {

        console.warn(
            "⚠️ Liminal AI backend is offline."
        );

        return false;

    }

}


// ==========================================
// BACKEND INFO
// FIXED:
//
// The old version requested:
//
// /api/info
//
// But server.js does not have /api/info.
//
// The backend home endpoint is:
//
// /
// ==========================================

async function getBackendInfo() {

    try {

        const response =
            await fetch(
                BACKEND_URL +
                "/"
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
// PUBLIC LIMINAL RESPONDER
//
// This is used by index.html.
//
// It fixes the problem where index.html
// was calling think() directly and therefore
// completely bypassing the web-search system.
//
// Liminal now has:
//
// local brain
// memory
// corrections
// math
// web search
//
// all through one responder.
// ==========================================

async function liminalRespond(text) {

    const normalized =
        normalizeText(text);


    // ======================================
    // WEB SEARCH
    // ======================================

    if (
        isSearchRequest(normalized)
    ) {

        const query =
            getSearchQuery(normalized);

        if (query) {

            const result =
                await searchWeb(query);


            if (
                result.success &&
                result.available
            ) {

                let response =
                    "Search results for: " +
                    query +
                    "\n\n";


                if (
                    Array.isArray(
                        result.results
                    ) &&
                    result.results.length
                ) {

                    result.results.forEach(
                        (item, index) => {

                            response +=
                                `${index + 1}. ` +
                                (
                                    item.title ||
                                    "Untitled result"
                                ) +
                                "\n";


                            if (
                                item.snippet
                            ) {

                                response +=
                                    item.snippet +
                                    "\n";

                            }


                            if (
                                item.url
                            ) {

                                response +=
                                    item.url +
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


                lastResponse =
                    response;

                setConfidence(
                    "high"
                );

                return response;

            }


            lastResponse =
                "The search service is currently unavailable. 🌐";

            setConfidence(
                "low"
            );

            return lastResponse;

        }

    }


    // ======================================
    // NORMAL LIMINAL
    // ======================================

    const response =
        think(text);

    lastResponse =
        response;

    return response;

}


// ==========================================
// PUBLIC LIMINAL API
//
// index.html uses:
//
// window.Liminal.respond()
//
// Aurora remains completely separate.
// ==========================================

window.Liminal = {

    respond:
        liminalRespond,

    think:
        think,

    search:
        searchWeb,

    clear:
        clearChat

};


// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        const input =
            document.getElementById(
                "userInput"
            );

        if (input) {

            input.addEventListener(
                "keydown",
                function(event) {

                    if (
                        event.key === "Enter" &&
                        !event.shiftKey
                    ) {

                        event.preventDefault();

                        sendMessage();

                    }

                }
            );

        }

        loadTheme();


        // These run in the background.
        // They DO NOT prevent Liminal
        // from working if the backend
        // is unavailable.

        testBackend();

        getBackendInfo();

    }
);