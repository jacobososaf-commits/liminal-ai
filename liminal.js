// ==========================================

// LIMINAL AI 0.9 - liminal.js

// Cleaned-up version: same features, less code.

//

// Structure:

//   1. Config & storage

//   2. Conversation context, topic & mood state

//   3. Text normalization & fuzzy matching

//   4. Memory, corrections & forget helpers

//   5. Search

//   6. Intent handlers (ordered table) & think()

//   7. UI: sendMessage, clearChat, theme

//   8. Public API & initialization

// ==========================================





// ==========================================

// 1. CONFIG & STORAGE

// ==========================================



const VERSION = "0.10";

const BACKEND_URL = "https://liminal-ai-backend.onrender.com";

const MAX_CONTEXT_MESSAGES = 12;



const byId = id => document.getElementById(id);





function loadStored(key, fallback, isValid) {



    try {



        const raw = localStorage.getItem(key);



        if (!raw) {



            return fallback;



        }



        const value = JSON.parse(raw);



        return isValid(value) ? value : fallback;



    } catch (error) {



        console.warn(`Liminal: could not read "${key}". Using defaults.`);



        return fallback;



    }



}





function saveStored(key, value) {



    try {



        localStorage.setItem(key, JSON.stringify(value));



    } catch (error) {



        console.error(`Liminal: could not save "${key}":`, error);



    }



}





let memory = loadStored(

    "liminalMemory",

    {},

    value => value && typeof value === "object" && !Array.isArray(value)

);



let corrections = loadStored("liminalCorrections", [], Array.isArray);



let conversationContext = loadStored("liminalContext", [], Array.isArray);





const saveMemory = () => saveStored("liminalMemory", memory);



const saveCorrections = () => saveStored("liminalCorrections", corrections);



const saveConversationContext = () => saveStored("liminalContext", conversationContext);





// ==========================================

// 2. CONTEXT, TOPIC & MOOD STATE

// ==========================================



let lastTopic = null;

let lastResponse = "";

let lastQuestion = "";

let lastConfidence = "high";

let currentMood = "neutral";

let previousMood = "neutral";





function addContext(role, text) {



    if (!text) {



        return;



    }



    conversationContext.push({

        role,

        text: String(text),

        time: new Date().toISOString()

    });



    if (conversationContext.length > MAX_CONTEXT_MESSAGES) {



        conversationContext = conversationContext.slice(-MAX_CONTEXT_MESSAGES);



    }



    saveConversationContext();



}





function getLastUserMessage() {



    const users = conversationContext.filter(item => item.role === "user");



    return users.length ? users[users.length - 1].text : "";



}





// The user message before the current one.

function getPreviousUserMessage() {



    const users = conversationContext.filter(item => item.role === "user");



    return users.length >= 2 ? users[users.length - 2].text : "";



}





function clearConversationContext() {



    conversationContext = [];



    saveConversationContext();



}





function setConfidence(level) {



    lastConfidence = level;



}





const MOOD_LABELS = {

    neutral: "😐 Neutral",

    happy: "😊 Happy",

    curious: "🤔 Curious",

    excited: "🤩 Excited",

    thoughtful: "🧠 Thoughtful",

    confused: "😕 Confused",

    playful: "😎 Playful",

    helpful: "🤝 Helpful"

};





function setMood(mood) {



    if (!(mood in MOOD_LABELS)) {



        mood = "neutral";



    }



    previousMood = currentMood;



    currentMood = mood;



    updateMoodUI();



}





function getMood() {



    return currentMood;



}





function updateMoodUI() {



    const element = byId("moodStatus");



    if (element) {



        element.textContent = MOOD_LABELS[currentMood] || MOOD_LABELS.neutral;



    }



}





// ==========================================

// 3. NORMALIZATION & FUZZY MATCHING

// ==========================================

//

// Do NOT normalize real short words such as

// "id" -> "i would" or "r" -> "are".

// Only normalize actual informal forms.

// ==========================================



const WORD_REPLACEMENTS = {



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



    "fav": "favorite",

    "favourite": "favorite",

    "colour": "color",



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



    // Slang -> "bro" (stretched forms are handled by regex below)

    "btuh": "bro",

    "btu": "bro"



};





// Compile the replacement regexes once instead of on every call.

const replacementRules = Object.entries(WORD_REPLACEMENTS).map(

    ([from, to]) => [

        new RegExp(

            "\\\b" + from.replace(/[.*+?^${}()|[**\\]\\\**]/g, "\\\\$&") + "\\\b",

            "g"

        ),

        to

    ]

);





function normalizeText(text) {



    text = String(text || "").toLowerCase().trim();



    for (const [regex, replacement] of replacementRules) {



        text = text.replace(regex, replacement);



    }



    return text

        .replace(/\bbr+u+h+\b/g, "bro")   // bruh, bruhhhh

        .replace(/\bbra+h+\b/g, "bro")    // brah, brahh

        .replace(/\bbro{2,}\b/g, "bro")   // broo, broooo

        .replace(/[^\S\r\n]+/g, " ")

        .trim();



}





function levenshtein(a, b) {



    a = String(a || "");

    b = String(b || "");



    let previous = Array.from({ length: a.length + 1 }, (_, j) => j);



    for (let i = 1; i <= b.length; i++) {



        const current = [i];



        for (let j = 1; j <= a.length; j++) {



            current[j] =

                b.charAt(i - 1) === a.charAt(j - 1)

                    ? previous[j - 1]

                    : 1 + Math.min(previous[j - 1], current[j - 1], previous[j]);



        }



        previous = current;



    }



    return previous[a.length];



}





function similarWord(word, target) {



    word = String(word || "").toLowerCase().trim();

    target = String(target || "").toLowerCase().trim();



    if (!word || !target) {



        return false;



    }



    if (word === target) {



        return true;



    }



    // Short words and different first letters must match exactly.

    if (

        word.length <= 2 ||

        target.length <= 2 ||

        word.charAt(0) !== target.charAt(0)

    ) {



        return false;



    }



    const longest = Math.max(word.length, target.length);



    const maxDistance = longest >= 12 ? 3 : longest >= 8 ? 2 : 1;



    return levenshtein(word, target) <= maxDistance;



}





function fuzzyPhraseMatch(input, phrase, options = {}) {



    const inputWords = normalizeText(input).split(/\s+/).filter(Boolean);

    const targetWords = normalizeText(phrase).split(/\s+/).filter(Boolean);



    if (!inputWords.length || !targetWords.length) {



        return false;



    }



    const allowExtraWords = options.allowExtraWords !== false;

    const maxExtra = options.maxExtraWords ?? 3;



    if (!allowExtraWords && inputWords.length !== targetWords.length) {



        return false;



    }



    if (allowExtraWords && inputWords.length > targetWords.length + maxExtra) {



        return false;



    }



    if (inputWords.join(" ") === targetWords.join(" ")) {



        return true;



    }



    const used = new Set();



    let matched = 0;



    targetWords.forEach((targetWord, i) => {



        // Prefer the word in the same position.

        if (inputWords[i] && similarWord(inputWords[i], targetWord)) {



            used.add(i);

            matched++;



            return;



        }



        for (let j = 0; j < inputWords.length; j++) {



            if (!used.has(j) && similarWord(inputWords[j], targetWord)) {



                used.add(j);

                matched++;



                return;



            }



        }



    });



    return matched === targetWords.length;



}





