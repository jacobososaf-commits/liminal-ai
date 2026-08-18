// ==========================================
// LIMINAL AI 0.76
// liminal.js
//
// ORIGINAL LIMINAL AI AGENT
// UNDERSTANDING UPGRADE
//
// Keeps:
// - Memory
// - Corrections
// - Web search
// - Math
// - Theme
// - Public Liminal API
//
// Adds:
// - Better typo tolerance
// - Phrase similarity
// - Word-level fuzzy matching
// - Intent detection
// - Confidence levels
// - More natural variations
//
// AURORA REMAINS COMPLETELY SEPARATE
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

        // contractions / common shortcuts
        "whats": "what is",
        "wats": "what is",
        "whts": "what is",
        "what's": "what is",

        "whos": "who is",
        "whos": "who is",
        "who's": "who is",

        "hows": "how is",
        "how's": "how is",

        "wheres": "where is",
        "where's": "where is",

        "whens": "when is",
        "when's": "when is",

        "im": "i am",
        "i'm": "i am",

        "ive": "i have",
        "i've": "i have",

        "id": "i would",
        "i'd": "i would",

        "ill": "i will",
        "i'll": "i will",

        "dont": "do not",
        "don't": "do not",

        "cant": "cannot",
        "can't": "cannot",

        "wont": "will not",
        "won't": "will not",

        "didnt": "did not",
        "didn't": "did not",

        "doesnt": "does not",
        "doesn't": "does not",

        "isnt": "is not",
        "isn't": "is not",

        "youre": "you are",
        "you're": "you are",

        "theyre": "they are",
        "they're": "they are",

        // shorthand
        "wat": "what",
        "wut": "what",
        "fav": "favorite",
        "favourite": "favorite",
        "colour": "color",
        "pls": "please",
        "plz": "please",
        "thx": "thanks",
        "ty": "thank you",
        "u": "you",
        "ur": "your",
        "r": "are",
        "ya": "you",
        "yr": "your",
        "bc": "because",
        "bcs": "because",
        "idk": "i do not know",
        "imo": "in my opinion",
        "btw": "by the way"

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
        .replace(/[“”‘’]/g, "'")
        .replace(/[!?]+/g, "?")
        .replace(/\s+/g, " ")
        .trim();

}


// ==========================================
// WORD NORMALIZATION
// ==========================================

