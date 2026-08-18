// ==========================================
// LIMINAL AI 0.76
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

        "wheres": "where is",
        "wher": "where",

        "fav": "favorite",
        "favourite": "favorite",

        "colour": "color",

        "pls": "please",
        "plz": "please",

        "im": "i am",
        "ive": "i have",
        "id": "i would",

        "u": "you",
        "ur": "your",
        "ya": "you",

        "r": "are",

        "cant": "cannot",
        "dont": "do not",
        "doesnt": "does not",
        "didnt": "did not",

        "thats": "that is",
        "youre": "you are",
        "theyre": "they are",

        "rember": "remember",
        "remeber": "remember",

        "tel": "tell",
        "tll": "tell",

        "jok": "joke",
        "jokee": "joke",

        "thnks": "thanks",
        "thanx": "thanks",

        "googl": "google",

        "hows": "how is"

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
        .replace(/[^\S\r\n]+/g, " ")
        .trim();

}


// ==========================================
// LEVENSHTEIN
// ==========================================

function levenshtein(a, b) {

    a = String(a || "");
    b = String(b || "");

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


// ==========================================
// FUZZY WORD MATCHING
//
// THIS IS ACTUALLY USED BY LIMINAL.
// ==========================================

function similarWord(word, target) {

    word =
        String(word || "")
            .toLowerCase()
            .trim();

    target =
        String(target || "")
            .toLowerCase()
            .trim();

    if (!word || !target) {
        return false;
    }

    if (word === target) {
        return true;
    }

    const distance =
        levenshtein(
            word,
            target
        );

    const longest =
        Math.max(
            word.length,
            target.length
        );

    let maxDistance = 1;

    if (longest >= 6) {
        maxDistance = 2;
    }

    if (longest >= 10) {
        maxDistance = 3;
    }

    return distance <= maxDistance;

}


// ==========================================
// FUZZY PHRASE MATCHING
//
// This is the important part.
//
// Liminal now ACTUALLY uses fuzzy matching
// when deciding what the user means.
// ==========================================

function fuzzyPhraseMatch(
    input,
    phrase,
    options = {}
) {

    const inputWords =
        normalizeText(input)
            .split(/\s+/)
            .filter(Boolean);

    const targetWords =
        normalizeText(phrase)
            .split(/\s+/)
            .filter(Boolean);

    if (
        !inputWords.length ||
        !targetWords.length
    ) {

        return false;

    }

    const allowExtraWords =
        options.allowExtraWords !== false;

    const maxExtra =
        options.maxExtraWords ??
        3;

    if (
        !allowExtraWords &&
        inputWords.length !== targetWords.length
    ) {

        return false;

    }

    if (
        allowExtraWords &&
        inputWords.length >
            targetWords.length + maxExtra
    ) {

        return false;

    }

    // Exact phrase first.

    if (
        inputWords.join(" ") ===
        targetWords.join(" ")
    ) {

        return true;

    }

    // Compare each target word against
    // the corresponding input word.

    const used = new Set();

    let matched = 0;

    for (
        let i = 0;
        i < targetWords.length;
        i++
    ) {

        const targetWord =
            targetWords[i];

        let found = false;

        // First try the expected position.

        if (
            inputWords[i] &&
            similarWord(
                inputWords[i],
                targetWord
            )
        ) {

            used.add(i);
            matched++;
            continue;

        }

        // Then search nearby words.

        for (
            let j = 0;
            j < inputWords.length;
            j++
        ) {

            if (used.has(j)) {
                continue;
            }

            if (
                similarWord(
                    inputWords[j],
                    targetWord
                )
            ) {

                used.add(j);
                matched++;
                found = true;
                break;

            }

        }

        if (!found) {
            // Continue checking the remaining words.
        }

    }

    return (
        matched ===
        targetWords.length
    );

}


// ==========================================
// FUZZY INTENT
// ==========================================

function matchesIntent(
    text,
    phrases,
    options = {}
) {

    const normalized =
        normalizeText(text);

    for (
        const phrase of phrases
    ) {

        if (
            fuzzyPhraseMatch(
                normalized,
                phrase,
                options
            )
        ) {

            return true;

        }

    }

    return false;

}


// ==========================================
// FUZZY PREFIX
//
// Used for things like:
//
// googl minecraft
// search for minecraft
// rember that...
// my favorite...
// ==========================================

function matchesPrefix(
    text,
    prefixes
) {

    const words =
        normalizeText(text)
            .split(/\s+/)
            .filter(Boolean);

    if (!words.length) {
        return null;
    }

    for (
        const prefix of prefixes
    ) {

        const prefixWords =
            normalizeText(prefix)
                .split(/\s+/)
                .filter(Boolean);

        if (
            words.length <
            prefixWords.length
        ) {

            continue;

        }

        let matches = true;

        for (
            let i = 0;
            i < prefixWords.length;
            i++
        ) {

            if (
                !similarWord(
                    words[i],
                    prefixWords[i]
                )
            ) {

                matches = false;
                break;

            }

        }

        if (matches) {
            return prefix;
        }

    }

    return null;

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

    const normalized =
        normalizeText(text);

    const exactPrefixes = [

        "search for",
        "search",
        "look up",
        "look for",
        "find information about",
        "find info about",
        "find out about",
        "search the web for",
        "search the web",
        "google"

    ];

    if (
        matchesPrefix(
            normalized,
            exactPrefixes
        )
    ) {

        return true;

    }

    // Extra fuzzy search detection.

    const words =
        normalized
            .split(/\s+/)
            .filter(Boolean);

    if (!words.length) {
        return false;
    }

    const first =
        words[0];

    if (
        similarWord(first, "google") ||
        similarWord(first, "search")
    ) {

        return true;

    }

    if (
        words.length >= 2 &&
        (
            similarWord(
                words[0],
                "look"
            ) &&
            similarWord(
                words[1],
                "up"
            )
        )
    ) {

        return true;

    }

    return false;

}


function getSearchQuery(text) {

    const normalized =
        normalizeText(text);

    const prefixes = [

        "search the web for",
        "search the web",
        "find information about",
        "find info about",
        "find out about",
        "search for",
        "look up",
        "look for",
        "search",
        "google"

    ];

    const matched =
        matchesPrefix(
            normalized,
            prefixes
        );

    if (matched) {

        const prefixWords =
            normalizeText(matched)
                .split(/\s+/)
                .length;

        return normalized
            .split(/\s+/)
            .slice(prefixWords)
            .join(" ")
            .trim();

    }

    return normalized.trim();

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

    const normalized =
        normalizeText(text);

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

    return matchesIntent(
        normalized,
        phrases,
        {
            allowExtraWords: true,
            maxExtraWords: 10
        }
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


    // ======================================
    // CORRECTION
    // ======================================

    if (
        isCorrection(text)
    ) {

        return handleCorrection(
            text
        );

    }


    // ======================================
    // TIME
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "what time is it",
                "what is the current time",
                "current time",
                "time"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
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
        matchesIntent(
            text,
            [
                "what is the date",
                "what day is it",
                "today's date",
                "what is today's date"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
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
        matchesIntent(
            text,
            [
                "hello",
                "hi",
                "hey",
                "hello there",
                "hey there"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
        )
    ) {

        setConfidence(
            text === "hello" ||
            text === "hi" ||
            text === "hey"
                ? "high"
                : "medium"
        );

        return randomResponse([

            "Hello! 👋",

            "Hey! 👋",

            "Hey there!",

            "Hello there!",

            "Hi! How's it going?"

        ]);

    }


    // ======================================
    // GOOD MORNING
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "good morning",
                "morning"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
        )
    ) {

        return randomResponse([

            "Good morning! ☀️",

            "Good morning! Hope your day is going well.",

            "Morning! 👋"

        ]);

    }


    // ======================================
    // GOOD NIGHT
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "good night",
                "night"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
        )
    ) {

        return randomResponse([

            "Good night! 🌙",

            "Good night! Sleep well.",

            "Night! See you later. 👋"

        ]);

    }


    // ======================================
    // GOODBYE
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "bye",
                "goodbye",
                "see you",
                "see you later"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
        )
    ) {

        return randomResponse([

            "Bye! 👋",

            "See you later!",

            "Goodbye! 👋",

            "See you!"

        ]);

    }


    // ======================================
    // THANKS
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "thank you",
                "thanks",
                "thanks a lot"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
        )
    ) {

        return randomResponse([

            "You're welcome! 😎",

            "No problem!",

            "Anytime!",

            "You're welcome! 👋"

        ]);

    }


    // ======================================
    // HOW ARE YOU
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "how are you",
                "how is it going",
                "how are things"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
        )
    ) {

        return randomResponse([

            "I'm doing great!",

            "I'm doing pretty well!",

            "I'm good! Thanks for asking.",

            "I'm running perfectly! 🤖",

            "Doing great! 🤖"

        ]);

    }


    // ======================================
    // NAME
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "what is your name",
                "what is ur name",
                "who are you",
                "what are you called"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
        )
    ) {

        return (
            "I'm Liminal AI 0.76."
        );

    }


    // ======================================
    // CREATOR
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "who made you",
                "who created you",
                "who built you",
                "who is your creator"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
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
        matchesIntent(
            text,
            [
                "tell me a joke",
                "make me laugh",
                "joke",
                "tell a joke"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 4
            }
        )
    ) {

        return randomResponse([

            "Why did the computer go to the doctor? Because it had a virus. 😂",

            "Why was the computer cold? It left its Windows open. 😂",

            "What do computers eat? Microchips! 😂",

            "Why did the programmer quit his job? He didn't get arrays. 😂",

            "Why do programmers prefer dark mode? Because light attracts bugs. 🐛"

        ]);

    }


    // ======================================
    // HELP / ABILITIES
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "help",
                "what can you do",
                "what are your abilities",
                "what can you help me with"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 5
            }
        )
    ) {

        return (
            "I can chat with you, remember things you tell me, " +
            "learn from corrections, do math, tell jokes, " +
            "check the time and date, and search the web. 🌐🧠"
        );

    }


    // ======================================
    // REMEMBER THAT
    // ======================================

    const rememberPrefix =
        matchesPrefix(
            text,
            [
                "remember that"
            ]
        );

    if (
        rememberPrefix
    ) {

        const prefixLength =
            normalizeText(
                rememberPrefix
            )
            .split(/\s+/)
            .length;

        const information =
            text
                .split(/\s+/)
                .slice(prefixLength)
                .join(" ")
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


    // ======================================
    // NATURAL MEMORY
    // ======================================

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


    // ======================================
    // I AM
    // ======================================

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


    // ======================================
    // I LIVE IN
    // ======================================

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


    // ======================================
    // MEMORY QUESTION
    // ======================================

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


    // ======================================
    // WHAT IS MY
    // ======================================

    if (
        matchesPrefix(
            text,
            [
                "what is my",
                "tell me my"
            ]
        )
    ) {

        const words =
            text.split(/\s+/);

        const prefix =
            text.startsWith(
                "what is my"
            )
                ? 3
                : 3;

        const key =
            words
                .slice(prefix)
                .join(" ")
                .trim();

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


    // ======================================
    // SHOW MEMORY
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "what do you remember",
                "show my memories",
                "what do you know about me"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 4
            }
        )
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


    // ======================================
    // SHOW CORRECTIONS
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "show corrections",
                "what have you learned",
                "show what you learned"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 4
            }
        )
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


    // ======================================
    // FORGET
    // ======================================

    if (
        matchesPrefix(
            text,
            [
                "forget my",
                "forget"
            ]
        )
    ) {

        const words =
            text.split(/\s+/);

        const startsWithMy =
            similarWord(
                words[1] || "",
                "my"
            );

        const key =
            words
                .slice(
                    startsWithMy
                        ? 2
                        : 1
                )
                .join(" ")
                .trim();

        const cleanKey =
            cleanMemoryKey(
                key
            );

        if (
            Object.prototype.hasOwnProperty.call(
                memory,
                cleanKey
            )
        ) {

            delete memory[cleanKey];

            saveMemory();

            return (
                "Okay, I forgot your " +
                cleanKey +
                "."
            );

        }

        return (
            "I don't have a memory about your " +
            cleanKey +
            "."
        );

    }


    // ======================================
    // CONTEXT
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "what is it",
                "what is that",
                "what was it",
                "tell me about it"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
        )
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


    // ======================================
    // FOLLOW-UP
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "why",
                "how come"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 2
            }
        )
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


    // ======================================
    // MATH
    // ======================================

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


    // ======================================
    // UNKNOWN
    // ======================================

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


    // ======================================
    // SEARCH
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
        "Hello! I'm Liminal AI 0.76.";

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
// ==========================================

async function liminalRespond(text) {

    const normalized =
        normalizeText(text);


    // ======================================
    // WEB SEARCH
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

        if (query) {

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


        // Backend checks happen in
        // the background and never
        // block the local brain.

        testBackend();

        getBackendInfo();

    }
);