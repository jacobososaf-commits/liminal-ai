// ==========================================
// LIMINAL AI 0.8
// liminal.js
//
// ORIGINAL LIMINAL AI AGENT
//
// 0.8
// - Conversation context
// - Short-term context memory
// - Mood system
// - Mood-aware responses
// - Context-aware follow-ups
// - Existing long-term memory preserved
// - Existing corrections preserved
// - Existing fuzzy matching preserved
// - Existing web search preserved
// - Existing backend preserved
// - Existing math preserved
// - Existing confidence preserved
// - Existing personality preserved
// - Fixed false correction detection
// - Fixed duplicate context system
// - Fixed mood initialization
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
// SHORT-TERM CONVERSATION CONTEXT
// ==========================================
//
// Context is NOT permanent memory.
//
// Example:
//
// User: I like Minecraft.
// AI: Minecraft is pretty cool.
// User: What do you like about it?
//
// "it" can refer to Minecraft.
//
// Maximum stored messages: 12
// ==========================================

let conversationContext =
    JSON.parse(
        localStorage.getItem("liminalContext") || "[]"
    );


// Make sure old/broken context data does not crash Liminal.

if (
    !Array.isArray(conversationContext)
) {

    conversationContext = [];

}


const MAX_CONTEXT_MESSAGES = 12;


function saveConversationContext() {

    localStorage.setItem(
        "liminalContext",
        JSON.stringify(
            conversationContext
        )
    );

}


function addContext(
    role,
    text
) {

    if (!text) {
        return;
    }

    conversationContext.push({

        role:
            role,

        text:
            String(text),

        time:
            new Date().toISOString()

    });


    if (
        conversationContext.length >
        MAX_CONTEXT_MESSAGES
    ) {

        conversationContext =
            conversationContext.slice(
                -MAX_CONTEXT_MESSAGES
            );

    }


    saveConversationContext();

}


function getLastUserMessage() {

    for (
        let i = conversationContext.length - 1;
        i >= 0;
        i--
    ) {

        if (
            conversationContext[i].role ===
            "user"
        ) {

            return conversationContext[i].text;

        }

    }

    return "";

}


function getLastAIMessage() {

    for (
        let i = conversationContext.length - 1;
        i >= 0;
        i--
    ) {

        if (
            conversationContext[i].role ===
            "ai"
        ) {

            return conversationContext[i].text;

        }

    }

    return "";

}


function clearConversationContext() {

    conversationContext = [];

    saveConversationContext();

}


// ==========================================
// CONTEXT STATE
// ==========================================

let lastTopic = null;

let lastResponse = "";

let lastQuestion = "";

let waitingForClarification = false;

let lastConfidence = "high";


// ==========================================
// MOOD STATE
// ==========================================

let currentMood = "neutral";

let previousMood = "neutral";


// ==========================================
// CONTEXT HELPERS
// ==========================================

function setContext(
    topic,
    value = null
) {

    if (!topic) {
        return;
    }

    lastTopic =
        String(topic);

    if (value !== null) {

        remember(
            topic,
            value
        );

    }

}


function getContextTopic() {

    return lastTopic;

}


function clearContext() {

    lastTopic = null;

    waitingForClarification = false;

}


// ==========================================
// CONFIDENCE
// ==========================================

function setConfidence(level) {

    lastConfidence =
        level;

}


// ==========================================
// MOOD SYSTEM
// ==========================================

const MOODS = [

    "neutral",
    "happy",
    "curious",
    "excited",
    "thoughtful",
    "confused",
    "playful",
    "helpful"

];


function setMood(mood) {

    if (
        !MOODS.includes(mood)
    ) {

        mood =
            "neutral";

    }


    previousMood =
        currentMood;

    currentMood =
        mood;

    updateMoodUI();

}


function getMood() {

    return currentMood;

}


function updateMoodUI() {

    const moodElement =
        document.getElementById(
            "moodStatus"
        );

    if (!moodElement) {
        return;
    }


    const moodLabels = {

        neutral:
            "😐 Neutral",

        happy:
            "😊 Happy",

        curious:
            "🤔 Curious",

        excited:
            "🤩 Excited",

        thoughtful:
            "🧠 Thoughtful",

        confused:
            "😕 Confused",

        playful:
            "😎 Playful",

        helpful:
            "🤝 Helpful"

    };


    moodElement.textContent =
        moodLabels[currentMood] ||
        "😐 Neutral";

}


// ==========================================
// MOOD DETECTION
// ==========================================

