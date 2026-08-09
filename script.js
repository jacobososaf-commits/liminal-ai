// ==========================================
// LIMINAL AI 0.65
// HARDENING + CONFIDENCE + CORRECTIONS
// ==========================================


// ==========================================
// MEMORY
// ==========================================

let memory =
    JSON.parse(localStorage.getItem("liminalMemory")) || {};

function saveMemory() {
    localStorage.setItem(
        "liminalMemory",
        JSON.stringify(memory)
    );
}


// ==========================================
// CORRECTION MEMORY
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
// SECURITY
// Escape text before putting it into HTML
// ==========================================

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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
// PERSONALITY
// ==========================================

function randomResponse(responses) {

    return responses[
        Math.floor(
            Math.random() * responses.length
        )
    ];
}


// ==========================================
// THEME
// ==========================================

function updateThemeButton() {

    const button =
        document.getElementById("themeButton");

    if (!button) {
        return;
    }

    const lightMode =
        document.body.classList.contains(
            "light-mode"
        );

    if (lightMode) {

        button.textContent = "🌙 Dark";

    } else {

        button.textContent = "☀️ Light";

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
        lightMode ? "light" : "dark"
    );

    updateThemeButton();
}


function loadTheme() {

    const savedTheme =
        localStorage.getItem(
            "liminalTheme"
        );

    if (savedTheme === "light") {

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
        String(text)
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

        "u": "you",
        "ur": "your",

        "pls": "please",
        "plz": "please",

        "im": "i am",
        "ive": "i have",

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
            .replace(/[?!.]/g, "")
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

    value =
        String(value).trim();


    if (
        !key ||
        !value
    ) {

        return false;

    }


    memory[key] =
        value;


    lastTopic =
        key;


    saveMemory();


    return true;
}


function getMemory(key) {

    key =
        cleanMemoryKey(key);


    return memory[key];
}


// ==========================================
// NATURAL MEMORY VALIDATION
// 0.65 HARDENING
// ==========================================

function isValidMemoryKey(key) {

    key =
        cleanMemoryKey(key);


    if (!key) {
        return false;
    }


    // Prevent obvious false positives such as:
    // "my goodness is that cool"

    const blockedKeys = [

        "goodness",
        "god",
        "good",
        "bad",
        "funny",
        "crazy",
        "weird",
        "sure",
        "okay",
        "fine",
        "cool",
        "right",
        "wrong",
        "that",
        "this"

    ];


    if (
        blockedKeys.includes(key)
    ) {

        return false;

    }


    // Memory keys should not be huge sentences.

    if (
        key.split(" ").length > 6
    ) {

        return false;

    }


    return true;
}


// ==========================================
// CORRECTION SYSTEM
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
        const phrase
        of correctionPhrases
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


    // --------------------------------------
    // "Actually, my X is Y"
    // --------------------------------------

    if (
        correctionText.startsWith("my ") &&
        correctionText.includes(" is ")
    ) {

        const separator =
            correctionText.indexOf(" is ");


        const key =
            correctionText
                .substring(3, separator)
                .trim();


        const value =
            correctionText
                .substring(separator + 4)
                .trim();


        if (
            isValidMemoryKey(key) &&
            value
        ) {

            const cleanKey =
                cleanMemoryKey(key);


            const oldValue =
                memory[cleanKey];


            remember(
                cleanKey,
                value
            );


            corrections.push({

                type: "memory_update",

                key: cleanKey,

                oldValue:
                    oldValue || null,

                newValue: value,

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

                return "You're right! I'll update my memory. Your " +
                    escapeHTML(cleanKey) +
                    " is now " +
                    escapeHTML(value) +
                    ".";

            }


            return "Got it! I'll remember that your " +
                escapeHTML(cleanKey) +
                " is " +
                escapeHTML(value) +
                ".";

        }

    }


    // --------------------------------------
    // "IT IS X"
    // --------------------------------------

    if (
        correctionText.startsWith("it is ") ||
        correctionText.startsWith("it's ")
    ) {

        let value =
            correctionText.substring(6).trim();


        if (
            lastTopic &&
            value
        ) {

            const oldValue =
                memory[lastTopic];


            remember(
                lastTopic,
                value
            );


            corrections.push({

                type: "context_update",

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


            return "You're right! I've corrected my memory. Your " +
                escapeHTML(lastTopic) +
                " is now " +
                escapeHTML(value) +
                ".";

        }

    }


    // --------------------------------------
    // "NO, YOU'RE WRONG"
    // --------------------------------------

    if (
        lastTopic &&
        lastResponse
    ) {

        corrections.push({

            type: "response_correction",

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


        return "Got it. I know my previous answer was incorrect, but I need the correct information to update my memory. You can tell me by saying something like \"my " +
            escapeHTML(lastTopic) +
            " is ...\".";

    }


    setConfidence(
        "low"
    );


    return "Got it. I understand that my previous answer was wrong. Tell me what the correct answer is and I'll learn from it.";
}


// ==========================================
// FIND MEMORY KEY
// ==========================================

function findMemoryKey(text) {

    text =
        normalizeText(
            text
        );


    if (
        text.includes("favorite color") ||
        text.includes("what color do i like")
    ) {

        return "favorite color";

    }


    if (
        text.includes("favorite game") ||
        text.includes("what game do i like")
    ) {

        return "favorite game";

    }


    if (
        text.includes("favorite food") ||
        text.includes("what food do i like")
    ) {

        return "favorite food";

    }


    if (
        text.includes("my name")
    ) {

        return "name";

    }


    if (
        text.includes("where do i live") ||
        text.includes("my location")
    ) {

        return "location";

    }


    return null;
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


    return ambiguous.includes(text);
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

        return "What would you like me to tell you about?";

    }


    if (
        text === "why"
    ) {

        return "What would you like me to explain why?";

    }


    if (
        text === "how"
    ) {

        return "What would you like to know how to do?";

    }


    if (
        text === "which"
    ) {

        return "Which things are you comparing?";

    }


    if (
        text === "when"
    ) {

        return "When are you asking about?";

    }


    if (
        text === "where"
    ) {

        return "Where are you asking about?";

    }


    return "Could you give me a little more detail?";
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
                const memoryWord
                of memoryWords
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


        return "I think you're asking about something I remember. Try asking me something like \"what is my favorite color?\"";

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
            const timeWord
            of timeWords
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


                return "I think you're asking about the time. Try asking \"what time is it?\"";

            }

        }


        for (
            const dateWord
            of dateWords
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


                return "I think you're asking about the date. Try asking \"what is the date?\"";

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


        return "I think you want a joke. Try asking \"tell me a joke.\"";

    }


    setConfidence(
        "low"
    );


    return "I'm not sure what you mean. Could you rephrase that?";
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
    // CLARIFICATION
    // ======================================

    if (
        needsClarification(text)
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

        text.includes("what time is it") ||
        text === "time" ||
        text.includes("current time")

    ) {

        const now =
            new Date();


        setConfidence(
            "high"
        );


        return "The current time is " +

            now.toLocaleTimeString(
                [],
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            ) +

            ".";

    }


    // ======================================
    // DATE
    // ======================================

    if (

        text.includes("what is the date") ||
        text === "date" ||
        text.includes("what day is it")

    ) {

        const now =
            new Date();


        setConfidence(
            "high"
        );


        return "Today is " +

            now.toLocaleDateString(
                [],
                {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }
            ) +

            ".";

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

        setConfidence(
            "high"
        );


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

        text.includes("how are you") ||
        text.includes("how is it going")

    ) {

        setConfidence(
            "high"
        );


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

        text.includes("what is your name") ||
        text.includes("who are you")

    ) {

        setConfidence(
            "high"
        );


        return "I'm Liminal AI 0.65.";

    }


    // ======================================
    // CREATOR
    // ======================================

    if (

        text.includes("who made you") ||
        text.includes("who created you") ||
        text.includes("who built you")

    ) {

        setConfidence(
            "high"
        );


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

        text.includes("tell me a joke") ||
        text.includes("make me laugh") ||
        text === "joke"

    ) {

        setConfidence(
            "high"
        );


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
        text.startsWith("remember that ")
    ) {

        const information =
            text.substring(14).trim();


        const separator =
            information.indexOf(" is ");


        if (
            separator !== -1
        ) {

            const key =
                information
                    .substring(0, separator)
                    .trim();


            const value =
                information
                    .substring(separator + 4)
                    .trim();


            if (
                isValidMemoryKey(key) &&
                value
            ) {

                remember(
                    key,
                    value
                );


                setConfidence(
                    "high"
                );


                return "I'll remember that your " +
                    escapeHTML(
                        cleanMemoryKey(key)
                    ) +
                    " is " +
                    escapeHTML(value) +
                    ".";

            }

        }


        return "Try saying: remember that my favorite color is yellow.";

    }


    // ======================================
    // NATURAL MEMORY
    // ======================================

    if (

        text.startsWith("my ") &&
        text.includes(" is ")

    ) {

        const separator =
            text.indexOf(" is ");


        const key =
            text
                .substring(3, separator)
                .trim();


        const value =
            text
                .substring(separator + 4)
                .trim();


        if (
            isValidMemoryKey(key) &&
            value
        ) {

            remember(
                key,
                value
            );


            setConfidence(
                "high"
            );


            return "Got it. I'll remember that your " +
                escapeHTML(
                    cleanMemoryKey(key)
                ) +
                " is " +
                escapeHTML(value) +
                ".";

        }

    }


    // ======================================
    // I AM
    // ======================================

    if (
        text.startsWith("i am ") &&
        text.length > 5
    ) {

        const value =
            text.substring(5).trim();


        remember(
            "identity",
            value
        );


        setConfidence(
            "high"
        );


        return "Got it. I'll remember that you are " +
            escapeHTML(value) +
            ".";

    }


    // ======================================
    // I LIVE IN
    // ======================================

    if (
        text.startsWith("i live in ") &&
        text.length > 10
    ) {

        const value =
            text.substring(10).trim();


        remember(
            "location",
            value
        );


        setConfidence(
            "high"
        );


        return "Got it. I'll remember that you live in " +
            escapeHTML(value) +
            ".";

    }


    // ======================================
    // MEMORY QUESTION
    // ======================================

    const possibleKey =
        findMemoryKey(
            text
        );


    if (
        possibleKey
    ) {

        const value =
            getMemory(
                possibleKey
            );


        if (
            value
        ) {

            setConfidence(
                "high"
            );


            lastTopic =
                possibleKey;


            return "Your " +
                escapeHTML(possibleKey) +
                " is " +
                escapeHTML(value) +
                ".";

        }


        setConfidence(
            "high"
        );


        return "I don't remember your " +
            escapeHTML(possibleKey) +
            " yet.";

    }


    // ======================================
    // WHAT IS MY
    // ======================================

    if (

        text.startsWith("what is my ") ||
        text.startsWith("tell me my ")

    ) {

        const key =
            text.startsWith("what is my ")
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


        if (
            value
        ) {

            lastTopic =
                cleanKey;


            setConfidence(
                "high"
            );


            return "Your " +
                escapeHTML(cleanKey) +
                " is " +
                escapeHTML(value) +
                ".";

        }


        setConfidence(
            "high"
        );


        return "I don't remember your " +
            escapeHTML(cleanKey) +
            " yet.";

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
            Object.keys(memory);


        if (
            keys.length === 0
        ) {

            setConfidence(
                "high"
            );


            return "I don't remember anything yet.";

        }


        let response =
            "Here's what I remember:<br><br>";


        keys.forEach(
            function(key) {

                response +=
                    "• " +
                    escapeHTML(key) +
                    " = " +
                    escapeHTML(memory[key]) +
                    "<br>";

            }
        );


        setConfidence(
            "high"
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

            setConfidence(
                "high"
            );


            return "I haven't learned any corrections yet.";

        }


        let response =
            "Here's what I've learned:<br><br>";


        corrections.forEach(
            function(item, index) {

                if (
                    item.key
                ) {

                    response +=
                        "• " +
                        escapeHTML(item.key) +
                        ": " +
                        escapeHTML(
                            item.oldValue || "unknown"
                        ) +
                        " → " +
                        escapeHTML(item.newValue) +
                        "<br>";

                } else {

                    response +=
                        "• Correction " +
                        (index + 1) +
                        "<br>";

                }

            }
        );


        setConfidence(
            "high"
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


            setConfidence(
                "high"
            );


            return "Okay, I forgot your " +
                escapeHTML(key) +
                ".";

        }


        setConfidence(
            "high"
        );


        return "I don't have a memory about your " +
            escapeHTML(key) +
            ".";

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

                setConfidence(
                    "high"
                );


                return "Your " +
                    escapeHTML(lastTopic) +
                    " is " +
                    escapeHTML(value) +
                    ".";

            }

        }


        return "I'm not sure what \"it\" refers to yet.";

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


            return "Because that's the information I currently have stored about your " +
                escapeHTML(lastTopic) +
                ".";

        }


        setConfidence(
            "low"
        );


        return "I'm not sure what you're referring to.";

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

                setConfidence(
                    "high"
                );


                return "The one I remember is " +
                    escapeHTML(value) +
                    ".";

            }

        }


        setConfidence(
            "low"
        );


        return "I'm not sure which one you mean.";

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


            setConfidence(
                "high"
            );


            return "The answer is " +
                escapeHTML(answer) +
                ".";

        } catch (
            error
        ) {

            setConfidence(
                "low"
            );


            return "I couldn't calculate that.";

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
// SEND MESSAGE
// ==========================================

function sendMessage() {

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


    const text =
        input.value.trim();


    if (
        text === ""
    ) {

        return;

    }


    // ======================================
    // USER MESSAGE
    // ======================================

    const userMessage =
        document.createElement(
            "div"
        );


    userMessage.className =
        "user";


    // textContent is intentionally used here.
    // It prevents HTML entered by the user
    // from becoming actual HTML.

    userMessage.textContent =
        text;


    messages.appendChild(
        userMessage
    );


    // ======================================
    // AI MESSAGE
    // ======================================

    const response =
        think(text);


    const aiMessage =
        document.createElement(
            "div"
        );


    aiMessage.className =
        "ai";


    // Responses created by think() are already
    // escaped where user-controlled content
    // appears. <br> is intentionally allowed
    // for memory lists.

    aiMessage.innerHTML =
        response;


    messages.appendChild(
        aiMessage
    );


    // ======================================
    // CLEAR INPUT
    // ======================================

    input.value = "";


    // ======================================
    // SCROLL
    // ======================================

    messages.scrollTop =
        messages.scrollHeight;


    // ======================================
    // SAVE LAST RESPONSE
    // ======================================

    lastResponse =
        aiMessage.innerText;


    console.log(
        "Liminal confidence:",
        lastConfidence
    );

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
                        event.key === "Enter"
                    ) {

                        sendMessage();

                    }

                }
            );

        }


        loadTheme();

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
        "Hello! I'm Liminal AI 0.65.";


    messages.appendChild(
        welcome
    );


    lastTopic = null;
    lastResponse = "";
    lastAction = null;
    lastQuestion = "";
    waitingForClarification = false;

}

