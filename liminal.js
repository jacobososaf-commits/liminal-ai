
// ==========================================
// LIMINAL AI 0.8.1
// liminal.js
//
// ORIGINAL LIMINAL AI AGENT
//
// 0.8.1 BUG FIX UPDATE
//
// 0.8 FEATURES PRESERVED
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
//
// 0.8.1 FIXES
// - Fixed "forget" hijacking normal conversation
// - Fixed "actually" hijacking normal conversation
// - Removed dangerous "id" normalization collision
// - Removed dangerous "r" normalization collision
// - Added safer contraction normalization
// - Fixed empty search requests
// - Improved fuzzy memory-key detection
// - Fixed empty "what is my" responses
// - Improved context reference detection
// - Preserved favorite-part routing
// - Preserved generic "what is" routing
// - Preserved memory compatibility
//
// 0.8.1 INTERACTIONS
// - Added bro/bruh/btuh slang normalization
// - Added Bob interaction
// - Added Johnson interaction
// ==========================================


// ==========================================
// BACKEND
// ==========================================

const BACKEND_URL =
    "https://liminal-ai-backend.onrender.com";


// ==========================================
// MEMORY
// ==========================================

let memory;

try {

    memory =
        JSON.parse(
            localStorage.getItem("liminalMemory") || "{}"
        );

    if (
        typeof memory !== "object" ||
        memory === null ||
        Array.isArray(memory)
    ) {

        memory = {};

    }

} catch (error) {

    console.warn(
        "Liminal memory was corrupted. Resetting memory."
    );

    memory = {};

}


function saveMemory() {

    try {

        localStorage.setItem(
            "liminalMemory",
            JSON.stringify(memory)
        );

    } catch (error) {

        console.error(
            "Could not save Liminal memory:",
            error
        );

    }

}


// ==========================================
// CORRECTIONS
// ==========================================

let corrections;

try {

    corrections =
        JSON.parse(
            localStorage.getItem(
                "liminalCorrections"
            ) || "[]"
        );

    if (
        !Array.isArray(corrections)
    ) {

        corrections = [];

    }

} catch (error) {

    corrections = [];

}


function saveCorrections() {

    try {

        localStorage.setItem(
            "liminalCorrections",
            JSON.stringify(corrections)
        );

    } catch (error) {

        console.error(
            "Could not save corrections:",
            error
        );

    }

}


// ==========================================
// SHORT-TERM CONVERSATION CONTEXT
// ==========================================

let conversationContext;

try {

    conversationContext =
        JSON.parse(
            localStorage.getItem(
                "liminalContext"
            ) || "[]"
        );

    if (
        !Array.isArray(
            conversationContext
        )
    ) {

        conversationContext = [];

    }

} catch (error) {

    conversationContext = [];

}


const MAX_CONTEXT_MESSAGES = 12;


function saveConversationContext() {

    try {

        localStorage.setItem(
            "liminalContext",
            JSON.stringify(
                conversationContext
            )
        );

    } catch (error) {

        console.error(
            "Could not save conversation context:",
            error
        );

    }

}