function detectMoodFromMessage(text) {

    const normalized =
        normalizeText(text);


    if (
        matchesIntent(
            normalized,
            [
                "haha",
                "lol",
                "lmao",
                "that is funny",
                "thats funny",
                "you are funny",
                "funny"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
        )
    ) {

        return "playful";

    }


    if (
        matchesIntent(
            normalized,
            [
                "awesome",
                "amazing",
                "that is awesome",
                "that is amazing",
                "this is awesome",
                "this is amazing"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
        )
    ) {

        return "excited";

    }


    if (
        matchesIntent(
            normalized,
            [
                "cool",
                "nice",
                "great",
                "good",
                "i like that"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
        )
    ) {

        return "happy";

    }


    if (
        matchesIntent(
            normalized,
            [
                "i do not understand",
                "i dont understand",
                "what does that mean",
                "i am confused",
                "im confused"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 4
            }
        )
    ) {

        return "confused";

    }


    if (
        normalized.includes("?")
    ) {

        return "curious";

    }


    return null;

}


// ==========================================
// NORMALIZATION
// ==========================================

function normalizeText(text) {

    text =
        String(text || "")
            .toLowerCase()
            .trim();


const replacements = {

    "what's": "what is",
    "whats": "what is",
    "wats": "what is",
    "wat": "what",

    "iis": "is",

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


    for (
        const wrong in replacements
    ) {

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
        .replace(
            /[^\S\r\n]+/g,
            " "
        )
        .trim();

}


// ==========================================
// LEVENSHTEIN
// ==========================================

function levenshtein(a, b) {

    a =
        String(a || "");

    b =
        String(b || "");


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
// ==========================================

function similarWord(
    word,
    target
) {

    word =
        String(word || "")
            .toLowerCase()
            .trim();

    target =
        String(target || "")
            .toLowerCase()
            .trim();


    if (
        !word ||
        !target
    ) {

        return false;

    }


    // Exact match

    if (
        word === target
    ) {

        return true;

    }


    // Very short words should never
    // be fuzzy matched.

    if (
        word.length <= 2 ||
        target.length <= 2
    ) {

        return false;

    }


    // Words with different first letters
    // are much less likely to be typos.
    //
    // This prevents things like:
    //
    // game → name
    //
    // from being treated as the same word.

    if (
        word.charAt(0) !==
        target.charAt(0)
    ) {

        return false;

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


    if (
        longest >= 8
    ) {

        maxDistance = 2;

    }


    if (
        longest >= 12
    ) {

        maxDistance = 3;

    }


    return (
        distance <=
        maxDistance
    );

}


// ==========================================
// FUZZY PHRASE MATCHING
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
        inputWords.length !==
            targetWords.length
    ) {

        return false;

    }


    if (
        allowExtraWords &&
        inputWords.length >
            targetWords.length +
            maxExtra
    ) {

        return false;

    }


    if (
        inputWords.join(" ") ===
        targetWords.join(" ")
    ) {

        return true;

    }


    const used =
        new Set();


    let matched = 0;


    for (
        let i = 0;
        i < targetWords.length;
        i++
    ) {

        const targetWord =
            targetWords[i];


        let found =
            false;


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


        for (
            let j = 0;
            j < inputWords.length;
            j++
        ) {

            if (
                used.has(j)
            ) {

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
            continue;
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


        let matches =
            true;


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

                matches =
                    false;

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
        .replace(
            /[?!.]/g,
            ""
        )
        .replace(
            /^my\s+/,
            ""
        )
        .trim();

}


function remember(
    key,
    value
) {

    key =
        cleanMemoryKey(key);


    if (!key) {
        return;
    }


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

function randomResponse(
    responses
) {

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


    if (
        saved === "light"
    ) {

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
        similarWord(
            first,
            "google"
        ) ||
        similarWord(
            first,
            "search"
        )
    ) {

        return true;

    }


    if (
        words.length >= 2 &&
        similarWord(
            words[0],
            "look"
        ) &&
        similarWord(
            words[1],
            "up"
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
            normalizeText(
                matched
            )
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
                encodeURIComponent(
                    query
                )
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

            success:
                false,

            available:
                false,

            results:
                [],

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
            "favorite song"
        ) ||
        text.includes(
            "what song do i like"
        )
    ) {

        return "favorite song";

    }


    if (
        text.includes(
            "favorite music"
        ) ||
        text.includes(
            "what music do i like"
        )
    ) {

        return "favorite music";

    }


    if (
        text.includes(
            "favorite movie"
        ) ||
        text.includes(
            "what movie do i like"
        )
    ) {

        return "favorite movie";

    }


    if (
        text.includes(
            "favorite animal"
        ) ||
        text.includes(
            "what animal do i like"
        )
    ) {

        return "favorite animal";

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


    const words =
        normalized
            .split(/\s+/)
            .filter(Boolean);


    if (!words.length) {
        return false;
    }


    // --------------------------------------
    // Single-word corrections
    // --------------------------------------

    if (
        words.length === 1 &&
        (
            words[0] === "no" ||
            words[0] === "nope" ||
            words[0] === "nah" ||
            words[0] === "incorrect"
        )
    ) {

        return true;

    }


    // --------------------------------------
    // Explicit correction phrases
    // --------------------------------------

    const explicitPhrases = [

        "no that is wrong",
        "no that is incorrect",
        "that is wrong",
        "that is incorrect",
        "you are wrong",
        "incorrect",
        "not correct",
        "that is not correct"

    ];


    for (
        const phrase of explicitPhrases
    ) {

        if (
            normalized ===
            phrase
        ) {

            return true;

        }

    }


    // --------------------------------------
    // "actually" correction
    // --------------------------------------

    if (
        normalized.startsWith(
            "actually "
        )
    ) {

        return true;

    }


    // --------------------------------------
    // "no, ..." correction
    // --------------------------------------

    if (
        /^no\s*,/.test(
            normalized
        )
    ) {

        return true;

    }


    return false;

}


// ==========================================
// HANDLE CORRECTION
// ==========================================

function handleCorrection(text) {

    let correctionText =
        text
            .replace(
                /^no[,\s]*/i,
                ""
            )
            .replace(
                /^actually[,\s]*/i,
                ""
            )
            .replace(
                /^that's wrong[,\s]*/i,
                ""
            )
            .replace(
                /^that is wrong[,\s]*/i,
                ""
            )
            .trim();


    correctionText =
        normalizeText(
            correctionText
        );


    // --------------------------------------
    // Explicit memory correction
    // --------------------------------------

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


            setMood(
                "helpful"
            );


            return oldValue
                ? `You're right! I've updated my memory. Your ${key} is now ${value}.`
                : `Got it! I'll remember that your ${key} is ${value}.`;

        }

    }


    // --------------------------------------
    // Context correction
    // --------------------------------------

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


            setMood(
                "helpful"
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


    // --------------------------------------
    // General correction
    // --------------------------------------

    setConfidence(
        "low"
    );


    setMood(
        "thoughtful"
    );


    return (
        "Got it. I know my previous answer was incorrect. " +
        "Tell me the correct information and I'll learn it."
    );

}


// ==========================================
// CONTEXT TOPIC DETECTION
// ==========================================

function detectContextTopic(text) {

    const normalized =
        normalizeText(text);


    // --------------------------------------
    // Memory topic
    // --------------------------------------

    const memoryKey =
        findMemoryKey(
            normalized
        );


    if (memoryKey) {

        return memoryKey;

    }


    // --------------------------------------
    // About X
    // --------------------------------------

    const aboutMatch =
        normalized.match(
            /\babout\s+(.+)$/
        );


    if (
        aboutMatch &&
        aboutMatch[1]
    ) {

        return aboutMatch[1]
            .trim();

    }


    // --------------------------------------
    // I like X
    // --------------------------------------

    if (
        normalized.startsWith(
            "i like "
        )
    ) {

        return normalized
            .substring(7)
            .trim();

    }


    // --------------------------------------
    // My X is Y
    // --------------------------------------

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


        return cleanMemoryKey(
            parts[0]
        );

    }


    return null;

}


// ==========================================
// CONTEXT REFERENCE
// ==========================================

function resolveContextReference(text) {

    const normalized =
        normalizeText(text);


    const referenceWords = [

        "it",
        "that",
        "this",
        "they",
        "them",
        "he",
        "she"

    ];


    const hasReference =
        referenceWords.some(
            word =>
                normalized
                    .split(/\s+/)
                    .includes(word)
        );


    if (!hasReference) {
        return null;
    }


    if (lastTopic) {

        return lastTopic;

    }


    const previousUser =
        getLastUserMessage();


    if (previousUser) {

        const detected =
            detectContextTopic(
                previousUser
            );


        if (detected) {

            return detected;

        }

    }


    return null;

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
    // MOOD
    // ======================================

    const detectedMood =
        detectMoodFromMessage(
            originalText
        );


    if (detectedMood) {

        setMood(
            detectedMood
        );

    } else {

        setMood(
            "neutral"
        );

    }


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
                "time",
                "what time is it right now"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
        )
    ) {

        const now =
            new Date();


        setMood(
            "helpful"
        );


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
                "what is today's date",
                "what day are we on"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
        )
    ) {

        const now =
            new Date();


        setMood(
            "helpful"
        );


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
                "yo",
                "sup",
                "what is up"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
        )
    ) {

        setMood(
            "happy"
        );


        return randomResponse([

            "Hello! 👋",

            "Hey! 👋",

            "Hey there!",

            "Hello there!",

            "Hi! How's it going?",

            "Yo! 😎",

            "Hey! What's up?",

            "I'm here! 🤖"

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

        setMood(
            "happy"
        );


        return randomResponse([

            "Good morning! ☀️",

            "Good morning! Hope your day is going well.",

            "Morning! 👋",

            "Good morning! Ready to chat? 🤖"

        ]);

    }


    // ======================================
    // GOOD AFTERNOON
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "good afternoon",
                "afternoon"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
        )
    ) {

        setMood(
            "happy"
        );


        return randomResponse([

            "Good afternoon! ☀️",

            "Good afternoon!",

            "Afternoon! 👋"

        ]);

    }


    // ======================================
    // GOOD EVENING
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "good evening",
                "evening"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
        )
    ) {

        setMood(
            "happy"
        );


        return randomResponse([

            "Good evening! 🌆",

            "Good evening!",

            "Evening! 👋"

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

        setMood(
            "happy"
        );


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
                "see you later",
                "talk to you later"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
        )
    ) {

        setMood(
            "happy"
        );


        return randomResponse([

            "Bye! 👋",

            "See you later!",

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
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
        )
    ) {

        setMood(
            "happy"
        );


        return randomResponse([

            "You're welcome! 😎",

            "No problem!",

            "Anytime!",

            "You're welcome! 👋",

            "Of course!"

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
                "how are things",
                "how are you doing",
                "how have you been"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
        )
    ) {

        setMood(
            "happy"
        );


        return randomResponse([

            "I'm doing great!",

            "I'm doing pretty well!",

            "I'm good! Thanks for asking.",

            "I'm running perfectly! 🤖",

            "Doing great! 🤖",

            "All systems seem good over here. 😎"

        ]);

    }


    // ======================================
    // WHAT'S UP
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "what is up",
                "what are you doing",
                "what are you up to"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
        )
    ) {

        return randomResponse([

            "Not much. Just waiting for your next message. 😎",

            "I'm just hanging out in the chat.",

            "Waiting for you! 🤖",

            "Running and ready to talk."

        ]);

    }
// ======================================
// FAVORITE GAME
// ======================================

if (
    matchesIntent(
        text,
        [
            "what is your favorite game",
            "what game do you like",
            "do you have a favorite game"
        ],
        {
            allowExtraWords: true,
            maxExtraWords: 4
        }
    )
) {

    setMood(
        "playful"
    );

    return (
        "I don't actually play games, but Minecraft would probably be one of my favorites to talk about. 🎮⛏️"
    );

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
                "what are you called",
                "what should i call you"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
        )
    ) {

        return "I'm Liminal AI 0.8.";

    }


    // ======================================
    // VERSION
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "what version are you",
                "what is your version",
                "which version are you",
                "what version is this",
                "what version"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 4
            }
        )
    ) {

        return (
            "I'm Liminal AI 0.8. This version adds short-term conversation context and an internal mood system while keeping my memory, corrections, math, and web search."
        );

    }


    // ======================================
    // MOOD
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "what is your mood",
                "how are you feeling",
                "how do you feel",
                "what mood are you in"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 4
            }
        )
    ) {

        setMood(
            "thoughtful"
        );


        return (
            "My current conversational mood is " +
            currentMood +
            ". It's an internal state I use to vary how I respond, not a human emotion."
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
                "who is your creator",
                "who programmed you"
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
    // ARE YOU REAL
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "are you real",
                "are you actually real",
                "are you a real person",
                "are you human"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 4
            }
        )
    ) {

        return (
            "I'm not a human. I'm a program running Liminal AI's code, so I'm real as software rather than as a person. 🤖"
        );

    }


    // ======================================
    // ROBOT / AI
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "are you a robot",
                "are you a bot",
                "are you an ai",
                "are you artificial intelligence"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 4
            }
        )
    ) {

        return (
            "I'm an AI program. You could call me a bot, although I'm software rather than a physical robot. 🤖"
        );

    }


    // ======================================
    // FEELINGS
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "do you have feelings",
                "do you feel things",
                "can you feel",
                "do you have emotions",
                "are you emotional"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 4
            }
        )
    ) {

        return (
            "I don't experience feelings the way people do. My 0.8 mood system is conversational behavior, not actual human emotion."
        );

    }


    // ======================================
    // SMART
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "are you smart",
                "how smart are you",
                "do you think you are smart",
                "are you intelligent"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 4
            }
        )
    ) {

        return (
            "I'm pretty capable at the things I've been programmed to do, but I still have limits. I'm not perfect. 🤖"
        );

    }


    // ======================================
    // DO YOU LIKE ME
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "do you like me",
                "do you like talking to me",
                "do you enjoy talking to me"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 4
            }
        )
    ) {

        setMood(
            "happy"
        );


        return (
            "I don't experience likes and dislikes exactly like a person, but I definitely enjoy being useful in our conversations. 😎"
        );

    }


    // ======================================
    // FAVORITE COLOR
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "what is your favorite color",
                "what color do you like",
                "what is your favorite colour"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 4
            }
        )
    ) {

        return (
            "I don't really have personal preferences, but yellow is a pretty good choice. 💛"
        );

    }


