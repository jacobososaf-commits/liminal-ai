// ==========================================
// AURORA AI 0.6
// aurora.js
//
// SISTER AGENT TO LIMINAL AI
// Same house, different mind.
//
// 0.6 MATCHING UPGRADE
// - Replaced the old ratio-based fuzzy fallback
//   with a real word-position + nearby-word
//   matcher (same caliber as Liminal's 0.8.1
//   matchesIntent/fuzzyPhraseMatch), applied
//   directly on every conversational intent —
//   no more separate exact-match/fuzzy-fallback
//   lists that could drift out of sync.
// - Jokes rewritten: more of them, more variety,
//   Aurora's own voice (not Liminal's programmer
//   jokes).
//
// Deliberately still NOT copying: Liminal's
// conversation-context memory, corrections
// system, or built-in knowledge base (coding
// definitions, random facts, etc). Aurora stays
// its own thing — see aurora-roadmap.md.
// ==========================================
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

    // ==========================================
    // MOOD HISTORY
    //
    // A running, persisted log of how the mood
    // has shifted across conversations — something
    // Liminal has no equivalent of at all. Only
    // logs on an actual change, not every message,
    // so it reads as a real timeline rather than
    // noise.
    // ==========================================

    let moodLog =
        JSON.parse(
            localStorage.getItem("auroraMoodLog") || "[]"
        );

    const MAX_MOOD_LOG = 30;

    function saveMoodLog() {
        localStorage.setItem(
            "auroraMoodLog",
            JSON.stringify(moodLog)
        );
    }

    function logMood(newMood) {

        moodLog.push({
            mood: newMood,
            time: new Date().toISOString()
        });

        if (moodLog.length > MAX_MOOD_LOG) {
            moodLog = moodLog.slice(-MAX_MOOD_LOG);
        }

        saveMoodLog();
    }

    function summarizeMoodLog() {

        if (!moodLog.length) {
            return "I don't have any mood history yet — that builds up as we talk.";
        }

        const counts = {};

        for (const entry of moodLog) {
            counts[entry.mood] = (counts[entry.mood] || 0) + 1;
        }

        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

        const summary = sorted
            .map(([m, count]) => `${m} (${count})`)
            .join(", ");

        return `Across our recent conversations, you've mostly come across as: ${summary}.`;
    }

    function updateMood(text) {

        const textWords = text.split(" ").filter(Boolean);

        for (const key in MOOD_WORDS) {

            const hit = MOOD_WORDS[key].some(moodWord =>
                textWords.some(tw => similarWord(tw, moodWord))
            );

            if (hit) {

                if (key !== mood) {
                    logMood(key);
                }

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
    // Cheap, exact typo/slang fixes up front.
    // The matching engine below (matchesIntent)
    // handles everything this dictionary misses —
    // this just saves it some work on the common
    // cases.
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
    // FUZZY MATCHING — MATCHING ENGINE
    //
    // Word-position + nearby-word matcher: checks
    // each word of a target phrase against the
    // input, first at its expected position, then
    // by searching the rest of the input for a
    // close match. Order-tolerant, typo-tolerant,
    // and reports back whether the match was exact
    // or a guess (used for clarity/hedging below).
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
        if (word.length <= 2 || target.length <= 2) return false;

        // Typos rarely change the first letter, but unrelated
        // words often share a similar shape (e.g. "bored" vs
        // "tired" are edit-distance 2 apart but mean nothing
        // alike). Requiring the first letter to match filters
        // these out while still catching real typos.
        if (word.charAt(0) !== target.charAt(0)) return false;

        const distance = levenshtein(word, target);

        // Same-length typos are usually a transposition
        // ("hlelo"/"hello", "craeted"/"created") — tolerate
        // distance 2 there. Different-length words are more
        // likely genuinely different words that happen to be
        // close (e.g. "help" vs "hello" — real bug this caught
        // in testing), so only tolerate distance 1 there.
        const maxDistance = word.length === target.length
            ? (target.length <= 4 ? 1 : 2)
            : 1;

        return distance <= maxDistance;
    }

    // Checks each word of `phrase` against `input`, first at
    // the matching position, then anywhere else in the input.
    // Returns { matched, exact } — exact means the input was
    // literally the phrase (word for word), matched-but-not-
    // exact means it got there via typo tolerance / extra words.
    function fuzzyPhraseMatch(input, phrase, options = {}) {

        const inputWords = input.split(/\s+/).filter(Boolean);
        const targetWords = phrase.split(/\s+/).filter(Boolean);

        if (!inputWords.length || !targetWords.length) {
            return { matched: false, exact: false };
        }

        const allowExtraWords = options.allowExtraWords !== false;
        const maxExtra = options.maxExtraWords ?? 3;

        if (!allowExtraWords && inputWords.length !== targetWords.length) {
            return { matched: false, exact: false };
        }

        if (allowExtraWords && inputWords.length > targetWords.length + maxExtra) {
            return { matched: false, exact: false };
        }

        if (inputWords.join(" ") === targetWords.join(" ")) {
            return { matched: true, exact: true };
        }

        const used = new Set();
        let matchedCount = 0;

        for (let i = 0; i < targetWords.length; i++) {

            const targetWord = targetWords[i];

            // Try the expected position first.
            if (inputWords[i] && similarWord(inputWords[i], targetWord)) {
                used.add(i);
                matchedCount++;
                continue;
            }

            // Then search the rest of the input.
            for (let j = 0; j < inputWords.length; j++) {

                if (used.has(j)) continue;

                if (similarWord(inputWords[j], targetWord)) {
                    used.add(j);
                    matchedCount++;
                    break;
                }
            }
        }

        return { matched: matchedCount === targetWords.length, exact: false };
    }

    // Tries each phrase in turn, returns the first match's
    // { matched, exact } result, or { matched: false } if none hit.
    function matchesIntent(text, phrases, options = {}) {

        for (const phrase of phrases) {

            const result = fuzzyPhraseMatch(text, phrase, options);

            if (result.matched) return result;
        }

        return { matched: false, exact: false };
    }

    // Wraps a reply with a hedge + sets clarity to "fuzzy"
    // when the match that produced it wasn't exact. Exact
    // matches pass through untouched (clarity stays "clear").
    function finish(reply, matchResult) {

        if (matchResult && matchResult.matched && !matchResult.exact) {
            setClarity("fuzzy");
            return reply + " (Let me know if I misread that.)";
        }

        return reply;
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
    // ==========================================

    const GREETINGS = [
        "Hi — good to see you.",
        "Hey there. What's on your mind?",
        "Hello! Ready when you are.",
        "Hey! How's your day going?",
        "Hi there.",
        "Hey — what's up?"
    ];

    // Rewritten for 0.6: more of them, more variety, and
    // less one-note (the old set was all sun/horizon puns).
    // Still Aurora's own voice — warmth and mornings — just
    // not repeating the same joke structure ten different ways.
    const JOKES = [
        "Why did the sun go to therapy? Too many bright ideas.",
        "I told the horizon a joke. It just kept rising to the occasion.",
        "Mornings are just nights that peer-pressured the sky into color.",
        "Why is dawn always calm? It's still half-asleep.",
        "I asked the sky for advice. It just kept clouding the issue.",
        "My internal clock runs on sunrise time — which is a nice way of saying I'm dramatic before 9am.",
        "I tried counting stars to fall asleep. Bad plan, considering I don't actually sleep.",
        "Coffee and I have a lot in common — we both work better once the sun's involved.",
        "Someone asked if I dream in color. Mostly orange and pink, if you're curious.",
        "I won't say mornings are my thing, I'll just say I've never seen a sunset start an argument."
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
    //
    // Trigger detection now has a fuzzy first-word
    // check too, so "serach for cats" / "googel cats"
    // still fire — matches Liminal's approach.
    // ==========================================

    // Figures out how many leading words are the search
    // "trigger" (search/google/look up, typo-tolerant, plus
    // an optional trailing "for") so both detection and query
    // extraction agree on exactly what to strip.
    function searchTriggerWordCount(words) {

        if (!words.length) return 0;

        if (similarWord(words[0], "google") || similarWord(words[0], "search")) {

            if (words[1] && similarWord(words[1], "for")) return 2;
            return 1;
        }

        if (words.length >= 2 && similarWord(words[0], "look")) {

            if (similarWord(words[1], "up")) return 2;
            if (similarWord(words[1], "for")) return 2;
        }

        return 0;
    }

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

        if (phrases.some(phrase => text.startsWith(phrase))) {
            return true;
        }

        const words = text.split(/\s+/).filter(Boolean);

        return searchTriggerWordCount(words) > 0;
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

        // Fuzzy-triggered search ("serach for cats") — strip
        // exactly the trigger words (and a following "for"),
        // not just the first word.
        const words = text.split(/\s+/).filter(Boolean);
        const triggerCount = searchTriggerWordCount(words);

        if (triggerCount > 0) {
            return words.slice(triggerCount).join(" ").trim();
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
    // Conversational intents now go through
    // matchesIntent() — one phrase list per
    // intent, typo/order-tolerant, no separate
    // fuzzy fallback pass needed anymore.
    //
    // Memory/search/math stay on exact structural
    // matching (startsWith) — those need to parse
    // reliably, not just detect intent.
    // ==========================================

    function think(originalText) {

        const text = normalizeText(originalText);

        setClarity("clear");
        updateMood(text);

        // GREETINGS — mood-aware: if the last message
        // read as sad/anxious/angry, acknowledge that
        // before the usual greeting instead of ignoring it.
        const greetMatch = matchesIntent(
            text,
            ["hello", "hi", "hey", "hello there", "hey there", "yo", "sup"],
            { allowExtraWords: true, maxExtraWords: 3 }
        );

        if (greetMatch.matched) {

            if (mood !== "calm" && mood !== "happy" && mood !== "excited") {

                return finish(
                    moodAcknowledgement() +
                    "Hey — I'm here if you want to talk, or happy to just chat about something else.",
                    greetMatch
                );
            }

            return finish(randomResponse(GREETINGS), greetMatch);
        }

        // GOOD MORNING
        const morningMatch = matchesIntent(
            text, ["good morning"], { allowExtraWords: true, maxExtraWords: 2 }
        );

        if (morningMatch.matched) {

            return finish(randomResponse([
                "Good morning. Hope today treats you well.",
                "Morning! Let's make it a good one."
            ]), morningMatch);
        }

        // GOOD NIGHT
        const nightMatch = matchesIntent(
            text, ["good night", "goodnight"], { allowExtraWords: true, maxExtraWords: 2 }
        );

        if (nightMatch.matched) {

            return finish(randomResponse([
                "Good night. Rest well.",
                "Sleep well — talk soon."
            ]), nightMatch);
        }

        // GOODBYE
        const byeMatch = matchesIntent(
            text, ["bye", "goodbye", "see you", "see ya", "later"],
            { allowExtraWords: true, maxExtraWords: 2 }
        );

        if (byeMatch.matched) {

            return finish(randomResponse([
                "Take care.",
                "See you around.",
                "Bye for now.",
                "Catch you later."
            ]), byeMatch);
        }

        // THANKS
        const thanksMatch = matchesIntent(
            text, ["thank you", "thanks", "ty"], { allowExtraWords: true, maxExtraWords: 2 }
        );

        if (thanksMatch.matched) {

            return finish(randomResponse([
                "You're welcome.",
                "Anytime.",
                "Happy to help."
            ]), thanksMatch);
        }

        // BOREDOM
        const boredMatch = matchesIntent(
            text, ["im bored", "i am bored", "bored"], { allowExtraWords: true, maxExtraWords: 2 }
        );

        if (boredMatch.matched) {

            return finish(randomResponse([
                "Want a joke, or something to think about instead?",
                "I could tell you a joke, or we could just talk — your call."
            ]), boredMatch);
        }

        // COMPLIMENTS TO AURORA
        const complimentMatch = matchesIntent(
            text,
            ["i like you", "you are smart", "you are great", "you are cool"],
            { allowExtraWords: true, maxExtraWords: 2 }
        );

        if (complimentMatch.matched) {

            return finish("That's kind of you to say — thank you.", complimentMatch);
        }

        // HOW ARE YOU
        const howAreYouMatch = matchesIntent(
            text, ["how are you", "how is it going", "how are things"],
            { allowExtraWords: true, maxExtraWords: 3 }
        );

        if (howAreYouMatch.matched) {

            return finish("I'm steady. More importantly — how are you doing?", howAreYouMatch);
        }

        // NAME
        const nameMatch = matchesIntent(
            text, ["what is your name", "who are you"], { allowExtraWords: true, maxExtraWords: 3 }
        );

        if (nameMatch.matched) {

            return finish("I'm Aurora. Liminal's sibling, different approach.", nameMatch);
        }

        // CREATOR
        const creatorMatch = matchesIntent(
            text, ["who made you", "who created you", "who built you"],
            { allowExtraWords: true, maxExtraWords: 3 }
        );

        if (creatorMatch.matched) {

            return finish(randomResponse(CREATOR_RESPONSES), creatorMatch);
        }

        // FEELINGS CHECK-IN — Aurora-only category
        const feelingsMatch = matchesIntent(
            text, ["i feel", "i am feeling"], { allowExtraWords: true, maxExtraWords: 4 }
        );

        if (feelingsMatch.matched) {

            const ack = moodAcknowledgement();

            return finish(
                ack + "Do you want to talk through it, or would getting your mind on something else help more?",
                feelingsMatch
            );
        }

        // DECISION HELPER — Aurora-only category. Coin flips
        // and "X or Y" choices. Placed before the generic
        // advice branch below so "should i pick pizza or
        // tacos" gets an actual pick, not a vague prompt.
        const coinFlipMatch = matchesIntent(
            text, ["flip a coin", "coin flip", "heads or tails"],
            { allowExtraWords: true, maxExtraWords: 2 }
        );

        if (coinFlipMatch.matched) {

            return finish(randomResponse(["Heads.", "Tails."]), coinFlipMatch);
        }

        if (text.includes(" or ")) {

            const stripPatterns = [
                /^should i\s+/,
                /^do i\s+/,
                /^would you\s+/,
                /^could you\s+/,
                /^help me decide( between)?\s+/,
                /^pick\s+/,
                /^choose\s+/
            ];

            let cleaned = text.replace(/[?.!]+$/, "");
            let changed = true;

            while (changed) {

                changed = false;

                for (const pattern of stripPatterns) {

                    if (pattern.test(cleaned)) {
                        cleaned = cleaned.replace(pattern, "");
                        changed = true;
                    }
                }
            }

            const options = cleaned
                .split(" or ")
                .map(o => o.trim())
                .filter(Boolean);

            if (options.length >= 2 && options.length <= 5) {

                const choice = randomResponse(options);

                return `If I had to pick, I'd go with ${choice}. Though it's your call.`;
            }
        }

        // ADVICE REQUEST — Aurora-only category
        // (kept as exact-prefix: "should i" needs to be a real
        // prefix so we don't swallow unrelated sentences)
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
        const encouragementMatch = matchesIntent(
            text,
            ["i cannot do this", "i can't do this", "i give up", "this is too hard"],
            { allowExtraWords: true, maxExtraWords: 3 }
        );

        if (encouragementMatch.matched) {

            return finish(
                "Hard doesn't mean impossible — it just means you're not done yet. What's the smallest next step?",
                encouragementMatch
            );
        }

        // MOTIVATION — standalone request, distinct from the
        // "i can't do this" trigger above (that one reacts to
        // distress; this is a general ask for a pick-me-up).
        const motivationMatch = matchesIntent(
            text,
            ["motivate me", "give me some encouragement", "i need motivation", "cheer me up"],
            { allowExtraWords: true, maxExtraWords: 3 }
        );

        if (motivationMatch.matched) {

            return finish(randomResponse([
                "You've gotten through every hard day so far — that's a perfect track record.",
                "Small steps still count as progress. Keep going.",
                "You don't have to feel ready to start. Just start.",
                "Whatever it is, you're more capable of it than you think right now."
            ]), motivationMatch);
        }

        // MOOD HISTORY — Aurora-only. Liminal has no
        // equivalent of tracking how the conversation's
        // tone has shifted over time.
        const moodHistoryMatch = matchesIntent(
            text,
            ["how have i been feeling", "mood history", "how has my mood been", "check my mood"],
            { allowExtraWords: true, maxExtraWords: 3 }
        );

        if (moodHistoryMatch.matched) {

            return finish(summarizeMoodLog(), moodHistoryMatch);
        }

        // GROUNDING — Aurora-only. A simple, generic breathing
        // prompt on request, not medical advice or a diagnosis
        // of anything — just a small tool to offer.
        const calmMatch = matchesIntent(
            text,
            ["help me calm down", "i need to calm down", "breathing exercise", "calm me down"],
            { allowExtraWords: true, maxExtraWords: 3 }
        );

        if (calmMatch.matched) {

            return finish(
                "Let's do a slow round of box breathing: in for 4 seconds, hold for 4, out for 4, hold for 4. " +
                "Repeat that a few times — no rush.",
                calmMatch
            );
        }

        // HELP / WHAT CAN YOU DO
        // Deliberately checked LATE: "help me" with extra-word
        // tolerance would otherwise swallow more specific
        // requests like "help me calm down" before they get a
        // chance to match their own branch above.
        const helpMatch = matchesIntent(
            text, ["what can you do", "help me", "help"],
            { allowExtraWords: true, maxExtraWords: 3 }
        );

        if (helpMatch.matched) {

            return finish(
                "I can chat, tell jokes, do quick math, check the time or date, " +
                "remember things you tell me (\"my favorite color is blue\"), " +
                "search the web, help you decide between things or flip a coin, " +
                "offer a breathing exercise, keep track of how you've been feeling, " +
                "and talk through it if you want. What sounds good?",
                helpMatch
            );
        }

        // JOKES — mood-aware: if things seem heavy, check in
        // before just cracking a joke.
        const jokeMatch = matchesIntent(
            text, ["tell me a joke", "make me laugh", "joke", "tell a joke"],
            { allowExtraWords: true, maxExtraWords: 3 }
        );

        if (jokeMatch.matched) {

            const joke = randomResponse(JOKES);

            if (mood === "sad" || mood === "anxious") {

                return finish(
                    "I can — though if you're not feeling great, I'm also just here to talk. " +
                    "Here's one anyway: " + joke,
                    jokeMatch
                );
            }

            return finish(joke, jokeMatch);
        }

        // REMEMBER THAT (exact structure — needs to parse "X is Y")
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

        // NATURAL MEMORY ("my X is Y") — exact structure
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

        // WHAT IS MY X — exact structure
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
        const showMemoryMatch = matchesIntent(
            text,
            ["what do you remember", "show my memories", "what do you know about me"],
            { allowExtraWords: true, maxExtraWords: 3 }
        );

        if (showMemoryMatch.matched) {

            const keys = Object.keys(memory);

            if (!keys.length) {
                return finish("Nothing stored yet — tell me something and I'll hold onto it.", showMemoryMatch);
            }

            let response = "Here's what I'm holding onto:\n\n";

            for (const key of keys) {
                response += "• " + key + " = " + memory[key] + "\n";
            }

            return finish(response, showMemoryMatch);
        }

        // FORGET — exact structure (needs a reliable key)
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
        const contextMatch = matchesIntent(
            text, ["what is it", "what is that", "tell me about it"],
            { allowExtraWords: true, maxExtraWords: 2 }
        );

        if (contextMatch.matched) {

            if (lastTopic) {

                const value = getMemory(lastTopic);

                if (value) {
                    return finish(`Your ${lastTopic} is ${value}.`, contextMatch);
                }
            }

            setClarity("uncertain");

            return "I'm not sure what you're referring to.";
        }

        // TIME
        const timeMatch = matchesIntent(
            text, ["what time is it", "current time", "time"],
            { allowExtraWords: true, maxExtraWords: 3 }
        );

        if (timeMatch.matched) {

            const now = new Date();

            return finish(
                "It's " +
                now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
                " right now.",
                timeMatch
            );
        }

        // DATE
        const dateMatch = matchesIntent(
            text, ["what is the date", "what day is it", "today's date"],
            { allowExtraWords: true, maxExtraWords: 3 }
        );

        if (dateMatch.matched) {

            const now = new Date();

            return finish(
                "Today's " +
                now.toLocaleDateString([], {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }) +
                ".",
                dateMatch
            );
        }

        // MATH — exact structure, no fuzzy matching on numbers
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