function addContext(
    role,
    text
) {

    if (
        !text
    ) {

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

    if (
        !topic
    ) {

        return;

    }


    lastTopic =
        String(topic);


    if (
        value !== null
    ) {

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


    if (
        !moodElement
    ) {

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
//
// IMPORTANT:
// Do NOT normalize short real words such as:
// "id" -> "i would"
// "r"  -> "are"
//
// We only normalize actual informal forms.
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

        "who's": "who is",
        "whos": "who is",

        "where's": "where is",
        "wheres": "where is",
        "wher": "where",

        "favorite": "favorite",
        "fav": "favorite",
        "favourite": "favorite",

        "colour": "color",

        "please": "please",
        "pls": "please",
        "plz": "please",

        "i'm": "i am",
        "im": "i am",

        "i've": "i have",
        "ive": "i have",

        "i'll": "i will",
        "ill": "i will",

        "i'd": "i would",

        "you'd": "you would",
        "you'll": "you will",
        "you've": "you have",
        "youre": "you are",
        "you're": "you are",

        "theyre": "they are",
        "they're": "they are",

        "we're": "we are",
        "were": "we are",

        "cant": "cannot",
        "can't": "cannot",

        "dont": "do not",
        "don't": "do not",

        "doesnt": "does not",
        "doesn't": "does not",

        "didnt": "did not",
        "didn't": "did not",

        "isnt": "is not",
        "isn't": "is not",

        "arent": "are not",
        "aren't": "are not",

        "wasnt": "was not",
        "wasn't": "was not",

        "werent": "were not",
        "weren't": "were not",

        "thats": "that is",
        "that's": "that is",

        "hows": "how is",
        "how's": "how is",

        "tel": "tell",
        "tll": "tell",

        "jok": "joke",
        "jokee": "joke",

        "thnks": "thanks",
        "thanx": "thanks",

        "googl": "google",

        "ur": "your",
        "u": "you",
        "ya": "you",

        // ==================================
        // SLANG
        // ==================================
        //
        // These intentionally normalize to
        // "bro" so Liminal can understand
        // different spellings of the same slang.
        //

        "bruh": "bro",
        "bruhh": "bro",
        "bruhhh": "bro",
        "bruhhhh": "bro",

        "btuh": "bro",
        "btu": "bro",

        "broo": "bro",
        "brooo": "bro",
        "broooo": "bro",

        "brah": "bro",
        "brahh": "bro"

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


    // Handle stretched slang that uses
    // many repeated letters.
    //
    // Example:
    // broooooooo -> bro
    // bruhhhhhhhh -> bro
    //
    text =
        text.replace(
            /\bbr+u+h+\b/g,
            "bro"
        );


    text =
        text.replace(
            /\bbro{2,}\b/g,
            "bro"
        );


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


    if (
        word === target
    ) {

        return true;

    }


    if (
        word.length <= 2 ||
        target.length <= 2
    ) {

        return false;

    }


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


    if (
        !words.length
    ) {

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


    if (
        !key
    ) {

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


    if (
        !button
    ) {

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


    if (
        !words.length
    ) {

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

    const cleanQuery =
        String(query || "").trim();


    if (
        !cleanQuery
    ) {

        return {

            success:
                false,

            available:
                true,

            results:
                [],

            message:
                "No search query was provided."

        };

    }


    try {

        const response =
            await fetch(
                BACKEND_URL +
                "/api/search?q=" +
                encodeURIComponent(
                    cleanQuery
                )
            );


        const data =
            await response.json();


        if (
            !response.ok
        ) {

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

    const normalized =
        normalizeText(text);


    const memoryPatterns = [

        {
            key: "favorite color",
            phrases: [
                "favorite color",
                "what color do i like",
                "what is my favorite color",
                "what is my favorite colour"
            ]
        },

        {
            key: "favorite game",
            phrases: [
                "favorite game",
                "what game do i like",
                "what is my favorite game"
            ]
        },

        {
            key: "favorite food",
            phrases: [
                "favorite food",
                "what food do i like",
                "what is my favorite food"
            ]
        },

        {
            key: "favorite song",
            phrases: [
                "favorite song",
                "what song do i like",
                "what is my favorite song"
            ]
        },

        {
            key: "favorite music",
            phrases: [
                "favorite music",
                "what music do i like",
                "what is my favorite music"
            ]
        },

        {
            key: "favorite movie",
            phrases: [
                "favorite movie",
                "what movie do i like",
                "what is my favorite movie"
            ]
        },

        {
            key: "favorite animal",
            phrases: [
                "favorite animal",
                "what animal do i like",
                "what is my favorite animal"
            ]
        },

        {
            key: "name",
            phrases: [
                "my name",
                "what is my name",
                "tell me my name"
            ]
        },

        {
            key: "location",
            phrases: [
                "where do i live",
                "my location",
                "what is my location"
            ]
        }

    ];


    for (
        const item of memoryPatterns
    ) {

        for (
            const phrase of item.phrases
        ) {

            if (
                normalized.includes(
                    normalizeText(
                        phrase
                    )
                )
            ) {

                return item.key;

            }

        }

    }


    for (
        const item of memoryPatterns
    ) {

        for (
            const phrase of item.phrases
        ) {

            if (
                fuzzyPhraseMatch(
                    normalized,
                    phrase,
                    {
                        allowExtraWords: true,
                        maxExtraWords: 5
                    }
                )
            ) {

                return item.key;

            }

        }

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


    if (
        !words.length
    ) {

        return false;

    }


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


    if (
        /^no\s*,\s*(that is|you are|this is)?/.test(
            normalized
        )
    ) {

        if (
            normalized.includes("wrong") ||
            normalized.includes("incorrect") ||
            normalized.includes("not correct")
        ) {

            return true;

        }

    }


    if (
        normalized.startsWith(
            "actually "
        )
    ) {

        const afterActually =
            normalized
                .substring(
                    "actually ".length
                )
                .trim();


        if (
            !afterActually
        ) {

            return false;

        }


        if (
            afterActually.startsWith(
                "my "
            ) &&
            afterActually.includes(
                " is "
            )
        ) {

            return true;

        }


        if (
            afterActually.startsWith(
                "it is "
            )
        ) {

            return true;

        }


        if (
            afterActually.startsWith(
                "that is "
            )
        ) {

            return true;

        }


        if (
            afterActually.startsWith(
                "this is "
            )
        ) {

            return true;

        }


        if (
            afterActually.startsWith(
                "i meant "
            )
        ) {

            return true;

        }


        if (
            afterActually.startsWith(
                "i mean "
            )
        ) {

            return true;

        }


        if (
            lastQuestion &&
            (
                afterActually.includes(
                    "not "
                ) ||
                afterActually.includes(
                    "wrong"
                ) ||
                afterActually.includes(
                    "incorrect"
                ) ||
                afterActually.includes(
                    "instead"
                )
            )
        ) {

            return true;

        }

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


    if (
        correctionText.startsWith(
            "i meant "
        )
    ) {

        const value =
            correctionText
                .substring(8)
                .trim();


        if (
            value &&
            lastTopic
        ) {

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


            setConfidence(
                "high"
            );


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


    if (
        correctionText.startsWith(
            "i mean "
        )
    ) {

        const value =
            correctionText
                .substring(7)
                .trim();


        if (
            value &&
            lastTopic
        ) {

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


            setConfidence(
                "high"
            );


            setMood(
                "helpful"
            );


            return (
                "Got it! I've corrected my memory. " +
                "Your " +
                lastTopic +
                " is now " +
                value +
                "."
            );

        }

    }


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


        if (
            value
        ) {

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


    const memoryKey =
        findMemoryKey(
            normalized
        );


    if (
        memoryKey
    ) {

        return memoryKey;

    }


    const aboutMatch =
        normalized.match(
            /\babout\s+(.+)$/
        );


    if (
        aboutMatch &&
        aboutMatch[1]
    ) {

        return aboutMatch[1]
            .trim()
            .replace(
                /[?.!]+$/,
                ""
            )
            .trim();

    }


    if (
        normalized.startsWith(
            "i like "
        )
    ) {

        return normalized
            .substring(7)
            .trim();

    }


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
// FAVORITE SUBJECT
// ==========================================

function getFavoriteSubject(text) {

    const normalized =
        normalizeText(text);


    const patterns = [

        /^what is your favorite part (?:in|of|about) (.+)$/,

        /^what is your favorite thing (?:in|of|about) (.+)$/,

        /^what do you like about (.+)$/,

        /^what part do you like (?:in|of|about) (.+)$/,

        /^what is your favorite part (.+)$/,

        /^what is your favorite thing (.+)$/,

        /^what do you like about (.+)$/

    ];


    for (
        const pattern of patterns
    ) {

        const match =
            normalized.match(
                pattern
            );


        if (
            match &&
            match[1]
        ) {

            const subject =
                match[1]
                    .trim()
                    .replace(
                        /[?.!]+$/,
                        ""
                    )
                    .trim();


            if (
                subject
            ) {

                return subject;

            }

        }

    }


    return null;

}


// ==========================================
// FAVORITE QUESTION
// ==========================================

function isFavoriteQuestion(text) {

    return (
        getFavoriteSubject(text) !==
        null
    );

}


// ==========================================
// FAVORITE SUBJECT RESPONSE
// ==========================================

function answerFavoriteQuestion(
    subject
) {

    const normalizedSubject =
        normalizeText(
            subject
        );


    setMood(
        "curious"
    );


    setConfidence(
        "high"
    );


    if (
        normalizedSubject === "minecraft" ||
        normalizedSubject.includes(
            "minecraft"
        )
    ) {

        return (
            "My favorite part of Minecraft is probably exploring caves and finding interesting places underground. ⛏️🟩"
        );

    }


    if (
        normalizedSubject === "roblox"
    ) {

        return (
            "My favorite part of Roblox is probably how many different kinds of experiences people can create. 🎮"
        );

    }


    if (
        normalizedSubject === "coding" ||
        normalizedSubject === "programming"
    ) {

        return (
            "My favorite part of coding is probably turning an idea into something that actually works. 💻"
        );

    }


    if (
        normalizedSubject === "python"
    ) {

        return (
            "My favorite part of Python is how readable it is and how many different things you can build with it. 🐍"
        );

    }


    if (
        normalizedSubject === "javascript"
    ) {

        return (
            "My favorite part of JavaScript is making webpages actually do things instead of just displaying information. 🌐"
        );

    }


    return (
        "I'd probably say my favorite part about " +
        subject +
        " is exploring it and finding interesting things to talk about. 😎"
    );

}


// ==========================================
// FORGET DETECTION
// ==========================================

function isForgetRequest(text) {

    const normalized =
        normalizeText(text);


    const words =
        normalized
            .split(/\s+/)
            .filter(Boolean);


    if (
        words.length < 2
    ) {

        return false;

    }


    if (
        words[0] !== "forget"
    ) {

        return false;

    }


    const target =
        words
            .slice(1)
            .join(" ")
            .trim();


    if (
        !target
    ) {

        return false;

    }


    const normalConversationTargets = [

        "about it",
        "about this",
        "about that",
        "it",
        "this",
        "that",
        "you",
        "me",
        "everything",
        "what i said"

    ];


    if (
        normalConversationTargets.includes(
            target
        )
    ) {

        if (
            target === "that" &&
            lastTopic
        ) {

            return true;

        }


        return false;

    }


    if (
        target.startsWith(
            "my "
        )
    ) {

        return true;

    }


    const knownMemoryKey =
        findMemoryKey(
            "what is my " +
            target
        );


    if (
        knownMemoryKey
    ) {

        return true;

    }


    return (
        target.length >= 2
    );

}


// ==========================================
// HANDLE FORGET
// ==========================================

function handleForget(text) {

    const normalized =
        normalizeText(text);


    const words =
        normalized
            .split(/\s+/)
            .filter(Boolean);


    let key;


    if (
        words[1] === "my"
    ) {

        key =
            words
                .slice(2)
                .join(" ")
                .trim();

    } else {

        key =
            words
                .slice(1)
                .join(" ")
                .trim();

    }


    const knownKey =
        findMemoryKey(
            "what is my " +
            key
        );


    if (
        knownKey
    ) {

        key =
            knownKey;

    }


    const cleanKey =
        cleanMemoryKey(
            key
        );


    if (
        !cleanKey
    ) {

        setConfidence(
            "low"
        );


        return (
            "Tell me which memory you want me to forget."
        );

    }


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


        if (
            lastTopic ===
            cleanKey
        ) {

            lastTopic =
                null;

        }


        setConfidence(
            "high"
        );


        setMood(
            "helpful"
        );


        return (
            "Okay, I forgot your " +
            cleanKey +
            "."
        );

    }


    setConfidence(
        "medium"
    );


    return (
        "I don't have a memory about your " +
        cleanKey +
        "."
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
    // MOOD
    // ======================================

    const detectedMood =
        detectMoodFromMessage(
            originalText
        );


    if (
        detectedMood
    ) {

        setMood(
            detectedMood
        );

    } else {

        setMood(
            "neutral"
        );

    }


    // ======================================
    // SPECIAL LIMINAL INTERACTIONS
    // ======================================
    //
    // These happen BEFORE normal routing.
    // That makes them deliberate personality
    // interactions rather than generic unknown
    // questions.
    //
    // Bob:
    // "bob" -> "he blinked"
    //
    // Johnson:
    // "johnson" -> "He's bald and weird."
    //
    // ======================================

    if (
        matchesIntent(
            text,
            [
                "bob"
            ],
            {
                allowExtraWords: false
            }
        )
    ) {

        setMood(
            "playful"
        );


        return (
            "He blinked. 👁️"
        );

    }


    if (
        matchesIntent(
            text,
            [
                "johnson"
            ],
            {
                allowExtraWords: false
            }
        )
    ) {

        setMood(
            "playful"
        );


        return (
            "He's bald and weird. 🗿"
        );

    }


    // ======================================
    // BRO / BRUH
    // ======================================
    //
    // normalizeText() converts:
    // bro
    // bruh
    // btuh
    // broooo
    // bruhhhh
    // brah
    // etc.
    //
    // into:
    // "bro"
    //
    // This gives Liminal a dedicated
    // understanding of the slang rather than
    // depending completely on fuzzy matching.
    // ======================================

    if (
        text === "bro"
    ) {

        setMood(
            "playful"
        );


        return randomResponse([

            "Bro. 😭",

            "Yeah, bro?",

            "Brooo. 😭",

            "What is it, bro? 😭",

            "I'm listening, bro. 😎",

            "Bro 💀"

        ]);

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
    // FAVORITE PART
    // ======================================

    if (
        isFavoriteQuestion(
            text
        )
    ) {

        const subject =
            getFavoriteSubject(
                text
            );


        if (
            subject
        ) {

            return answerFavoriteQuestion(
                subject
            );

        }

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

        return (
            "I'm Liminal AI 0.8.1."
        );

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
            "I'm Liminal AI 0.8.1. This is the bug-fix build of 0.8, keeping short-term conversation context, mood, memory, corrections, math, and web search."
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

        const mood =
            currentMood;


        setMood(
            "thoughtful"
        );


        return (
            "My current conversational mood is " +
            mood +
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


        if (
            value
        ) {

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


        if (
            value
        ) {

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


        if (
            value
        ) {

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

    const memoryQuestionPrefix =
        matchesPrefix(
            text,
            [
                "what is my",
                "tell me my"
            ]
        );


    if (
        memoryQuestionPrefix
    ) {

        const words =
            text.split(
                /\s+/
            );


        const prefixWords =
            normalizeText(
                memoryQuestionPrefix
            )
                .split(
                    /\s+/
                )
                .length;


        const key =
            words
                .slice(prefixWords)
                .join(" ")
                .trim();


        const cleanKey =
            cleanMemoryKey(
                key
            );


        if (
            !cleanKey
        ) {

            setConfidence(
                "low"
            );


            setMood(
                "confused"
            );


            return (
                "What would you like me to remember about you?"
            );

        }


        const value =
            getMemory(
                cleanKey
            );


        if (
            value
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


        if (
            !keys.length
        ) {

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
        isForgetRequest(
            text
        )
    ) {

        return handleForget(
            text
        );

    }


    // ======================================
    // CONTEXT REFERENCES
    // ======================================

    const contextTopic =
        resolveContextReference(
            text
        );


    if (
        contextTopic &&
        hasDirectContextReference(
            text
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


            if (
                remembered
            ) {

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

        if (
            lastTopic
        ) {

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


        if (
            subject.length > 0
        ) {

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


        if (
            subject.length > 0
        ) {

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


        if (
            subject.length > 0
        ) {

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


    const words =
        normalized
            .split(/\s+/)
            .filter(Boolean);


    const hasReference =
        referenceWords.some(
            word =>
                words.includes(
                    word
                )
        );


    if (
        !hasReference
    ) {

        return null;

    }


    if (
        lastTopic
    ) {

        return lastTopic;

    }


    const previousUser =
        getPreviousUserMessage();


    if (
        previousUser
    ) {

        const detected =
            detectContextTopic(
                previousUser
            );


        if (
            detected
        ) {

            return detected;

        }

    }


    return null;

}


// ==========================================
// PREVIOUS USER MESSAGE
// ==========================================

function getPreviousUserMessage() {

    let foundCurrent = false;


    for (
        let i = conversationContext.length - 1;
        i >= 0;
        i--
    ) {

        if (
            conversationContext[i].role !==
            "user"
        ) {

            continue;

        }


        if (
            !foundCurrent
        ) {

            foundCurrent = true;

            continue;

        }


        return conversationContext[i].text;

    }


    return "";

}


// ==========================================
// DIRECT CONTEXT REFERENCE
// ==========================================

function hasDirectContextReference(text) {

    const normalized =
        normalizeText(text);


    const directPatterns = [

        /\bwhat is (?:it|that|this)\b/,

        /\bwhat was (?:it|that|this)\b/,

        /\btell me about (?:it|that|this)\b/,

        /\bwhat do you like about (?:it|that|this)\b/,

        /\bwhat do you think about (?:it|that|this)\b/,

        /\bwhat about (?:it|that|this)\b/,

        /\bwhy is (?:it|that|this)\b/,

        /\bhow is (?:it|that|this)\b/

    ];


    return directPatterns.some(
        pattern =>
            pattern.test(
                normalized
            )
    );

}


// ==========================================
// SAFE DISPLAY
// ==========================================

function displayAIResponse(
    element,
    text
) {

    if (
        !element
    ) {

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


    if (
        !originalText
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


        if (
            !query
        ) {

            const response =
                "What would you like me to search for? 🌐";


            displayAIResponse(
                aiMessage,
                response
            );


            lastResponse =
                response;


            lastQuestion =
                originalText;


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


            messages.scrollTop =
                messages.scrollHeight;


            return;

        }


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


            lastQuestion =
                originalText;


            setConfidence(
                "high"
            );


            addContext(
                "ai",
                response
            );

        } else {

            const response =
                "The search service is currently unavailable. 🌐";


            displayAIResponse(
                aiMessage,
                response
            );


            lastResponse =
                response;


            lastQuestion =
                originalText;


            setConfidence(
                "low"
            );


            setMood(
                "confused"
            );


            addContext(
                "ai",
                response
            );

        }


        messages.scrollTop =
            messages.scrollHeight;


        return;

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


    if (
        detectedTopic
    ) {

        lastTopic =
            detectedTopic;

    }


    const favoriteSubject =
        getFavoriteSubject(
            originalText
        );


    if (
        favoriteSubject
    ) {

        lastTopic =
            favoriteSubject;

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
        "Hello! I'm Liminal AI 0.8.1.";


    messages.appendChild(
        welcome
    );


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


        if (
            !response.ok
        ) {

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


        if (
            !query
        ) {

            const response =
                "What would you like me to search for? 🌐";


            addContext(
                "user",
                text
            );


            lastResponse =
                response;


            lastQuestion =
                text;


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


            lastQuestion =
                text;


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


        lastQuestion =
            text;


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


    lastQuestion =
        text;


    addContext(
        "ai",
        response
    );


    const detectedTopic =
        detectContextTopic(
            text
        );


    if (
        detectedTopic
    ) {

        lastTopic =
            detectedTopic;

    }


    const favoriteSubject =
        getFavoriteSubject(
            text
        );


    if (
        favoriteSubject
    ) {

        lastTopic =
            favoriteSubject;

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
        clearConversationContext,

    getTopic:
        function() {

            return lastTopic;

        }

};


// ==========================================
// INITIALIZATION
// ==========================================

function initializeLiminal() {

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


    testBackend();

    getBackendInfo();


    if (
        conversationContext.length
    ) {

        console.log(
            "🧠 Liminal restored conversation context:",
            conversationContext
        );


        const lastUser =
            getLastUserMessage();


        if (
            lastUser
        ) {

            const restoredFavorite =
                getFavoriteSubject(
                    lastUser
                );


            if (
                restoredFavorite
            ) {

                lastTopic =
                    restoredFavorite;

            } else {

                const restoredTopic =
                    detectContextTopic(
                        lastUser
                    );


                if (
                    restoredTopic
                ) {

                    lastTopic =
                        restoredTopic;

                }

            }

        }

    }


    console.log(
        "🤖 Liminal AI 0.8.1 initialized."
    );

}


// ==========================================
// SUPPORT BOTH SCRIPT LOADING STYLES
// ==========================================

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