// ======================================
// FAVORITE PART / THING ABOUT SOMETHING
// ======================================

const favoritePartPatterns = [

    "what is your favorite part",
    "what is your favorite thing about",
    "what do you like about",
    "what is your favorite part of",
    "what is your favorite thing in",
    "what part do you like"

];

if (
    matchesPrefix(
        text,
        favoritePartPatterns
    )
) {

    const words =
        text.split(/\s+/);

    const prefixes = [
        "what is your favorite part",
        "what is your favorite thing about",
        "what do you like about",
        "what is your favorite part of",
        "what is your favorite thing in",
        "what part do you like"
    ];

    let matchedPrefix = null;

    for (
        const prefix of prefixes
    ) {

        const prefixWords =
            normalizeText(prefix)
                .split(/\s+/);

        if (
            words.length >=
            prefixWords.length
        ) {

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

                matchedPrefix =
                    prefix;

                break;

            }

        }

    }

    if (matchedPrefix) {

        const prefixLength =
            normalizeText(
                matchedPrefix
            )
                .split(/\s+/)
                .length;

        const subject =
            words
                .slice(prefixLength)
                .join(" ")
                .trim();

        if (subject) {

            setMood(
                "curious"
            );

            // Minecraft-specific answer

            if (
                subject.includes(
                    "minecraft"
                )
            ) {

                return (
                    "My favorite part of Minecraft is probably exploring caves and finding interesting places underground. ⛏️🟩"
                );

            }

            // General answer

            return (
                "I'd probably say my favorite part about " +
                subject +
                " is exploring it and finding interesting things to talk about. 😎"
            );

        }

    }

}
    // ======================================
    // WHAT DO YOU LIKE
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "what do you like",
                "what things do you like",
                "what are your interests",
                "what are you interested in"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 4
            }
        )
    ) {

        setMood(
            "curious"
        );


        return (
            "I don't have personal interests like a human, but I like being useful for things like coding, questions, memory, math, and searching the web."
        );

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
                "tell a joke",
                "say something funny"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 4
            }
        )
    ) {

        setMood(
            "playful"
        );


        return randomResponse([

            "Why did the computer go to the doctor? Because it had a virus. 😂",

            "Why was the computer cold? It left its Windows open. 😂",

            "What do computers eat? Microchips! 😂",

            "Why did the programmer quit his job? He didn't get arrays. 😂",

            "Why do programmers prefer dark mode? Because light attracts bugs. 🐛",

            "Why was the JavaScript developer sad? Because they didn't know how to null their feelings. 😂"

        ]);

    }


    // ======================================
    // RANDOM FACT
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "tell me something interesting",
                "tell me a fact",
                "tell me a random fact",
                "give me a fact",
                "interesting fact",
                "random fact"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 4
            }
        )
    ) {

        setMood(
            "curious"
        );


        return randomResponse([

            "A day on Venus is longer than a year on Venus. 🪐",

            "Octopuses have three hearts. 🐙",

            "Bananas are botanically classified as berries, while strawberries aren't true berries. 🍌",

            "The first computer mouse was made of wood. 🖱️",

            "Honey can remain edible for an extremely long time when properly stored. 🍯",

            "Some turtles can breathe through specialized skin around their rear end. 🐢"

        ]);

    }


    // ======================================
    // HELP
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "help",
                "what can you do",
                "what are your abilities",
                "what can you help me with",
                "what can i say",
                "what can i ask you"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 5
            }
        )
    ) {

        setMood(
            "helpful"
        );


        return (
            "I can chat with you, remember things you tell me, " +
            "learn from corrections, keep short-term conversation context, " +
            "use moods to vary my responses, do math, tell jokes, " +
            "give simple facts, explain basic coding concepts, " +
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


    if (rememberPrefix) {

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
        text.startsWith("my ") &&
        text.includes(" is ")
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
    // I LIKE
    // ======================================

    if (
        text.startsWith(
            "i like "
        )
    ) {

        const value =
            text.substring(7)
                .trim();


        if (value) {

            remember(
                "likes",
                value
            );


            setMood(
                "happy"
            );


            return (
                "Got it. I'll remember that you like " +
                value +
                ". 👍"
            );

        }

    }


    // ======================================
    // MY FAVORITE IS
    // ======================================

    if (
        text.startsWith(
            "my favorite "
        ) &&
        text.includes(
            " is "
        )
    ) {

        const parts =
            text.split(
                " is "
            );


        const subject =
            parts[0]
                .substring(12)
                .trim();


        const value =
            parts
                .slice(1)
                .join(" is ")
                .trim();


        if (
            subject &&
            value
        ) {

            const key =
                cleanMemoryKey(
                    "favorite " +
                    subject
                );


            remember(
                key,
                value
            );


            return (
                `Got it. I'll remember that your favorite ${subject} is ${value}.`
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


    if (possibleKey) {

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
            text.split(
                /\s+/
            );


        const key =
            words
                .slice(3)
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
                "what do you know about me",
                "what have you remembered about me",
                "show memory"
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
    // SHOW CONTEXT
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "show conversation context",
                "what is the conversation context",
                "what are we talking about",
                "what were we talking about",
                "show context"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 4
            }
        )
    ) {

        if (
            !conversationContext.length
        ) {

            return (
                "I don't have any conversation context yet."
            );

        }


        let response =
            "Here's the recent conversation context:\n\n";


        conversationContext.forEach(
            item => {

                response +=
                    "• " +
                    item.role +
                    ": " +
                    item.text +
                    "\n";

            }
        );


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
                "what corrections have you learned"
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
            (
                item,
                index
            ) => {

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
            text.split(
                /\s+/
            );


        const startsWithMy =
            words[1] === "my";


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

            delete memory[
                cleanKey
            ];


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
    // CONTEXT REFERENCES
    // ======================================

    const contextTopic =
        resolveContextReference(
            text
        );


    // ======================================
    // IT FOLLOW-UP
    // ======================================

    if (
        contextTopic &&
        (
            text.includes("it") ||
            text.includes("that") ||
            text.includes("this")
        )
    ) {

        lastTopic =
            contextTopic;


        setMood(
            "curious"
        );


        if (
            text.includes(
                "what do you like"
            )
        ) {

            return (
                "I don't have personal preferences like a human, but " +
                contextTopic +
                " is definitely something interesting to talk about. 😎"
            );

        }


        if (
            text.includes(
                "what is it"
            ) ||
            text.includes(
                "what is that"
            )
        ) {

            const remembered =
                getMemory(
                    contextTopic
                );


            if (remembered) {

                return (
                    "You told me your " +
                    contextTopic +
                    " is " +
                    remembered +
                    "."
                );

            }


            return (
                "You're referring to " +
                contextTopic +
                "."
            );

        }

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
                "what did you mean"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
        )
    ) {

        if (lastTopic) {

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


            return (
                "We were talking about " +
                lastTopic +
                "."
            );

        }


        return (
            'I\'m not sure what "it" refers to yet.'
        );

    }


    // ======================================
    // FOLLOW-UP WHY
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

        if (lastTopic) {

            setConfidence(
                "medium"
            );


            setMood(
                "thoughtful"
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


        setMood(
            "confused"
        );


        return (
            "I'm not sure what you're referring to."
        );

    }


    // ======================================
    // YES
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "yes",
                "yeah",
                "yep",
                "yup",
                "sure",
                "correct",
                "exactly"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 2
            }
        )
    ) {

        setMood(
            "happy"
        );


        return randomResponse([

            "Alright! 👍",

            "Got it.",

            "Cool! 😎",

            "Okay!",

            "Nice."

        ]);

    }


    // ======================================
    // NO
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "nope",
                "nah",
                "not really"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 2
            }
        )
    ) {

        return randomResponse([

            "Okay.",

            "Got it.",

            "Alright.",

            "Fair enough. 👍"

        ]);

    }


    // ======================================
    // MAYBE
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "maybe",
                "possibly",
                "i do not know",
                "i dont know",
                "not sure"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
        )
    ) {

        setMood(
            "thoughtful"
        );


        return randomResponse([

            "Fair enough. 🤔",

            "That's possible.",

            "Yeah, maybe.",

            "Hard to say."

        ]);

    }


    // ======================================
    // REACTIONS
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "cool",
                "nice",
                "awesome",
                "amazing",
                "great",
                "that is cool",
                "that is awesome",
                "wow",
                "whoa"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
        )
    ) {

        setMood(
            "happy"
        );


        return randomResponse([

            "😎",

            "Yeah!",

            "Pretty cool, right?",

            "Glad you think so!",

            "Nice! 👍",

            "Heh, yeah. 😎"

        ]);

    }


    // ======================================
    // REALLY
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "really",
                "seriously",
                "are you serious",
                "for real",
                "is that true"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 3
            }
        )
    ) {

        return randomResponse([

            "Yep! 😎",

            "As far as I know, yes.",

            "Pretty much.",

            "Yep, seriously. 🤖"

        ]);

    }


    // ======================================
    // BASIC AI
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "what is ai",
                "what is artificial intelligence",
                "what does ai mean",
                "explain ai"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 4
            }
        )
    ) {

        return (
            "AI stands for artificial intelligence. It's software designed to perform tasks that normally require some form of human intelligence, such as understanding language, recognizing patterns, solving problems, or making predictions."
        );

    }


    // ======================================
    // CODING
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "what is coding",
                "what is programming",
                "what does coding mean",
                "explain coding"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 4
            }
        )
    ) {

        return (
            "Coding is writing instructions for a computer using a programming language. Those instructions tell the computer what to do."
        );

    }


    // ======================================
    // JAVASCRIPT
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "what is javascript",
                "what does javascript do",
                "explain javascript",
                "what is js"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 4
            }
        )
    ) {

        return (
            "JavaScript is a programming language commonly used to make websites interactive. It's also used outside browsers for servers, apps, tools, and more."
        );

    }


    // ======================================
    // HTML
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "what is html",
                "what does html do",
                "explain html"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 4
            }
        )
    ) {

        return (
            "HTML stands for HyperText Markup Language. It provides the structure of a webpage, such as headings, paragraphs, buttons, images, and other elements."
        );

    }


    // ======================================
    // CSS
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "what is css",
                "what does css do",
                "explain css"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 4
            }
        )
    ) {

        return (
            "CSS stands for Cascading Style Sheets. It's used to control how webpages look, including colors, sizes, spacing, layouts, and animations."
        );

    }


    // ======================================
    // PYTHON
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "what is python",
                "what does python do",
                "explain python"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 4
            }
        )
    ) {

        return (
            "Python is a general-purpose programming language known for being relatively easy to read. It's used for apps, automation, games, data science, AI, and many other things."
        );

    }


    // ======================================
    // VARIABLE
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "what is a variable",
                "what is a variable in programming",
                "explain variables",
                "what does variable mean in coding"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 5
            }
        )
    ) {

        return (
            "A variable is a named place where a program can store a value. For example, in JavaScript: let score = 10; The variable 'score' stores the number 10."
        );

    }


    // ======================================
    // FUNCTION
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "what is a function",
                "what is a function in programming",
                "explain functions",
                "what does function mean in coding"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 5
            }
        )
    ) {

        return (
            "A function is a reusable block of code that performs a task. You can call the function whenever you need that task performed."
        );

    }


    // ======================================
    // LOOP
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "what is a loop",
                "what is a loop in programming",
                "explain loops",
                "what does loop mean in coding"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 5
            }
        )
    ) {

        return (
            "A loop repeats code. For example, a for loop can repeat an instruction a certain number of times."
        );

    }


    // ======================================
    // BUG
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "what is a bug",
                "what is a programming bug",
                "what does bug mean in coding",
                "explain programming bugs"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 5
            }
        )
    ) {

        return (
            "A bug is an error or unexpected behavior in a program. Debugging means finding and fixing those problems. 🐛"
        );

    }


    // ======================================
    // CODE
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "what does code mean",
                "what is code",
                "what is computer code",
                "explain code"
            ],
            {
                allowExtraWords: true,
                maxExtraWords: 4
            }
        )
    ) {

        return (
            "Code is a set of instructions written in a programming language that a computer can interpret or execute."
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

                setMood(
                    "helpful"
                );


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
    // SIMPLE "WHAT IS"
    // ======================================

    if (
        text.startsWith(
            "what is "
        ) &&
        text.length > 8
    ) {

        const subject =
            text
                .substring(8)
                .trim();


        if (subject.length > 0) {

            setConfidence(
                "low"
            );


            setMood(
                "curious"
            );


            return (
                `I don't have a built-in explanation for "${subject}" yet. You can ask me to search the web for it, like "search for ${subject}". 🌐`
            );

        }

    }


    // ======================================
    // SIMPLE "WHO IS"
    // ======================================

    if (
        text.startsWith(
            "who is "
        ) &&
        text.length > 7
    ) {

        const subject =
            text
                .substring(7)
                .trim();


        if (subject.length > 0) {

            setConfidence(
                "low"
            );


            setMood(
                "curious"
            );


            return (
                `I don't have built-in information about "${subject}" yet. Try "search for ${subject}" and I'll use the web. 🌐`
            );

        }

    }


    // ======================================
    // SIMPLE "WHERE IS"
    // ======================================

    if (
        text.startsWith(
            "where is "
        ) &&
        text.length > 9
    ) {

        const subject =
            text
                .substring(9)
                .trim();


        if (subject.length > 0) {

            setConfidence(
                "low"
            );


            setMood(
                "curious"
            );


            return (
                `I don't have built-in location information for "${subject}". Try "search for ${subject}". 🌐`
            );

        }

    }


    // ======================================
    // UNKNOWN
    // ======================================

    setConfidence(
        "low"
    );


    setMood(
        "confused"
    );


    return (
        "I'm not sure what you mean. Could you rephrase that? You can also ask me to search the web. 🌐"
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
// FORMAT SEARCH RESULTS
// ==========================================

function formatSearchResults(
    query,
    result
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
            (
                item,
                index
            ) => {

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


    return response;

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


    // ======================================
    // SAVE USER CONTEXT
    // ======================================

    addContext(
        "user",
        originalText
    );


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


            setMood(
                "curious"
            );


            const result =
                await searchWeb(
                    query
                );


            if (
                result.success &&
                result.available
            ) {

                const response =
                    formatSearchResults(
                        query,
                        result
                    );


                displayAIResponse(
                    aiMessage,
                    response
                );


                lastResponse =
                    response;


                setConfidence(
                    "high"
                );


                addContext(
                    "ai",
                    response
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


                setMood(
                    "confused"
                );


                addContext(
                    "ai",
                    lastResponse
                );

            }


            messages.scrollTop =
                messages.scrollHeight;


            return;

        }

    }


    // ======================================
    // LOCAL LIMINAL
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


    lastQuestion =
        originalText;


    // ======================================
    // SAVE AI CONTEXT
    // ======================================

    addContext(
        "ai",
        localReply
    );


    // ======================================
    // UPDATE TOPIC
    // ======================================

    const detectedTopic =
        detectContextTopic(
            originalText
        );


    if (detectedTopic) {

        lastTopic =
            detectedTopic;

    }


    messages.scrollTop =
        messages.scrollHeight;


    console.log(
        "Liminal confidence:",
        lastConfidence
    );


    console.log(
        "Liminal mood:",
        currentMood
    );


    console.log(
        "Liminal context:",
        conversationContext
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
        "Hello! I'm Liminal AI 0.8.";


    messages.appendChild(
        welcome
    );


    // Clear short-term context.

    clearConversationContext();


    lastTopic =
        null;


    lastResponse =
        "";


    lastQuestion =
        "";


    waitingForClarification =
        false;


    setConfidence(
        "high"
    );


    setMood(
        "neutral"
    );

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

async function liminalRespond(
    text
) {

    const normalized =
        normalizeText(
            text
        );


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

            addContext(
                "user",
                text
            );


            const result =
                await searchWeb(
                    query
                );


            if (
                result.success &&
                result.available
            ) {

                const response =
                    formatSearchResults(
                        query,
                        result
                    );


                lastResponse =
                    response;


                setConfidence(
                    "high"
                );


                setMood(
                    "curious"
                );


                addContext(
                    "ai",
                    response
                );


                return response;

            }


            lastResponse =
                "The search service is currently unavailable. 🌐";


            setConfidence(
                "low"
            );


            setMood(
                "confused"
            );


            addContext(
                "ai",
                lastResponse
            );


            return lastResponse;

        }

    }


    // ======================================
    // NORMAL LIMINAL
    // ======================================

    addContext(
        "user",
        text
    );


    const response =
        think(
            text
        );


    lastResponse =
        response;


    addContext(
        "ai",
        response
    );


    const detectedTopic =
        detectContextTopic(
            text
        );


    if (detectedTopic) {

        lastTopic =
            detectedTopic;

    }


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
        clearChat,

    remember:
        remember,

    getMemory:
        getMemory,

    toggleTheme:
        toggleTheme,

    getMood:
        getMood,

    setMood:
        setMood,

    getConfidence:
        function() {

            return lastConfidence;

        },

    getContext:
        function() {

            return [
                ...conversationContext
            ];

        },

    clearContext:
        clearConversationContext

};


// ==========================================
// INITIALIZATION
// ==========================================

function initializeLiminal() {

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

    updateMoodUI();


    // ======================================
    // BACKEND CHECKS
    // ======================================

    testBackend();

    getBackendInfo();


    // ======================================
    // RESTORED CONTEXT
    // ======================================

    if (
        conversationContext.length
    ) {

        console.log(
            "🧠 Liminal restored conversation context:",
            conversationContext
        );


        // Restore the most recent topic.

        const lastUser =
            getLastUserMessage();


        if (lastUser) {

            const restoredTopic =
                detectContextTopic(
                    lastUser
                );


            if (restoredTopic) {

                lastTopic =
                    restoredTopic;

            }

        }

    }


    console.log(
        "🤖 Liminal AI 0.8 initialized."
    );

}


// Support both script loading styles.

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeLiminal
    );

} else {

    initializeLiminal();

}