function cleanWord(word) {

    return String(word || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .trim();

}


// ==========================================
// LEVENSHTEIN DISTANCE
// ==========================================

function levenshtein(a, b) {

    a = String(a);
    b = String(b);

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
// SIMILAR WORD
// ==========================================

function similarWord(word, target) {

    word = cleanWord(word);
    target = cleanWord(target);

    if (!word || !target) {
        return false;
    }

    if (word === target) {
        return true;
    }

    // Very short words need stricter matching.
    if (word.length <= 2 || target.length <= 2) {

        return levenshtein(
            word,
            target
        ) <= 1;

    }

    const distance =
        levenshtein(
            word,
            target
        );

    const maxLength =
        Math.max(
            word.length,
            target.length
        );

    let maxDistance = 1;

    if (maxLength >= 5) {
        maxDistance = 2;
    }

    if (maxLength >= 9) {
        maxDistance = 3;
    }

    return distance <= maxDistance;

}


// ==========================================
// WORD SIMILARITY
// ==========================================

function wordSimilarity(a, b) {

    a = cleanWord(a);
    b = cleanWord(b);

    if (!a || !b) {
        return 0;
    }

    if (a === b) {
        return 1;
    }

    const distance =
        levenshtein(a, b);

    const maxLength =
        Math.max(
            a.length,
            b.length
        );

    return Math.max(
        0,
        1 -
            distance /
            maxLength
    );

}


// ==========================================
// PHRASE SIMILARITY
// ==========================================

function phraseSimilarity(input, target) {

    input =
        normalizeText(input);

    target =
        normalizeText(target);

    if (!input || !target) {
        return 0;
    }

    if (input === target) {
        return 1;
    }

    const inputWords =
        input.split(/\s+/);

    const targetWords =
        target.split(/\s+/);

    let matched = 0;
    let totalScore = 0;

    for (const targetWord of targetWords) {

        let best = 0;

        for (const inputWord of inputWords) {

            const score =
                wordSimilarity(
                    inputWord,
                    targetWord
                );

            if (score > best) {
                best = score;
            }

        }

        if (best >= 0.55) {

            matched++;
            totalScore += best;

        }

    }

    const targetCoverage =
        matched /
        targetWords.length;

    const averageScore =
        targetWords.length
            ? totalScore /
              targetWords.length
            : 0;

    // Extra penalty when the input has
    // many unrelated words.
    const sizeRatio =
        Math.min(
            1,
            targetWords.length /
            Math.max(
                targetWords.length,
                inputWords.length
            )
        );

    return (
        targetCoverage * 0.55 +
        averageScore * 0.30 +
        sizeRatio * 0.15
    );

}


// ==========================================
// INTENT MATCHER
// ==========================================

function matchesIntent(
    text,
    phrases,
    threshold = 0.70
) {

    const normalized =
        normalizeText(text);

    let bestScore = 0;
    let bestPhrase = null;

    for (const phrase of phrases) {

        const score =
            phraseSimilarity(
                normalized,
                phrase
            );

        if (score > bestScore) {

            bestScore = score;
            bestPhrase = phrase;

        }

    }

    if (
        bestScore >= threshold
    ) {

        return {

            matched: true,
            score: bestScore,
            phrase: bestPhrase

        };

    }

    return {

        matched: false,
        score: bestScore,
        phrase: bestPhrase

    };

}


// ==========================================
// FUZZY COMMAND DETECTION
// ==========================================

function fuzzyContains(
    text,
    phrase,
    threshold = 0.72
) {

    return (
        phraseSimilarity(
            text,
            phrase
        ) >= threshold
    );

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

const SEARCH_PHRASES = [

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


function isSearchRequest(text) {

    const normalized =
        normalizeText(text);

    // Exact prefixes first.
    if (
        SEARCH_PHRASES.some(
            phrase =>
                normalized.startsWith(
                    phrase
                )
        )
    ) {

        return true;

    }

    // Fuzzy detection for common
    // search commands.
    const commands = [

        "search for",
        "search",
        "look up",
        "look for",
        "google",
        "search the web"

    ];

    const words =
        normalized.split(/\s+/);

    if (words.length < 2) {
        return false;
    }

    const firstWords =
        words
            .slice(0, 3)
            .join(" ");

    for (const command of commands) {

        if (
            phraseSimilarity(
                firstWords,
                command
            ) >= 0.78
        ) {

            return true;

        }

    }

    return false;

}


function getSearchQuery(text) {

    const normalized =
        normalizeText(text);

    for (
        const phrase of SEARCH_PHRASES
    ) {

        if (
            normalized.startsWith(
                phrase
            )
        ) {

            return normalized
                .substring(
                    phrase.length
                )
                .trim();

        }

    }

    // Fuzzy fallback.
    const words =
        normalized.split(/\s+/);

    if (words.length >= 2) {

        const possibleCommand =
            words
                .slice(0, 3)
                .join(" ");

        const fuzzyCommands = [

            "search for",
            "search",
            "look up",
            "look for",
            "google",
            "search the web"

        ];

        for (
            const command of fuzzyCommands
        ) {

            if (
                phraseSimilarity(
                    possibleCommand,
                    command
                ) >= 0.78
            ) {

                let removeCount =
                    command.split(/\s+/).length;

                // "search the web"
                // should remove three words.
                if (
                    command ===
                    "search the web"
                ) {

                    removeCount = 3;

                }

                return words
                    .slice(removeCount)
                    .join(" ")
                    .trim();

            }

        }

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
        fuzzyContains(
            text,
            "favorite color"
        ) ||
        fuzzyContains(
            text,
            "what color do i like"
        )
    ) {

        return "favorite color";

    }

    if (
        fuzzyContains(
            text,
            "favorite game"
        ) ||
        fuzzyContains(
            text,
            "what game do i like"
        )
    ) {

        return "favorite game";

    }

    if (
        fuzzyContains(
            text,
            "favorite food"
        ) ||
        fuzzyContains(
            text,
            "what food do i like"
        )
    ) {

        return "favorite food";

    }

    if (
        fuzzyContains(
            text,
            "my name"
        )
    ) {

        return "name";

    }

    if (
        fuzzyContains(
            text,
            "where do i live"
        ) ||
        fuzzyContains(
            text,
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

    const normalized =
        normalizeText(text);

    if (
        phrases.some(
            phrase =>
                normalized === phrase ||
                normalized.startsWith(
                    phrase + " "
                )
        )
    ) {

        return true;

    }

    return false;

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
// MEMORY STORAGE PARSER
// ==========================================

function handleMemoryStatement(text) {

    let normalized =
        normalizeText(text);


    // REMEMBER THAT...

    if (
        normalized.startsWith(
            "remember that "
        )
    ) {

        const information =
            normalized
                .substring(14)
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


    // MY ... IS ...

    if (
        normalized.startsWith(
            "my "
        ) &&
        normalized.includes(
            " is "
        )
    ) {

        const parts =
            normalized.split(
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


    return null;

}


// ==========================================
// LOCAL LIMINAL THINKING
// ==========================================

function think(originalText) {

    const rawText =
        String(
            originalText || ""
        ).trim();

    const text =
        normalizeText(
            rawText
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
                "tell me the time",
                "time"
            ],
            0.72
        ).matched
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
                "what is today's date",
                "what day is it",
                "tell me the date",
                "date"
            ],
            0.72
        ).matched
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
                "hey there",
                "hi there",
                "good morning",
                "good afternoon",
                "good evening"
            ],
            0.68
        ).matched
    ) {

        return randomResponse([

            "Hello! 👋",

            "Hey! 😎",

            "Hey there!",

            "Hello there!",

            "Hi! 👋",

            "Hey! Good to see you."

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
                "see you later",
                "talk to you later"
            ],
            0.70
        ).matched
    ) {

        return randomResponse([

            "See you later! 👋",

            "Goodbye! 👋",

            "See you!",

            "Later! 😎"

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
                "thanks a lot",
                "thank you so much"
            ],
            0.68
        ).matched
    ) {

        return randomResponse([

            "You're welcome! 😎",

            "No problem!",

            "Anytime! 🤖",

            "You're welcome!"

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
                "how are you doing",
                "how is it going",
                "how have you been"
            ],
            0.70
        ).matched
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
        matchesIntent(
            text,
            [
                "what is your name",
                "what's your name",
                "who are you",
                "tell me your name"
            ],
            0.70
        ).matched
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
            0.70
        ).matched
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
                "tell me something funny",
                "joke",
                "give me a joke"
            ],
            0.68
        ).matched
    ) {

        return randomResponse([

            "Why did the computer go to the doctor? Because it had a virus. 😂",

            "Why was the computer cold? It left its Windows open. 😂",

            "What do computers eat? Microchips! 😂",

            "Why did the programmer quit his job? He didn't get arrays. 😭",

            "Why was the JavaScript developer sad? Because they didn't know how to null their feelings. 😂"

        ]);

    }


    // ======================================
    // HELP / CAPABILITIES
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "what can you do",
                "what do you do",
                "help",
                "what are your abilities",
                "what can you help me with"
            ],
            0.68
        ).matched
    ) {

        return (
            "I'm Liminal AI! 🧠\n\n" +
            "I can chat with you, remember things you tell me, " +
            "answer math problems, tell jokes, handle corrections, " +
            "tell you the time and date, and search the web when you ask me to."
        );

    }


    // ======================================
    // MEMORY STATEMENTS
    // ======================================

    const memoryResponse =
        handleMemoryStatement(
            text
        );

    if (
        memoryResponse
    ) {

        return memoryResponse;

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

        if (value) {

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

        if (value) {

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

    const memoryQuestionMatch =
        matchesIntent(
            text,
            [
                "what is my",
                "tell me my",
                "what's my"
            ],
            0.70
        );

    if (
        memoryQuestionMatch.matched ||
        text.startsWith("what is my ") ||
        text.startsWith("tell me my ")
    ) {

        let key = "";

        if (
            text.startsWith(
                "what is my "
            )
        ) {

            key =
                text.substring(11);

        } else if (
            text.startsWith(
                "tell me my "
            )
        ) {

            key =
                text.substring(11);

        } else {

            const words =
                text.split(/\s+/);

            key =
                words
                    .slice(3)
                    .join(" ");

        }

        const cleanKey =
            cleanMemoryKey(
                key
            );

        if (!cleanKey) {

            setConfidence(
                "low"
            );

            return (
                "What would you like me to remember?"
            );

        }

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
                "what do you know about me",
                "what do you remember about me"
            ],
            0.68
        ).matched
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
                "show what you learned",
                "show my corrections"
            ],
            0.68
        ).matched
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
                "tell me about it",
                "tell me about that"
            ],
            0.68
        ).matched
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
            0.75
        ).matched
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
    // BETTER UNKNOWN HANDLING
    // ======================================

    setConfidence(
        "low"
    );

    return (
        "I'm not sure what you mean. " +
        "Could you rephrase that?"
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

                setConfidence(
                    "high"
                );

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
    // DEBUG
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
//
// index.html uses:
//
// window.Liminal.respond()
//
// Aurora remains completely separate.
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
        think(
            text
        );

    lastResponse =
        response;

    return response;

}


// ==========================================
// PUBLIC LIMINAL API
//
// Aurora is NOT connected here.
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


        // Backend checks run in the
        // background and never prevent
        // local Liminal from working.

        testBackend();

        getBackendInfo();

    }
);