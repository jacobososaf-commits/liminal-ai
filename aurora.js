// ==========================================
// AURORA AI 0.1
// aurora.js
//
// SISTER AGENT TO LIMINAL AI
// Same house, different mind.
// ==========================================
//
// NOTE ON NAMESPACING:
// liminal.js declares a lot of bare globals
// (memory, think, sendMessage, normalizeText,
// etc). If aurora.js declared the same names,
// loading both scripts on one page would break
// one or the other. So everything Aurora owns
// lives inside a single `Aurora` object.
//
// index.html's router calls:
//
//     await window.Aurora.respond(text)
//
// respond() takes the raw message text and
// returns (a Promise resolving to) the reply
// string. It does NOT touch the DOM — the
// router owns message bubbles, "Thinking...",
// and scrolling.
// ==========================================

window.Aurora = (function () {

    // ==========================================
    // BACKEND (shared, search only)
    // ==========================================

    const BACKEND_URL =
        "https://liminal-ai-backend.onrender.com";


    // ==========================================
    // MEMORY (separate storage key from Liminal)
    // ==========================================

    let memory =
        JSON.parse(
            localStorage.getItem("auroraMemory") || "{}"
        );

    function saveMemory() {
        localStorage.setItem(
            "auroraMemory",
            JSON.stringify(memory)
        );
    }


    // ==========================================
    // MOOD
    //
    // Aurora tracks a running sense of the
    // conversation's tone. Liminal has nothing
    // like this — it's Aurora-specific.
    // ==========================================

    let mood = "calm";

    const MOOD_WORDS = {
        happy: ["happy", "great", "awesome", "good", "glad", "love"],
        sad: ["sad", "down", "upset", "tired", "depressed", "bad", "lonely"],
        angry: ["angry", "mad", "furious", "annoyed", "frustrated", "hate"],
        anxious: ["worried", "nervous", "anxious", "scared", "stressed"],
        excited: ["excited", "thrilled", "pumped", "stoked"],
        confused: ["confused", "puzzled", "unsure", "lost"]
    };

    function updateMood(text) {

        const textWords = text.split(" ").filter(Boolean);

        for (const key in MOOD_WORDS) {

            const hit = MOOD_WORDS[key].some(moodWord =>
                textWords.some(tw => similarWord(tw, moodWord))
            );

            if (hit) {
                mood = key;
                return;
            }
        }
    }

    function moodAcknowledgement() {

        switch (mood) {

            case "happy":
                return "You sound like you're in a good place right now. ";

            case "sad":
                return "That sounds heavy. I'm here. ";

            case "angry":
                return "Sounds like something's really getting to you. ";

            case "anxious":
                return "That sounds stressful. Let's take it one step at a time. ";

            case "excited":
                return "You sound genuinely excited about this. ";

            case "confused":
                return "Sounds like something's unclear. Let's untangle it. ";

            default:
                return "";
        }
    }


    // ==========================================
    // CONTEXT
    // ==========================================

    let lastTopic = null;
    let lastResponse = "";
    let clarity = "clear"; // Aurora's equivalent of Liminal's "confidence"

    function setClarity(level) {
        clarity = level;
    }


    // ==========================================
    // NORMALIZATION
    //
    // Fixes common typos/slang up front (cheap,
    // exact), then fuzzy matching below catches
    // whatever this dictionary misses.
    // ==========================================

    const TYPO_REPLACEMENTS = {
        "wat": "what",
        "wut": "what",
        "whats": "what is",
        "wuts": "what is",
        "hw": "how",
        "hows": "how is",
        "yuo": "you",
        "u": "you",
        "ur": "your",
        "youre": "you are",
        "im": "i am",
        "ive": "i have",
        "dont": "do not",
        "cant": "cannot",
        "wont": "will not",
        "teh": "the",
        "helo": "hello",
        "hii": "hi",
        "heyy": "hey",
        "pls": "please",
        "plz": "please",
        "fav": "favorite",
        "favorite": "favorite",
        "favourite": "favorite",
        "favroite": "favorite",
        "favrite": "favorite",
        "colour": "color",
        "joek": "joke",
        "jok": "joke"
    };

    function normalizeText(text) {

        let normalized = String(text || "")
            .toLowerCase()
            .trim()
            .replace(/\s+/g, " ");

        const words = normalized.split(" ");

        const replaced = words.map(word => {

            const stripped = word.replace(/[?!.,]/g, "");

            if (Object.prototype.hasOwnProperty.call(TYPO_REPLACEMENTS, stripped)) {
                return TYPO_REPLACEMENTS[stripped];
            }

            return word;
        });

        return replaced.join(" ").replace(/\s+/g, " ").trim();
    }


    // ==========================================
    // FUZZY MATCHING
    //
    // Catches typos the dictionary above doesn't
    // cover — e.g. "hlelo", "jokee", "namee".
    // Word-distance based, same idea as Liminal's
    // levenshtein/similarWord.
    // ==========================================

    function levenshtein(a, b) {

        const matrix = [];

        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= b.length; i++) {

            for (let j = 1; j <= a.length; j++) {

                if (b.charAt(i - 1) === a.charAt(j - 1)) {

                    matrix[i][j] = matrix[i - 1][j - 1];

                } else {

                    matrix[i][j] = Math.min(
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

        if (!word || !target) return false;
        if (word === target) return true;

        // Words this short are too ambiguous to fuzzy-match
        // safely ("i" vs "hi" would otherwise "match").
        // Typos on short words are handled by the
        // TYPO_REPLACEMENTS dictionary instead.
        if (word.length <= 2 || target.length <= 2) return false;

        // Typos rarely change the first letter, but unrelated
        // words often share a similar shape (e.g. "bored" vs
        // "tired" are edit-distance 2 apart but mean nothing
        // alike). Requiring the first letter to match filters
        // these out while still catching real typos.
        if (word.charAt(0) !== target.charAt(0)) return false;

        const distance = levenshtein(word, target);
        const maxDistance = target.length <= 4 ? 1 : 2;

        return distance <= maxDistance;
    }

    // True if enough words in `phrase` have a close
    // match somewhere in `text` (order doesn't matter).
    function fuzzyPhraseMatch(text, phrase) {

        const textWords = text.split(" ").filter(Boolean);
        const phraseWords = phrase.split(" ").filter(Boolean);

        let matched = 0;

        for (const pw of phraseWords) {

            if (textWords.some(tw => similarWord(tw, pw))) {
                matched++;
            }
        }

        return (matched / phraseWords.length) >= 0.75;
    }

    function fuzzyMatchesAny(text, phrases) {

        return phrases.some(phrase => fuzzyPhraseMatch(text, phrase));
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

        key = cleanMemoryKey(key);

        memory[key] = value;

        lastTopic = key;

        saveMemory();
    }

    function getMemory(key) {

        return memory[cleanMemoryKey(key)];
    }


    // ==========================================
    // SHARED RESPONSE SETS
    //
    // Used by both the exact-match branches below
    // and the fuzzy fallback further down, so the
    // two can't drift out of sync. Counts kept in
    // the same rough range as Liminal's own lists
    // (not bigger) — variety, not a bigger brain.
    // ==========================================

    const GREETINGS = [
        "Hi — good to see you.",
        "Hey there. What's on your mind?",
        "Hello! Ready when you are.",
        "Hey! How's your day going?",
        "Hi there.",
        "Hey — what's up?"
    ];

    const JOKES = [
        "Why did the sun go to therapy? Too many bright ideas.",
        "I told the horizon a joke. It just kept rising to the occasion.",
        "Mornings are just nights that peer-pressured the sky into color.",
        "Why is dawn always calm? It's still half-asleep.",
        "I asked the sky for advice. It just kept clouding the issue."
    ];

    const CREATOR_RESPONSES = [
        "Jacobo built me, same as Liminal — just a different mind.",
        "I come from Jacobo, though I don't think quite like Liminal does.",
        "Jacobo's the one behind me.",
        "Same creator as Liminal: Jacobo."
    ];


    // ==========================================
    // RANDOM RESPONSE
    // ==========================================

    function randomResponse(responses) {

        return responses[
            Math.floor(Math.random() * responses.length)
        ];
    }


    // ==========================================
    // SEARCH (reuses the same backend as Liminal)
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
            "google "
        ];

        return phrases.some(phrase => text.startsWith(phrase));
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
            "google "
        ];

        for (const phrase of phrases) {

            if (text.startsWith(phrase)) {
                return text.substring(phrase.length).trim();
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

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Search failed");
            }

            return data;

        } catch (error) {

            console.error("Aurora search error:", error);

            return {
                success: false,
                available: false,
                results: [],
                message: "The search service is currently unavailable."
            };
        }
    }


    // ==========================================
    // AURORA THINKING
    //
    // Different priority order than Liminal:
    // mood-awareness runs first, and several
    // response categories (reflection, advice,
    // encouragement) don't exist in Liminal at all.
    // ==========================================

    function think(originalText) {

        const text = normalizeText(originalText);

        setClarity("clear");
        updateMood(text);

        // GREETINGS — mood-aware: if the last message
        // read as sad/anxious/angry, acknowledge that
        // before the usual greeting instead of ignoring it.
        if (["hello", "hi", "hey", "hello there", "hey there"].includes(text)) {

            if (mood !== "calm" && mood !== "happy" && mood !== "excited") {

                return (
                    moodAcknowledgement() +
                    "Hey — I'm here if you want to talk, or happy to just chat about something else."
                );
            }

            return randomResponse(GREETINGS);
        }

        // GOOD MORNING / GOOD NIGHT
        if (text.includes("good morning")) {

            return randomResponse([
                "Good morning. Hope today treats you well.",
                "Morning! Let's make it a good one."
            ]);
        }

        if (text.includes("good night") || text.includes("goodnight")) {

            return randomResponse([
                "Good night. Rest well.",
                "Sleep well — talk soon."
            ]);
        }

        // GOODBYE
        if (
            ["bye", "goodbye", "see you", "see ya", "later"].includes(text) ||
            text.startsWith("bye ")
        ) {

            return randomResponse([
                "Take care.",
                "See you around.",
                "Bye for now.",
                "Catch you later."
            ]);
        }

        // THANKS
        if (
            text.includes("thank you") ||
            text.includes("thanks") ||
            text === "ty"
        ) {

            return randomResponse([
                "You're welcome.",
                "Anytime.",
                "Happy to help."
            ]);
        }

        // HELP / WHAT CAN YOU DO
        if (
            text.includes("what can you do") ||
            text.includes("help me") ||
            text === "help"
        ) {

            return (
                "I can chat, tell jokes, do quick math, check the time or date, " +
                "remember things you tell me (\"my favorite color is blue\"), " +
                "search the web, and talk through how you're feeling if you want. " +
                "What sounds good?"
            );
        }

        // BOREDOM
        if (text.includes("im bored") || text.includes("i am bored") || text === "bored") {

            return randomResponse([
                "Want a joke, or something to think about instead?",
                "I could tell you a joke, or we could just talk — your call."
            ]);
        }

        // COMPLIMENTS TO AURORA
        if (
            text.includes("i like you") ||
            text.includes("you are smart") ||
            text.includes("youre smart") ||
            text.includes("you are great") ||
            text.includes("youre great")
        ) {

            return "That's kind of you to say — thank you.";
        }

        // HOW ARE YOU
        if (text.includes("how are you")) {

            return "I'm steady. More importantly — how are you doing?";
        }

        // NAME
        if (text.includes("what is your name") || text.includes("who are you")) {

            return "I'm Aurora. Liminal's sibling, different approach.";
        }

        // CREATOR
        if (
            text.includes("who made you") ||
            text.includes("who created you") ||
            text.includes("who built you")
        ) {

            return randomResponse(CREATOR_RESPONSES);
        }

        // FEELINGS CHECK-IN — Aurora-only category
        if (
            text.includes("i feel") ||
            text.includes("i am feeling") ||
            text.includes("im feeling")
        ) {

            const ack = moodAcknowledgement();

            return (
                ack +
                "Do you want to talk through it, or would getting your mind on something else help more?"
            );
        }

        // ADVICE REQUEST — Aurora-only category
        if (
            text.startsWith("should i ") ||
            text.startsWith("what should i do about ")
        ) {

            return (
                "I can't decide that for you, but I can help you think it through. " +
                "What matters most to you in this — and what's the worst-case outcome you're worried about?"
            );
        }

        // ENCOURAGEMENT
        // Note: normalizeText already turns "cant" into
        // "cannot" (typo dictionary), so match on "cannot"
        // here — matching "cant" literally would never fire.
        if (
            text.includes("i cannot do this") ||
            text.includes("i can't do this") ||
            text.includes("i give up") ||
            text.includes("this is too hard")
        ) {

            return "Hard doesn't mean impossible — it just means you're not done yet. What's the smallest next step?";
        }

        // JOKES — different set from Liminal, dawn/light themed.
        // Mood-aware: if things seem heavy, check in before
        // just cracking a joke.
        if (text.includes("tell me a joke") || text.includes("make me laugh") || text === "joke") {

            const joke = randomResponse(JOKES);

            if (mood === "sad" || mood === "anxious") {

                return (
                    "I can — though if you're not feeling great, I'm also just here to talk. " +
                    "Here's one anyway: " + joke
                );
            }

            return joke;
        }

        // REMEMBER THAT
        if (text.startsWith("remember that ")) {

            const information = text.substring(14).trim();
            const parts = information.split(" is ");

            if (parts.length >= 2) {

                const key = cleanMemoryKey(parts[0]);
                const value = parts.slice(1).join(" is ").trim();

                if (key && value) {

                    const oldValue = memory[key];

                    remember(key, value);

                    return oldValue
                        ? `Noted — I've updated it. Your ${key} is now ${value}.`
                        : `Got it. I'll hold onto that: your ${key} is ${value}.`;
                }
            }

            return "Try: remember that my favorite season is autumn.";
        }

        // NATURAL MEMORY ("my X is Y")
        if (text.startsWith("my ") && text.includes(" is ")) {

            const parts = text.split(" is ");
            const key = cleanMemoryKey(parts[0].substring(3));
            const value = parts.slice(1).join(" is ").trim();

            if (key && value) {

                const oldValue = memory[key];

                remember(key, value);

                return oldValue
                    ? `Updated. Your ${key} is now ${value}.`
                    : `Got it — your ${key} is ${value}. I'll remember that.`;
            }
        }

        // WHAT IS MY X
        if (text.startsWith("what is my ") || text.startsWith("tell me my ")) {

            const key = cleanMemoryKey(text.substring(11));
            const value = getMemory(key);

            if (value) {

                lastTopic = key;

                return `Your ${key} is ${value}.`;
            }

            setClarity("uncertain");

            return `I don't have anything stored for your ${key} yet.`;
        }

        // SHOW MEMORY
        if (
            text === "what do you remember" ||
            text === "show my memories" ||
            text === "what do you know about me"
        ) {

            const keys = Object.keys(memory);

            if (!keys.length) {
                return "Nothing stored yet — tell me something and I'll hold onto it.";
            }

            let response = "Here's what I'm holding onto:\n\n";

            for (const key of keys) {
                response += "• " + key + " = " + memory[key] + "\n";
            }

            return response;
        }

        // FORGET
        if (text.startsWith("forget my ") || text.startsWith("forget ")) {

            let key = text.startsWith("forget my ")
                ? text.substring(10)
                : text.substring(7);

            key = cleanMemoryKey(key);

            if (Object.prototype.hasOwnProperty.call(memory, key)) {

                delete memory[key];
                saveMemory();

                return `Done — I've let go of your ${key}.`;
            }

            return `I didn't have anything stored for your ${key}.`;
        }

        // CONTEXT
        if (
            text === "what is it" ||
            text === "what is that" ||
            text === "tell me about it"
        ) {

            if (lastTopic) {

                const value = getMemory(lastTopic);

                if (value) {
                    return `Your ${lastTopic} is ${value}.`;
                }
            }

            setClarity("uncertain");

            return "I'm not sure what you're referring to.";
        }

        // TIME
        if (text.includes("what time is it") || text === "time") {

            const now = new Date();

            return (
                "It's " +
                now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
                " right now."
            );
        }

        // DATE
        if (text.includes("what is the date") || text === "date" || text.includes("what day is it")) {

            const now = new Date();

            return (
                "Today's " +
                now.toLocaleDateString([], {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }) +
                "."
            );
        }

        // MATH
        if (/^[0-9+\-*/().\s]+$/.test(text)) {

            try {

                const answer = Function('"use strict"; return (' + text + ')')();

                if (typeof answer === "number" && Number.isFinite(answer)) {
                    return "That comes out to " + answer + ".";
                }

            } catch (error) {
                // Fall through.
            }
        }

        // ==========================================
        // FUZZY FALLBACK
        //
        // Nothing matched exactly above — try
        // typo-tolerant matching on the same
        // conversational intents before giving up.
        // Deliberately skips memory/search/math:
        // those need exact structure to parse safely.
        //
        // Replies here go through fuzzyReply(), which
        // marks clarity as "fuzzy" (distinct from "clear"
        // exact matches and "uncertain" true misses) and
        // adds a light hedge, since a fuzzy match is a
        // best guess, not a sure read.
        // ==========================================

        function fuzzyReply(text) {
            setClarity("fuzzy");
            return text + " (Let me know if I misread that.)";
        }

        if (fuzzyMatchesAny(text, ["hello", "hi", "hey"])) {

            return fuzzyReply(randomResponse(GREETINGS));
        }

        if (fuzzyMatchesAny(text, ["how are you"])) {

            return fuzzyReply("I'm steady. More importantly — how are you doing?");
        }

        if (fuzzyMatchesAny(text, ["what is your name", "who are you"])) {

            return fuzzyReply("I'm Aurora. Liminal's sibling, different approach.");
        }

        if (fuzzyMatchesAny(text, ["who made you", "who created you", "who built you"])) {

            return fuzzyReply(randomResponse(CREATOR_RESPONSES));
        }

        if (fuzzyMatchesAny(text, ["tell me a joke", "make me laugh", "joke"])) {

            return fuzzyReply(randomResponse(JOKES));
        }

        if (fuzzyMatchesAny(text, ["i cannot do this", "i give up", "this is too hard"])) {

            return fuzzyReply("Hard doesn't mean impossible — it just means you're not done yet. What's the smallest next step?");
        }

        if (fuzzyMatchesAny(text, ["thank you", "thanks"])) {

            return fuzzyReply("You're welcome.");
        }

        if (fuzzyMatchesAny(text, ["what can you do", "help me"])) {

            return fuzzyReply(
                "I can chat, tell jokes, do quick math, check the time or date, " +
                "remember things you tell me, and search the web."
            );
        }

        if (fuzzyMatchesAny(text, ["what time is it"])) {

            const now = new Date();

            return fuzzyReply(
                "It's " +
                now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
                " right now."
            );
        }

        if (fuzzyMatchesAny(text, ["what is the date", "what day is it"])) {

            const now = new Date();

            return fuzzyReply(
                "Today's " +
                now.toLocaleDateString([], {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }) +
                "."
            );
        }

        // UNKNOWN
        setClarity("uncertain");

        return randomResponse([
            "I'm not quite following — can you say that another way?",
            "Not sure I caught that. Rephrase it for me?",
            "Can you put that differently?"
        ]);
    }


    // ==========================================
    // RESPOND
    //
    // This is what index.html actually calls:
    //
    //     await window.Aurora.respond(text)
    //
    // The router (script in index.html) owns all
    // DOM work — creating message bubbles, showing
    // "Thinking...", scrolling, error handling.
    // Aurora's job is just: take text in, return a
    // reply string out. No DOM access here at all.
    // ==========================================

    async function respond(originalText) {

        const normalized = normalizeText(originalText);

        // SEARCH
        if (isSearchRequest(normalized)) {

            const query = getSearchQuery(normalized);

            if (query) {

                const result = await searchWeb(query);

                if (result.success && result.available) {

                    let response = "Here's what turned up for: " + query + "\n\n";

                    if (Array.isArray(result.results) && result.results.length) {

                        result.results.forEach((item, index) => {

                            response += `${index + 1}. ` + (item.title || "Untitled result") + "\n";

                            if (item.snippet) response += item.snippet + "\n";
                            if (item.url) response += item.url + "\n";

                            response += "\n";
                        });

                    } else {

                        response += "Nothing came back for that one.";
                    }

                    lastResponse = response;

                    return response;
                }

                setClarity("uncertain");

                lastResponse = "Search isn't reachable right now.";

                return lastResponse;
            }
        }

        // LOCAL AURORA REPLY
        const localReply = think(originalText);

        lastResponse = localReply;

        console.log("Aurora clarity:", clarity, "| mood:", mood);

        return localReply;
    }


    // ==========================================
    // CLEAR CHAT (Aurora-only state reset)
    // ==========================================

    function resetState() {

        lastTopic = null;
        lastResponse = "";
        clarity = "clear";
        mood = "calm";
    }


    // ==========================================
    // PUBLIC INTERFACE
    // ==========================================

    return {
        respond,   // what index.html calls: await Aurora.respond(text) -> string
        resetState,
        think      // exposed too, in case something wants the sync/local-only path
    };

})();