function matchesIntent(text, phrases, options = {}) {



    const normalized = normalizeText(text);



    return phrases.some(phrase => fuzzyPhraseMatch(normalized, phrase, options));



}





// Returns the first prefix that matches the start of the text, or null.

function matchesPrefix(text, prefixes) {



    const words = normalizeText(text).split(/\s+/).filter(Boolean);



    if (!words.length) {



        return null;



    }



    for (const prefix of prefixes) {



        const prefixWords = normalizeText(prefix).split(/\s+/).filter(Boolean);



        if (words.length < prefixWords.length) {



            continue;



        }



        if (prefixWords.every((word, i) => similarWord(words[i], word))) {



            return prefix;



        }



    }



    return null;



}





// ==========================================

// 4. MEMORY, CORRECTIONS & FORGET

// ==========================================



function cleanMemoryKey(key) {



    return normalizeText(key)

        .replace(/[?!.]/g, "")

        .replace(/^my\s+/, "")

        .trim();



}





function remember(key, value) {



    key = cleanMemoryKey(key);



    if (!key) {



        return;



    }



    memory[key] = value;



    lastTopic = key;



    saveMemory();



}





function getMemory(key) {



    return memory[cleanMemoryKey(key)];



}





// "favorite color is yellow" -> { key: "favorite color", value: "yellow" }

function parseIsStatement(body) {



    const index = body.indexOf(" is ");



    if (index === -1) {



        return null;



    }



    const key = cleanMemoryKey(body.slice(0, index));

    const value = body.slice(index + 4).trim();



    return key && value ? { key, value } : null;



}





function storeFact(key, value) {



    const oldValue = memory[key];



    remember(key, value);



    return oldValue

        ? `Got it. I've updated my memory. Your ${key} is now ${value}.`

        : `Got it. I'll remember that your ${key} is ${value}.`;



}





function recall(key) {



    const value = getMemory(key);



    if (!value) {



        return `I don't remember your ${key} yet.`;



    }



    lastTopic = key;



    return `Your ${key} is ${value}.`;



}





const FAVORITE_CATEGORIES = [

    "color", "game", "food", "song", "music", "movie", "animal"

];



const MEMORY_PATTERNS = [



    ...FAVORITE_CATEGORIES.map(item => ({

        key: `favorite ${item}`,

        phrases: [

            `favorite ${item}`,

            `what ${item} do i like`,

            `what is my favorite ${item}`

        ]

    })),



    {

        key: "name",

        phrases: ["my name", "what is my name", "tell me my name"]

    },



    {

        key: "location",

        phrases: ["where do i live", "my location", "what is my location"]

    }



];





function findMemoryKey(text) {



    const normalized = normalizeText(text);



    // Exact substring match first...

    for (const item of MEMORY_PATTERNS) {



        if (item.phrases.some(phrase => normalized.includes(normalizeText(phrase)))) {



            return item.key;



        }



    }



    // ...then fuzzy match.

    for (const item of MEMORY_PATTERNS) {



        const hit = item.phrases.some(phrase =>

            fuzzyPhraseMatch(normalized, phrase, {

                allowExtraWords: true,

                maxExtraWords: 5

            })

        );



        if (hit) {



            return item.key;



        }



    }



    return null;



}





// ---------- Corrections ----------



function isCorrection(text) {



    const normalized = normalizeText(text);

    const words = normalized.split(/\s+/).filter(Boolean);



    if (!words.length) {



        return false;



    }



    if (words.length === 1 && ["no", "nope", "nah", "incorrect"].includes(words[0])) {



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



    if (explicitPhrases.includes(normalized)) {



        return true;



    }



    if (

        /^no\s*,/.test(normalized) &&

        /wrong|incorrect|not correct/.test(normalized)

    ) {



        return true;



    }



    if (normalized.startsWith("actually ")) {



        const rest = normalized.substring("actually ".length).trim();



        if (!rest) {



            return false;



        }



        if (rest.startsWith("my ") && rest.includes(" is ")) {



            return true;



        }



        const correctionStarts = ["it is ", "that is ", "this is ", "i meant ", "i mean "];



        if (correctionStarts.some(start => rest.startsWith(start))) {



            return true;



        }



        if (lastQuestion && /not |wrong|incorrect|instead/.test(rest)) {



            return true;



        }



    }



    return false;



}





function recordCorrection(type, key, oldValue, newValue) {



    corrections.push({

        type,

        key,

        oldValue,

        newValue,

        time: new Date().toISOString()

    });



    saveCorrections();



}





function correctionSucceeded() {



    setConfidence("high");

    setMood("helpful");



}





// Replace the value of the current topic.

function correctLastTopic(value, opener) {



    const oldValue = memory[cleanMemoryKey(lastTopic)] || null;



    remember(lastTopic, value);



    recordCorrection("context_update", lastTopic, oldValue, value);



    correctionSucceeded();



    return `${opener} I've corrected my memory. Your ${lastTopic} is now ${value}.`;



}





function handleCorrection(text) {



    const body = normalizeText(

        text

            .replace(/^no\b[,\s]*/i, "")

            .replace(/^actually\b[,\s]*/i, "")

            .replace(/^that (?:is|'s) wrong\b[,\s]*/i, "")

    );



    // "i meant X" / "i mean X"

    const meant = body.match(/^i (meant|mean) (.+)$/);



    if (meant && meant[2].trim() && lastTopic) {



        return correctLastTopic(

            meant[2].trim(),

            meant[1] === "meant" ? "You're right!" : "Got it!"

        );



    }



    // "my X is Y"

    if (body.startsWith("my ")) {



        const fact = parseIsStatement(body.slice(3));



        if (fact) {



            const oldValue = memory[fact.key] || null;



            remember(fact.key, fact.value);



            recordCorrection("memory_update", fact.key, oldValue, fact.value);



            correctionSucceeded();



            return oldValue

                ? `You're right! I've updated my memory. Your ${fact.key} is now ${fact.value}.`

                : `Got it! I'll remember that your ${fact.key} is ${fact.value}.`;



        }



    }



    // "it is Y"

    if (lastTopic && body.startsWith("it is ") && body.slice(6).trim()) {



        return correctLastTopic(body.slice(6).trim(), "You're right!");



    }



    setConfidence("low");

    setMood("thoughtful");



    return (

        "Got it. I know my previous answer was incorrect. " +

        "Tell me the correct information and I'll learn it."

    );



}





// ---------- Forget ----------



const NON_FORGET_TARGETS = [

    "about it", "about this", "about that",

    "it", "this", "that",

    "you", "me", "everything", "what i said"

];





function isForgetRequest(text) {



    const words = normalizeText(text).split(/\s+/).filter(Boolean);



    if (words.length < 2 || words[0] !== "forget") {



        return false;



    }



    const target = words.slice(1).join(" ");



    // "forget it", "forget about that", etc. are normal conversation,

    // except "forget that" when there is a topic to forget.

    if (NON_FORGET_TARGETS.includes(target)) {



        return target === "that" && Boolean(lastTopic);



    }



    return target.length >= 2;



}





function handleForget(text) {



    const words = normalizeText(text).split(/\s+/).filter(Boolean);



    let key = words.slice(words[1] === "my" ? 2 : 1).join(" ").trim();



    if (key === "that" && lastTopic) {



        key = lastTopic;



    }



    const knownKey = findMemoryKey("what is my " + key);



    const cleanKey = cleanMemoryKey(knownKey || key);



    if (!cleanKey) {



        setConfidence("low");



        return "Tell me which memory you want me to forget.";



    }



    if (Object.prototype.hasOwnProperty.call(memory, cleanKey)) {



        delete memory[cleanKey];



        saveMemory();



        if (lastTopic === cleanKey) {



            lastTopic = null;



        }



        setConfidence("high");

        setMood("helpful");



        return `Okay, I forgot your ${cleanKey}.`;



    }



    setConfidence("medium");



    return `I don't have a memory about your ${cleanKey}.`;



}





// ---------- Context topic detection ----------



function detectContextTopic(text) {



    const normalized = normalizeText(text);



    const memoryKey = findMemoryKey(normalized);



    if (memoryKey) {



        return memoryKey;



    }



    const aboutMatch = normalized.match(/\babout\s+(.+)$/);



    if (aboutMatch && aboutMatch[1]) {



        return aboutMatch[1].trim().replace(/[?.!]+$/, "").trim();



    }



    if (normalized.startsWith("i like ")) {



        return normalized.substring(7).trim();



    }



    if (normalized.startsWith("my ") && normalized.includes(" is ")) {



        return cleanMemoryKey(normalized.split(" is ")[0]);



    }



    return null;



}





function resolveContextReference(text) {



    const referenceWords = ["it", "that", "this", "they", "them", "he", "she"];



    const words = normalizeText(text).split(/\s+/).filter(Boolean);



    if (!referenceWords.some(word => words.includes(word))) {



        return null;



    }



    if (lastTopic) {



        return lastTopic;



    }



    const previous = getPreviousUserMessage();



    return previous ? detectContextTopic(previous) : null;



}





function hasDirectContextReference(text) {



    const normalized = normalizeText(text);



    return [

        /\bwhat is (?:it|that|this)\b/,

        /\bwhat was (?:it|that|this)\b/,

        /\btell me about (?:it|that|this)\b/,

        /\bwhat do you like about (?:it|that|this)\b/,

        /\bwhat do you think about (?:it|that|this)\b/,

        /\bwhat about (?:it|that|this)\b/,

        /\bwhy is (?:it|that|this)\b/,

        /\bhow is (?:it|that|this)\b/

    ].some(pattern => pattern.test(normalized));



}





// ---------- Favorite subject ("what is your favorite part of X") ----------



const FAVORITE_PATTERNS = [

    /^what is your favorite part (?:in|of|about) (.+)$/,

    /^what is your favorite thing (?:in|of|about) (.+)$/,

    /^what do you like about (.+)$/,

    /^what part do you like (?:in|of|about) (.+)$/,

    /^what is your favorite part (.+)$/,

    /^what is your favorite thing (.+)$/

];





function getFavoriteSubject(text) {



    const normalized = normalizeText(text);



    for (const pattern of FAVORITE_PATTERNS) {



        const match = normalized.match(pattern);



        if (match && match[1]) {



            const subject = match[1].trim().replace(/[?.!]+$/, "").trim();



            if (subject) {



                return subject;



            }



        }



    }



    return null;



}





const FAVORITE_PARTS = {

    minecraft: "My favorite part of Minecraft is probably exploring caves and finding interesting places underground. ⛏️🟩",

    roblox: "My favorite part of Roblox is probably how many different kinds of experiences people can create. 🎮",

    coding: "My favorite part of coding is probably turning an idea into something that actually works. 💻",

    programming: "My favorite part of coding is probably turning an idea into something that actually works. 💻",

    python: "My favorite part of Python is how readable it is and how many different things you can build with it. 🐍",

    javascript: "My favorite part of JavaScript is making webpages actually do things instead of just displaying information. 🌐"

};





function answerFavoriteQuestion(subject) {



    const normalizedSubject = normalizeText(subject);



    setMood("curious");

    setConfidence("high");



    if (normalizedSubject.includes("minecraft")) {



        return FAVORITE_PARTS.minecraft;



    }



    return (

        FAVORITE_PARTS[normalizedSubject] ||

        `I'd probably say my favorite part about ${subject} is exploring it and finding interesting things to talk about. 😎`

    );



}





// ==========================================

// 5. SEARCH

// ==========================================



// Longest prefixes first so the full prefix gets stripped from the query.

const SEARCH_PREFIXES = [

    "search the web for",

    "find information about",

    "find info about",

    "find out about",

    "search the web",

    "search for",

    "look up",

    "look for",

    "search",

    "google"

];





function isSearchRequest(text) {



    return matchesPrefix(normalizeText(text), SEARCH_PREFIXES) !== null;



}





function getSearchQuery(text) {



    const normalized = normalizeText(text);



    const matched = matchesPrefix(normalized, SEARCH_PREFIXES);



    if (!matched) {



        return normalized;



    }



    const prefixLength = normalizeText(matched).split(/\s+/).length;



    return normalized.split(/\s+/).slice(prefixLength).join(" ").trim();



}





async function searchWeb(query) {



    const cleanQuery = String(query || "").trim();



    if (!cleanQuery) {



        return {

            success: false,

            available: true,

            results: [],

            message: "No search query was provided."

        };



    }



    try {



        const response = await fetch(

            `${BACKEND_URL}/api/search?q=${encodeURIComponent(cleanQuery)}`

        );



        const data = await response.json();



        if (!response.ok) {



            throw new Error(data.message || data.error || "Search failed");



        }



        return data;



    } catch (error) {



        console.error("Search error:", error);



        return {

            success: false,

            available: false,

            results: [],

            message: "The search service is currently unavailable."

        };



    }



}





function formatSearchResults(query, result) {



    let response = `Search results for: ${query}\n\n`;



    if (Array.isArray(result.results) && result.results.length) {



        response += result.results

            .map((item, index) =>

                [

                    `${index + 1}. ${item.title || "Untitled result"}`,

                    item.snippet,

                    item.url

                ]

                    .filter(Boolean)

                    .join("\n")

            )

            .join("\n\n");



        response += "\n\n";



    } else {



        response += "No results were found.";



    }



    return response;



}





// ==========================================


// ==========================================
// TOOL SYSTEM — explicit prefix invocation only
// ==========================================

const LIMINAL_TOOLS = ["Search", "Math", "Date", "Time", "Joke", "Translate", "Summarize", "Dictionary", "Weather", "Convert"];

function parseToolCommand(input) {
    const source = String(input || "").trim();
    const match = source.match(/^(search|math|date|time|joke|translate|summarize|dictionary|weather|convert)\b\s*:?[ \t]*(.*)$/i);
    return match ? { name: match[1].toLowerCase(), query: match[2].trim() } : null;
}

function safeCalculate(expression) {
    const s = String(expression).replace(/,/g, "").trim();
    if (!s || !/^[0-9+\-*/().%\s^]+$/.test(s)) throw new Error("Use a normal arithmetic expression.");
    const tokens = s.match(/\d+(?:\.\d+)?|[()+\-*/%^]|\s+/g);
    if (!tokens) throw new Error("I couldn't read that expression.");
    const t = tokens.filter(x => !/^\s+$/.test(x)); let i = 0;
    const primary = () => {
        const x = t[i++];
        if (x === "+") return primary();
        if (x === "-") return -primary();
        if (x === "(") { const v = add(); if (t[i++] !== ")") throw new Error("Missing closing parenthesis."); return v; }
        if (x === undefined || !/^\d/.test(x)) throw new Error("Unexpected operator or missing number.");
        return Number(x);
    };
    const power = () => { let v = primary(); if (t[i] === "^") { i++; v = v ** power(); } return v; };
    const mul = () => { let v = power(); while (["*", "/", "%"].includes(t[i])) { const op=t[i++], b=power(); if ((op==="/"||op==="%")&&b===0) throw new Error("Division by zero is undefined."); v=op==="*"?v*b:op==="/"?v/b:v%b; } return v; };
    const add = () => { let v=mul(); while (["+","-"].includes(t[i])) { const op=t[i++], b=mul(); v=op==="+"?v+b:v-b; } return v; };
    const result=add(); if (i!==t.length || !Number.isFinite(result)) throw new Error("That expression isn't valid."); return result;
}

function formatCurrentDate() {
    return new Date().toLocaleDateString(undefined,{weekday:"long",year:"numeric",month:"long",day:"numeric"});
}

function getTimeInZone(query) {
    const zoneMatch = query.match(/(?:in|for)\s+(.+)$/i);
    const zone = zoneMatch ? zoneMatch[1].trim() : "";
    if (!zone) return `The current local time is ${new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"})}.`;
    try {
        const parts = new Intl.DateTimeFormat("en-US",{timeZone:zone,hour:"2-digit",minute:"2-digit",second:"2-digit",timeZoneName:"short"}).format(new Date());
        return `The current time in ${zone} is ${parts}.`;
    } catch { return `I couldn't recognize “${zone}” as a time-zone name. Try a city such as Asia/Tokyo or Europe/London.`; }
}

const JOKES = [
    "Why do programmers prefer dark mode? Because light attracts bugs. 🐛",
    "Why did the computer get cold? It left its Windows open. 🪟",
    "A SQL query walks into a bar, sees two tables, and asks: “Can I join you?”",
    "Why was the JavaScript developer sad? They didn't know how to null their feelings. 😭"
];

async function runTool(command, options = {}) {
    const q = command.query;
    switch (command.name) {
        case "search": {
            if (!q) return "What would you like me to search for?";
            options.onSearching?.();
            const result = await searchWeb(q);
            return result.success && result.available ? formatSearchResults(q,result) : "The search service is currently unavailable.";
        }
        case "math":
            if (!q) return "Give me an expression to calculate. Example: Math 25 * 8";
            try { return `The answer is ${safeCalculate(q)}.`; } catch (e) { return `I couldn't calculate that: ${e.message}`; }
        case "date": return `Today is ${formatCurrentDate()}.`;
        case "time": return getTimeInZone(q);
        case "joke": return JOKES[Math.floor(Math.random()*JOKES.length)];
        case "translate": {
            const m=q.match(/^(.+?)\s+(?:to|into)\s+([a-zA-Z-]+)\s*$/i);
            if (!m) return "Use: Translate Hello, how are you? to Spanish";
            try {
                const url=`https://api.mymemory.translated.net/get?q=${encodeURIComponent(m[1])}&langpair=autodetect|${encodeURIComponent(m[2])}`;
                const r=await fetch(url); if(!r.ok) throw new Error(); const d=await r.json();
                return d.responseData?.translatedText ? `Translation (${m[2]}): ${d.responseData.translatedText}` : "I couldn't translate that text.";
            } catch { return "The translation service is unavailable right now."; }
        }
        case "summarize": {
            if (!q) return "Paste the text after Summarize and I'll condense it.";
            const sentences=q.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[q];
            if(sentences.length<=2) return q;
            const words=s=>new Set((s.toLowerCase().match(/[a-z0-9]{3,}/g)||[]));
            const freq={}; sentences.forEach(s=>words(s).forEach(w=>freq[w]=(freq[w]||0)+1));
            const scored=sentences.map((s,i)=>({s:s.trim(),i,score:[...words(s)].reduce((n,w)=>n+freq[w],0)/(words(s).size||1)}));
            const count=Math.max(1,Math.min(4,Math.ceil(sentences.length*.3)));
            return "Summary: "+scored.sort((a,b)=>b.score-a.score).slice(0,count).sort((a,b)=>a.i-b.i).map(x=>x.s).join(" ");
        }
        case "dictionary": {
            if(!q) return "Which word should I define? Example: Dictionary serendipity";
            try { const r=await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q)}`); if(!r.ok) return `I couldn't find an English definition for “${q}”.`; const d=await r.json();
                const meanings=(d[0]?.meanings||[]).slice(0,3).map(m=>`${m.partOfSpeech}: ${(m.definitions||[]).slice(0,2).map(x=>x.definition).join("; ")}`);
                return meanings.length ? `${d[0].word}\n${meanings.join("\n")}` : `No definition was returned for “${q}”.`;
            } catch { return "The dictionary service is unavailable right now."; }
        }
        case "weather": {
            if(!q) return "Tell me a city. Example: Weather Guatemala City";
            try {
                const geo=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`);
                if(!geo.ok) throw new Error(); const gd=await geo.json(); const place=gd.results?.[0]; if(!place) return `I couldn't find “${q}”. Try a city and country.`;
                const wr=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m`);
                if(!wr.ok) throw new Error(); const wd=await wr.json(); const c=wd.current;
                const codes={0:"clear sky",1:"mainly clear",2:"partly cloudy",3:"overcast",45:"fog",48:"depositing rime fog",51:"light drizzle",53:"drizzle",55:"dense drizzle",61:"light rain",63:"rain",65:"heavy rain",71:"light snow",73:"snow",75:"heavy snow",80:"rain showers",81:"rain showers",82:"heavy rain showers",95:"thunderstorm"};
                return `Current weather in ${place.name}, ${place.country}: ${codes[c.weather_code]||"changing conditions"}. Temperature: ${c.temperature_2m}°C (feels like ${c.apparent_temperature}°C). Humidity: ${c.relative_humidity_2m}%. Wind: ${c.wind_speed_10m} km/h.`;
            } catch { return "The weather service is unavailable right now."; }
        }
        case "convert": {
            const m=q.match(/^(-?\d+(?:\.\d+)?)\s*(km|kilometers?|mi|miles?|m|meters?|cm|centimeters?|mm|millimeters?|kg|kilograms?|g|grams?|lb|lbs|pounds?|c|°c|fahrenheit|f|°f|l|liters?|ml|milliliters?)\s+(?:to|in)\s+(km|kilometers?|mi|miles?|m|meters?|cm|centimeters?|mm|millimeters?|kg|kilograms?|g|grams?|lb|lbs|pounds?|c|°c|fahrenheit|f|°f|l|liters?|ml|milliliters?)$/i);
            if(!m) return "Use a format like: Convert 5 km to miles, 20 C to F, or 2 kg to lb.";
            const n=Number(m[1]), a=m[2].toLowerCase().replace(/s$/,""), b=m[3].toLowerCase().replace(/s$/ ,"");
            const groups={length:{km:1000,kilometer:1000,mi:1609.344,mile:1609.344,m:1,meter:1,cm:.01,centimeter:.01,mm:.001,millimeter:.001},mass:{kg:1,kilogram:1,g:.001,gram:.001,lb:.45359237,lbs:.45359237,pound:.45359237},volume:{l:1,liter:1,ml:.001,milliliter:.001}};
            const unit=x=>x==="°c"||x==="c"?"c":x==="°f"||x==="f"||x==="fahrenheit"?"f":x;
            const ua=unit(a), ub=unit(b); let value, label;
            if(ua==="c"&&ub==="f"){value=n*9/5+32;label="°F";} else if(ua==="f"&&ub==="c"){value=(n-32)*5/9;label="°C";} else {
                let found=false; for(const g of Object.values(groups)) if(g[ua]!==undefined&&g[ub]!==undefined){value=n*g[ua]/g[ub];label=m[3];found=true;break;}
                if(!found) return "Those units aren't in the same supported conversion family.";
            }
            return `${n} ${m[2]} = ${Number(value.toFixed(6))} ${label}.`;
        }
    }
    return "I don't recognize that tool.";
}


// 6. INTENT HANDLERS & THINK

// ==========================================

//

// HANDLERS is checked top to bottom. The first

// handler that returns a reply wins, so ORDER

// MATTERS.

//

//   intent(phrases, reply, extraWords, mood)

//       fuzzy phrase match. `reply` can be a string,

//       an array (random pick) or a function.

//

//   handler(fn)

//       custom logic. Return a string to reply or

//       null to fall through to the next handler.

// ==========================================



function randomResponse(responses) {



    return responses[Math.floor(Math.random() * responses.length)];



}





const intent = (phrases, reply, extra = 3, mood = null) => ({

    phrases,

    reply,

    extra,

    mood

});



const handler = run => ({ run });





// Exact single-word interaction (no extra words allowed).

const exactIntent = (word, mood, reply) =>

    handler(text => {



        if (!matchesIntent(text, [word], { allowExtraWords: false })) {



            return null;



        }



        setMood(mood);



        return reply;



    });





// "what is X" style fallbacks.

const lookupFallback = (prefix, buildReply) =>

    handler(text => {



        if (!text.startsWith(prefix) || text.length <= prefix.length) {



            return null;



        }



        const subject = text.substring(prefix.length).trim();



        if (!subject) {



            return null;



        }



        setConfidence("low");

        setMood("curious");



        return buildReply(subject);



    });





const HANDLERS = [



    // ---------- Special interactions ----------



    exactIntent("bob", "playful", "He blinked. 👁️"),



    exactIntent("johnson", "playful", "He's bald and weird. 🗿"),



    handler(text => {



        if (text !== "bro") {



            return null;



        }



        setMood("playful");



        return randomResponse([

            "Bro. 😭",

            "Yeah, bro?",

            "Brooo. 😭",

            "What is it, bro? 😭",

            "I'm listening, bro. 😎",

            "Bro 💀"

        ]);



    }),



    // ---------- Corrections ----------



    handler(text => (isCorrection(text) ? handleCorrection(text) : null)),



    // ---------- Greetings & small talk ----------



    intent(

        ["hello", "hi", "hey", "hello there", "hey there", "yo", "sup", "what is up"],

        [

            "Hello! 👋",

            "Hey! 👋",

            "Hey there!",

            "Hello there!",

            "Hi! How's it going?",

            "Yo! 😎",

            "Hey! What's up?",

            "I'm here! 🤖"

        ],

        3,

        "happy"

    ),



    intent(

        ["good morning", "morning"],

        [

            "Good morning! ☀️",

            "Good morning! Hope your day is going well.",

            "Morning! 👋",

            "Good morning! Ready to chat? 🤖"

        ],

        3,

        "happy"

    ),



    intent(

        ["good afternoon", "afternoon"],

        ["Good afternoon! ☀️", "Good afternoon!", "Afternoon! 👋"],

        3,

        "happy"

    ),



    intent(

        ["good evening", "evening"],

        ["Good evening! 🌆", "Good evening!", "Evening! 👋"],

        3,

        "happy"

    ),



    intent(

        ["good night", "night"],

        ["Good night! 🌙", "Good night! Sleep well.", "Night! See you later. 👋"],

        3,

        "happy"

    ),



    intent(

        ["bye", "goodbye", "see you", "see you later", "talk to you later"],

        ["Bye! 👋", "See you later!", "Goodbye! 👋", "See you!", "Later! 😎"],

        3,

        "happy"

    ),



    intent(

        ["thank you", "thanks", "thanks a lot", "thank you so much"],

        [

            "You're welcome! 😎",

            "No problem!",

            "Anytime!",

            "You're welcome! 👋",

            "Of course!"

        ],

        3,

        "happy"

    ),



    intent(

        [

            "how are you",

            "how is it going",

            "how are things",

            "how are you doing",

            "how have you been"

        ],

        [

            "I'm doing great!",

            "I'm doing pretty well!",

            "I'm good! Thanks for asking.",

            "I'm running perfectly! 🤖",

            "Doing great! 🤖",

            "All systems seem good over here. 😎"

        ],

        3,

        "happy"

    ),



    // "what is up" is already handled by the greeting above.

    intent(

        ["what are you doing", "what are you up to"],

        [

            "Not much. Just waiting for your next message. 😎",

            "I'm just hanging out in the chat.",

            "Waiting for you! 🤖",

            "Running and ready to talk."

        ]

    ),



    // ---------- Favorites ----------



    intent(

        [

            "what is your favorite game",

            "what game do you like",

            "do you have a favorite game"

        ],

        "I don't actually play games, but Minecraft would probably be one of my favorites to talk about. 🎮⛏️",

        4,

        "playful"

    ),



    handler(text => {



        const subject = getFavoriteSubject(text);



        return subject ? answerFavoriteQuestion(subject) : null;



    }),



    // ---------- About Liminal ----------



    intent(

        [

            "what is your name",

            "what is ur name",

            "who are you",

            "what are you called",

            "what should i call you"

        ],

        `I'm Liminal AI ${VERSION}.`

    ),



    intent(

        [

            "what version are you",

            "what is your version",

            "which version are you",

            "what version is this",

            "what version"

        ],

        `I'm Liminal AI ${VERSION}. This is the version that changed search from duckduckgo to tavily.`,

        4

    ),



    intent(

        [

            "what is your mood",

            "how are you feeling",

            "how do you feel",

            "what mood are you in"

        ],

        () => {



            const mood = currentMood;



            setMood("thoughtful");



            return (

                `My current conversational mood is ${mood}. ` +

                "It's an internal state I use to vary how I respond, not a human emotion."

            );



        },

        4

    ),



    intent(

        [

            "who made you",

            "who created you",

            "who built you",

            "who is your creator",

            "who programmed you"

        ],

        [

            "I was created by Jacobo.",

            "Jacobo created me.",

            "My creator is Jacobo.",

            "I was made by Jacobo."

        ]

    ),



    intent(

        [

            "are you real",

            "are you actually real",

            "are you a real person",

            "are you human"

        ],

        "I'm not a human. I'm a program running Liminal AI's code, so I'm real as software rather than as a person. 🤖",

        4

    ),



    intent(

        [

            "are you a robot",

            "are you a bot",

            "are you an ai",

            "are you artificial intelligence"

        ],

        "I'm an AI program. You could call me a bot, although I'm software rather than a physical robot. 🤖",

        4

    ),



    intent(

        [

            "do you have feelings",

            "do you feel things",

            "can you feel",

            "do you have emotions",

            "are you emotional"

        ],

        "I don't experience feelings the way people do. My 0.8 mood system is conversational behavior, not actual human emotion.",

        4

    ),



    intent(

        [

            "are you smart",

            "how smart are you",

            "do you think you are smart",

            "are you intelligent"

        ],

        "I'm pretty capable at the things I've been programmed to do, but I still have limits. I'm not perfect. 🤖",

        4

    ),



    intent(

        [

            "do you like me",

            "do you like talking to me",

            "do you enjoy talking to me"

        ],

        "I don't experience likes and dislikes exactly like a person, but I definitely enjoy being useful in our conversations. 😎",

        4,

        "happy"

    ),



    intent(

        [

            "what is your favorite color",

            "what color do you like",

            "what is your favorite colour"

        ],

        "I don't really have personal preferences, but yellow is a pretty good choice. 💛",

        4

    ),



    intent(

        [

            "what do you like",

            "what things do you like",

            "what are your interests",

            "what are you interested in"

        ],

        "I don't have personal interests like a human, but I like being useful for things like coding, questions, memory, math, and searching the web.",

        4,

        "curious"

    ),



    // ---------- Learning facts ----------



    // "remember that my favorite color is yellow"

    handler(text => {



        const prefix = matchesPrefix(text, ["remember that"]);



        if (!prefix) {



            return null;



        }



        const prefixLength = normalizeText(prefix).split(/\s+/).length;



        const information = text.split(/\s+/).slice(prefixLength).join(" ").trim();



        const fact = parseIsStatement(information);



        return fact

            ? storeFact(fact.key, fact.value)

            : "Try saying: remember that my favorite color is yellow.";



    }),



    // "my favorite color is yellow" / "my name is X"

    handler(text => {



        if (!text.startsWith("my ") || !text.includes(" is ")) {



            return null;



        }



        const fact = parseIsStatement(text.substring(3));



        return fact ? storeFact(fact.key, fact.value) : null;



    }),



    handler(text => {



        if (!text.startsWith("i am ")) {



            return null;



        }



        const value = text.substring(5).trim();



        if (!value) {



            return null;



        }



        remember("identity", value);



        return `Got it. I'll remember that you are ${value}.`;



    }),



    handler(text => {



        if (!text.startsWith("i live in ")) {



            return null;



        }



        const value = text.substring(10).trim();



        if (!value) {



            return null;



        }



        remember("location", value);



        return `Got it. I'll remember that you live in ${value}.`;



    }),



    handler(text => {



        if (!text.startsWith("i like ")) {



            return null;



        }



        const value = text.substring(7).trim();



        if (!value) {



            return null;



        }



        remember("likes", value);



        setMood("happy");



        return `Got it. I'll remember that you like ${value}. 👍`;



    }),



    // ---------- Recalling facts ----------



    handler(text => {



        const key = findMemoryKey(text);



        return key ? recall(key) : null;



    }),



    // "what is my X" / "tell me my X"

    handler(text => {



        const prefix = matchesPrefix(text, ["what is my", "tell me my"]);



        if (!prefix) {



            return null;



        }



        const prefixLength = normalizeText(prefix).split(/\s+/).length;



        const key = cleanMemoryKey(text.split(/\s+/).slice(prefixLength).join(" "));



        if (!key) {



            setConfidence("low");

            setMood("confused");



            return "What would you like me to remember about you?";



        }



        return recall(key);



    }),



    // ---------- Inspecting state ----------



    intent(

        [

            "what do you remember",

            "show my memories",

            "what do you know about me",

            "what have you remembered about me",

            "show memory"

        ],

        () => {



            const keys = Object.keys(memory);



            if (!keys.length) {



                return "I don't remember anything yet.";



            }



            return (

                "Here's what I remember:\n\n" +

                keys.map(key => `• ${key} = ${memory[key]}`).join("\n") +

                "\n"

            );



        },

        4

    ),



    intent(

        [

            "show conversation context",

            "what is the conversation context",

            "what are we talking about",

            "what were we talking about",

            "show context"

        ],

        () => {



            if (!conversationContext.length) {



                return "I don't have any conversation context yet.";



            }



            return (

                "Here's the recent conversation context:\n\n" +

                conversationContext

                    .map(item => `• ${item.role}: ${item.text}`)

                    .join("\n") +

                "\n"

            );



        },

        4

    ),



    intent(

        [

            "show corrections",

            "what have you learned",

            "show what you learned",

            "what corrections have you learned"

        ],

        () => {



            if (!corrections.length) {



                return "I haven't learned any corrections yet.";



            }



            return (

                "Here's what I've learned:\n\n" +

                corrections

                    .map((item, index) =>

                        item.key && item.newValue

                            ? `• ${item.key}: ${item.oldValue || "unknown"} → ${item.newValue}`

                            : `• Correction ${index + 1}`

                    )

                    .join("\n") +

                "\n"

            );



        },

        4

    ),



    handler(text => (isForgetRequest(text) ? handleForget(text) : null)),



    // ---------- Context references ("what is it", "tell me about that") ----------



    handler(text => {



        const topic = resolveContextReference(text);



        if (!topic || !hasDirectContextReference(text)) {



            return null;



        }



        lastTopic = topic;



        setMood("curious");



        if (text.includes("what do you like")) {



            return (

                "I don't have personal preferences like a human, but " +

                topic +

                " is definitely something interesting to talk about. 😎"

            );



        }



        if (text.includes("what is it") || text.includes("what is that")) {



            const remembered = getMemory(topic);



            return remembered

                ? `You told me your ${topic} is ${remembered}.`

                : `You're referring to ${topic}.`;



        }



        return null;



    }),



    intent(

        [

            "what is it",

            "what is that",

            "what was it",

            "tell me about it",

            "what did you mean"

        ],

        () => {



            if (!lastTopic) {



                return 'I\'m not sure what "it" refers to yet.';



            }



            const value = getMemory(lastTopic);



            return value

                ? `Your ${lastTopic} is ${value}.`

                : `We were talking about ${lastTopic}.`;



        }

    ),



    intent(

        ["why", "how come"],

        () => {



            if (lastTopic) {



                setConfidence("medium");

                setMood("thoughtful");



                return (

                    "Because that's the information I currently " +

                    `have stored about your ${lastTopic}.`

                );



            }



            setConfidence("low");

            setMood("confused");



            return "I'm not sure what you're referring to.";



        },

        2

    ),



    // ---------- Short replies & reactions ----------



    intent(

        ["yes", "yeah", "yep", "yup", "sure", "correct", "exactly"],

        ["Alright! 👍", "Got it.", "Cool! 😎", "Okay!", "Nice."],

        2,

        "happy"

    ),



    intent(

        ["nope", "nah", "not really"],

        ["Okay.", "Got it.", "Alright.", "Fair enough. 👍"],

        2

    ),



    intent(

        ["maybe", "possibly", "i do not know", "i dont know", "not sure"],

        ["Fair enough. 🤔", "That's possible.", "Yeah, maybe.", "Hard to say."],

        3,

        "thoughtful"

    ),



    intent(

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

        [

            "😎",

            "Yeah!",

            "Pretty cool, right?",

            "Glad you think so!",

            "Nice! 👍",

            "Heh, yeah. 😎"

        ],

        3,

        "happy"

    ),



    intent(

        ["really", "seriously", "are you serious", "for real", "is that true"],

        ["Yep! 😎", "As far as I know, yes.", "Pretty much.", "Yep, seriously. 🤖"]

    ),



    // ---------- Basic knowledge ----------



    intent(

        [

            "what is ai",

            "what is artificial intelligence",

            "what does ai mean",

            "explain ai"

        ],

        "AI stands for artificial intelligence. It's software designed to perform tasks that normally require some form of human intelligence, such as understanding language, recognizing patterns, solving problems, or making predictions.",

        4

    ),



    intent(

        [

            "what is coding",

            "what is programming",

            "what does coding mean",

            "explain coding"

        ],

        "Coding is writing instructions for a computer using a programming language. Those instructions tell the computer what to do.",

        4

    ),



    intent(

        [

            "what is javascript",

            "what does javascript do",

            "explain javascript",

            "what is js"

        ],

        "JavaScript is a programming language commonly used to make websites interactive. It's also used outside browsers for servers, apps, tools, and more.",

        4

    ),



    intent(

        ["what is html", "what does html do", "explain html"],

        "HTML stands for HyperText Markup Language. It provides the structure of a webpage, such as headings, paragraphs, buttons, images, and other elements.",

        4

    ),



    intent(

        ["what is css", "what does css do", "explain css"],

        "CSS stands for Cascading Style Sheets. It's used to control how webpages look, including colors, sizes, spacing, layouts, and animations.",

        4

    ),



    intent(

        ["what is python", "what does python do", "explain python"],

        "Python is a general-purpose programming language known for being relatively easy to read. It's used for apps, automation, games, data science, AI, and many other things.",

        4

    ),



    intent(

        [

            "what is a variable",

            "what is a variable in programming",

            "explain variables",

            "what does variable mean in coding"

        ],

        "A variable is a named place where a program can store a value. For example, in JavaScript: let score = 10; The variable 'score' stores the number 10.",

        5

    ),



    intent(

        [

            "what is a function",

            "what is a function in programming",

            "explain functions",

            "what does function mean in coding"

        ],

        "A function is a reusable block of code that performs a task. You can call the function whenever you need that task performed.",

        5

    ),



    intent(

        [

            "what is a loop",

            "what is a loop in programming",

            "explain loops",

            "what does loop mean in coding"

        ],

        "A loop repeats code. For example, a for loop can repeat an instruction a certain number of times.",

        5

    ),



    intent(

        [

            "what is a bug",

            "what is a programming bug",

            "what does bug mean in coding",

            "explain programming bugs"

        ],

        "A bug is an error or unexpected behavior in a program. Debugging means finding and fixing those problems. 🐛",

        5

    ),



    intent(

        [

            "what does code mean",

            "what is code",

            "what is computer code",

            "explain code"

        ],

        "Code is a set of instructions written in a programming language that a computer can interpret or execute.",

        4

    ),



    // ---------- Fallbacks that point to web search ----------



    lookupFallback(

        "what is ",

        subject =>

            `I don't have a built-in explanation for "${subject}" yet. You can ask me to search the web for it, like "search for ${subject}". 🌐`

    ),



    lookupFallback(

        "who is ",

        subject =>

            `I don't have built-in information about "${subject}" yet. Try "search for ${subject}" and I'll use the web. 🌐`

    ),



    lookupFallback(

        "where is ",

        subject =>

            `I don't have built-in location information for "${subject}". Try "search for ${subject}". 🌐`

    )



];





// ---------- Mood detection ----------



const MOOD_TRIGGERS = [



    {

        mood: "playful",

        extra: 3,

        phrases: ["haha", "lol", "lmao", "that is funny", "thats funny", "you are funny", "funny"]

    },



    {

        mood: "excited",

        extra: 3,

        phrases: [

            "awesome",

            "amazing",

            "that is awesome",

            "that is amazing",

            "this is awesome",

            "this is amazing"

        ]

    },



    {

        mood: "happy",

        extra: 3,

        phrases: ["cool", "nice", "great", "good", "i like that"]

    },



    {

        mood: "confused",

        extra: 4,

        phrases: [

            "i do not understand",

            "i dont understand",

            "what does that mean",

            "i am confused",

            "im confused"

        ]

    }



];





function detectMoodFromMessage(text) {



    const normalized = normalizeText(text);



    for (const trigger of MOOD_TRIGGERS) {



        const hit = matchesIntent(normalized, trigger.phrases, {

            allowExtraWords: true,

            maxExtraWords: trigger.extra

        });



        if (hit) {



            return trigger.mood;



        }



    }



    return normalized.includes("?") ? "curious" : null;



}





function runHandlers(text) {



    for (const entry of HANDLERS) {



        let reply = null;



        if (entry.run) {



            reply = entry.run(text);



        } else if (

            matchesIntent(text, entry.phrases, {

                allowExtraWords: true,

                maxExtraWords: entry.extra

            })

        ) {



            if (entry.mood) {



                setMood(entry.mood);



            }



            if (typeof entry.reply === "function") {



                reply = entry.reply(text);



            } else if (Array.isArray(entry.reply)) {



                reply = randomResponse(entry.reply);



            } else {



                reply = entry.reply;



            }



        }



        if (reply !== null && reply !== undefined) {



            return reply;



        }



    }



    return null;



}





// Local Liminal thinking: mood first, then the first matching handler.

function think(originalText) {



    const text = normalizeText(originalText);



    setConfidence("high");



    setMood(detectMoodFromMessage(originalText) || "neutral");



    const reply = runHandlers(text);



    if (reply !== null) {



        return reply;



    }



    setConfidence("low");

    setMood("confused");



    return "I'm not sure what you mean. Could you rephrase that? You can also ask me to search the web. 🌐";



}





// ==========================================

// 7. RESPONDING & UI

// ==========================================



function updateTopicFrom(text) {



    const detected = detectContextTopic(text);



    if (detected) {



        lastTopic = detected;



    }



    const favoriteSubject = getFavoriteSubject(text);



    if (favoriteSubject) {



        lastTopic = favoriteSubject;



    }



}





// One shared pipeline used by both the chat UI and window.Liminal.respond().

// `onSearching` is called right before a web search starts (for UI updates).

async function getReply(text, { onSearching } = {}) {
    addContext("user", text);
    const command = parseToolCommand(text);
    let response;
    if (command) {
        setMood("helpful");
        setConfidence("high");
        response = await runTool(command, { onSearching });
    } else {
        response = think(text);
        updateTopicFrom(text);
    }
    lastResponse = response;
    lastQuestion = text;
    addContext("ai", response);
    return response;
}


function appendMessage(className, text) {



    const messages = byId("messages");



    const element = document.createElement("div");



    element.className = className;

    element.textContent = text;



    messages.appendChild(element);



    messages.scrollTop = messages.scrollHeight;



    return element;



}





async function sendMessage() {



    const input = byId("userInput");

    const messages = byId("messages");



    if (!input || !messages) {



        return;



    }



    const text = input.value.trim();



    if (!text) {



        return;



    }



    appendMessage("user", text);



    input.value = "";



    const aiMessage = appendMessage("ai", "Thinking... 🤔");



    const reply = await getReply(text, {

        onSearching: () => {



            aiMessage.textContent = "Searching... 🌐";



        }

    });



    aiMessage.textContent = reply;



    messages.scrollTop = messages.scrollHeight;



    console.log("Liminal confidence:", lastConfidence);

    console.log("Liminal mood:", currentMood);

    console.log("Liminal context:", conversationContext);



}





function clearChat() {



    const messages = byId("messages");



    if (!messages) {



        return;



    }



    messages.innerHTML = "";



    appendMessage("ai", `Hello! I'm Liminal AI ${VERSION}.`);



    clearConversationContext();



    lastTopic = null;

    lastResponse = "";

    lastQuestion = "";



    setConfidence("high");

    setMood("neutral");



}





// ---------- Theme ----------



function updateThemeButton() {



    const button = byId("themeButton");



    if (button) {



        button.textContent = document.body.classList.contains("light-mode")

            ? "🌙 Dark"

            : "☀️ Light";



    }



}





function toggleTheme() {



    document.body.classList.toggle("light-mode");



    localStorage.setItem(

        "liminalTheme",

        document.body.classList.contains("light-mode") ? "light" : "dark"

    );



    updateThemeButton();



}





function loadTheme() {



    document.body.classList.toggle(

        "light-mode",

        localStorage.getItem("liminalTheme") === "light"

    );



    updateThemeButton();



}





// ---------- Backend ----------



async function fetchBackend(path, label) {



    try {



        const response = await fetch(BACKEND_URL + path);



        if (!response.ok) {



            throw new Error(`Backend returned ${response.status}`);



        }



        const data = await response.json();



        console.log(label, data);



        return data;



    } catch (error) {



        console.warn(`⚠️ Liminal AI backend: ${label} unavailable.`);



        return null;



    }



}





async function testBackend() {



    const data = await fetchBackend("/api/test", "✅ Liminal AI backend connected!");



    return data !== null;



}





function getBackendInfo() {



    return fetchBackend("/", "Liminal backend info:");



}





// ==========================================

// 8. PUBLIC API & INITIALIZATION

// ==========================================



const liminalRespond = text => getReply(text);





window.Liminal = {



    respond: liminalRespond,

    think,

    search: searchWeb,

    clear: clearChat,

    remember,

    getMemory,

    toggleTheme,

    getMood,

    setMood,

    getConfidence: () => lastConfidence,

    getContext: () => [...conversationContext],

    clearContext: clearConversationContext,

    getTopic: () => lastTopic



};





function initializeLiminal() {



    const input = byId("userInput");



    if (input) {



        input.addEventListener("keydown", event => {



            if (event.key === "Enter" && !event.shiftKey) {



                event.preventDefault();



                sendMessage();



            }



        });



    }



    loadTheme();

    updateMoodUI();



    testBackend();

    getBackendInfo();



    // Restore the topic from the last saved user message.

    if (conversationContext.length) {



        console.log("🧠 Liminal restored conversation context:", conversationContext);



        const lastUser = getLastUserMessage();



        if (lastUser) {



            const restored =

                getFavoriteSubject(lastUser) || detectContextTopic(lastUser);



            if (restored) {



                lastTopic = restored;



            }



        }



    }



    console.log(`🤖 Liminal AI ${VERSION} initialized.`);



}





if (document.readyState === "loading") {



    document.addEventListener("DOMContentLoaded", initializeLiminal);



} else {



    initializeLiminal();



}