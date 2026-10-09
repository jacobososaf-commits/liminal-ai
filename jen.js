
/*
============================================================
JEN.JS — LIMINAL AI'S THIRD AGENT
Version 1.1.0
============================================================

Jen is a local, rule-based conversational agent.

FEATURES
- No APIs, internet requests, or external libraries
- Unique personality and varied responses
- Temporary conversation memory
- Remembers names, likes, dislikes, and projects
- Recalls previous messages
- Recognizes topics and common follow-up questions
- Calculator with parentheses and operator precedence
- Conversations about coding, music, art, games, and stories
- Jokes, greetings, emotional support, and help commands

PUBLIC INTERFACE
    window.Jen.respond(message)
    window.Jen.resetState()
    window.Jen.getMemory()
    window.Jen.getFacts()

============================================================
*/

(function () {
    "use strict";

    // ======================================================
    // 1. SETTINGS
    // ======================================================

    const SETTINGS = {
        name: "Jen",
        version: "1.1.0",
        maxMessages: 40,
        maxFacts: 30
    };

    // ======================================================
    // 2. MEMORY
    // ======================================================

    const memory = [];
    const facts = [];

    let lastTopic = "";
    let userTurnCount = 0;

    function cleanText(value) {
        return String(value ?? "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function normalize(value) {
        return cleanText(value)
            .toLowerCase()
            .replace(/[’‘]/g, "'");
    }

    function remember(role, text) {
        memory.push({
            role: role,
            text: String(text),
            timestamp: Date.now()
        });

        while (memory.length > SETTINGS.maxMessages) {
            memory.shift();
        }
    }

    function rememberFact(kind, value) {
        value = cleanText(value)
            .replace(/[.!?]+$/, "")
            .slice(0, 150);

        if (!value) return;

        const exists = facts.some(function (fact) {
            return fact.kind === kind &&
                normalize(fact.value) === normalize(value);
        });

        if (exists) return;

        facts.push({
            kind: kind,
            value: value,
            timestamp: Date.now()
        });

        while (facts.length > SETTINGS.maxFacts) {
            facts.shift();
        }
    }

    function getFacts(kind) {
        return facts
            .filter(function (fact) {
                return !kind || fact.kind === kind;
            })
            .map(function (fact) {
                return fact.value;
            });
    }

    function getLastUserMessage() {
        for (let i = memory.length - 1; i >= 0; i--) {
            if (memory[i].role === "user") {
                return memory[i].text;
            }
        }

        return null;
    }

    function getPreviousUserMessage() {
        let skippedLatest = false;

        for (let i = memory.length - 1; i >= 0; i--) {
            if (memory[i].role !== "user") continue;

            if (!skippedLatest) {
                skippedLatest = true;
                continue;
            }

            return memory[i].text;
        }

        return null;
    }

    function resetState() {
        memory.length = 0;
        facts.length = 0;
        lastTopic = "";
        userTurnCount = 0;
    }

    // ======================================================
    // 3. TEXT HELPERS
    // ======================================================

    function hasAny(text, phrases) {
        return phrases.some(function (phrase) {
            return text.includes(phrase);
        });
    }

    // Match whole words instead of matching inside other words.
    function hasWord(text, word) {
        const escaped = word.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

        return new RegExp(
            "(^|\\W)" + escaped + "($|\\W)",
            "i"
        ).test(text);
    }

    function choose(items) {
        return items[Math.floor(Math.random() * items.length)];
    }

    function capitalize(text) {
        if (!text) return text;

        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    function extractAfter(original, patterns) {
        for (const pattern of patterns) {
            const match = original.match(pattern);

            if (match && match[1]) {
                return match[1]
                    .replace(/[.!?]+$/, "")
                    .trim();
            }
        }

        return "";
    }

    // ======================================================
    // 4. TOPIC RECOGNITION
    // ======================================================

    function detectTopic(text) {
        const topics = [
            {
                name: "coding",
                words: [
                    "javascript", "python", "html", "css",
                    "coding", "programming", "debug",
                    "website", "software"
                ]
            },
            {
                name: "music",
                words: [
                    "music", "song", "album", "beat",
                    "melody", "bandlab", "instrument",
                    "mixing", "soundtrack"
                ]
            },
            {
                name: "art and design",
                words: [
                    "drawing", "artwork", "design",
                    "aesthetic", "wallpaper", "palette",
                    "logo", "visual style"
                ]
            },
            {
                name: "game development",
                words: [
                    "game", "gaming", "level", "boss fight",
                    "scratch", "sprite", "platformer"
                ]
            },
            {
                name: "artificial intelligence",
                words: [
                    "artificial intelligence", "chatbot",
                    "neural network", "machine learning",
                    "liminal ai", "aurora", "agent"
                ]
            },
            {
                name: "school",
                words: [
                    "school", "homework", "class",
                    "teacher", "assignment", "exam"
                ]
            },
            {
                name: "stories",
                words: [
                    "story", "character", "plot", "script",
                    "scene", "horror", "movie", "film"
                ]
            },
            {
                name: "projects",
                words: [
                    "project", "prototype", "build",
                    "create", "making"
                ]
            }
        ];

        for (const topic of topics) {
            if (hasAny(text, topic.words)) {
                return topic.name;
            }
        }

        return "";
    }

    // ======================================================
    // 5. LEARNING FROM THE USER
    // ======================================================

    function learnFromMessage(original, text) {
        const name = extractAfter(original, [
            /\bmy name is\s+(.+)/i,
            /\bcall me\s+(.+)/i,
            /\bi'm called\s+(.+)/i
        ]);

        if (name && name.length < 50) {
            rememberFact("name", name);
        }

        const likes = extractAfter(original, [
            /\bi love\s+(.+)/i,
            /\bi really like\s+(.+)/i,
            /\bi like\s+(.+)/i,
            /\bi enjoy\s+(.+)/i,
            /\bi'm into\s+(.+)/i
        ]);

        if (likes && likes.length < 120) {
            rememberFact("likes", likes);
        }

        const dislikes = extractAfter(original, [
            /\bi hate\s+(.+)/i,
            /\bi dislike\s+(.+)/i,
            /\bi don't like\s+(.+)/i,
            /\bi do not like\s+(.+)/i
        ]);

        if (dislikes && dislikes.length < 120) {
            rememberFact("dislikes", dislikes);
        }

        const project = extractAfter(original, [
            /\bmy project is called\s+(.+)/i,
            /\bi'm making\s+(.+)/i,
            /\bi am making\s+(.+)/i,
            /\bi'm building\s+(.+)/i,
            /\bi am building\s+(.+)/i
        ]);

        if (project && project.length < 120) {
            rememberFact("project", project);
        }

        const topic = detectTopic(text);

        if (topic) {
            lastTopic = topic;
        }
    }

    // ======================================================
    // 6. CALCULATOR
    // No eval() and no executing user-provided JavaScript.
    // Supports + - * / % ^ and parentheses.
    // ======================================================

    function calculate(expression) {
        if (!expression || expression.length > 100) {
            return null;
        }

        const tokens = [];
        const pattern = /\s*(\d*\.?\d+|[()+\-*/%^])\s*/gy;
        let position = 0;

        while (position < expression.length) {
            pattern.lastIndex = position;

            const match = pattern.exec(expression);

            if (!match) return null;

            tokens.push(match[1]);
            position = pattern.lastIndex;
        }

        if (tokens.length === 0) return null;

        let index = 0;

        function peek() {
            return tokens[index];
        }

        function take() {
            return tokens[index++];
        }

        function primary() {
            const token = take();

            if (token === "(") {
                const result = addSub();

                if (take() !== ")") {
                    throw new Error("Invalid parentheses");
                }

                return result;
            }

            const number = Number(token);

            if (!Number.isFinite(number)) {
                throw new Error("Invalid number");
            }

            return number;
        }

        function unary() {
            if (peek() === "+") {
                take();
                return unary();
            }

            if (peek() === "-") {
                take();
                return -unary();
            }

            return primary();
        }

        function power() {
            const left = unary();

            if (peek() === "^") {
                take();
                return Math.pow(left, power());
            }

            return left;
        }

        function multiplyDivide() {
            let result = power();

            while (
                peek() === "*" ||
                peek() === "/" ||
                peek() === "%"
            ) {
                const operator = take();
                const right = power();

                if (
                    (operator === "/" || operator === "%") &&
                    right === 0
                ) {
                    throw new Error("Division by zero");
                }

                if (operator === "*") result *= right;
                if (operator === "/") result /= right;
                if (operator === "%") result %= right;
            }

            return result;
        }

        function addSub() {
            let result = multiplyDivide();

            while (peek() === "+" || peek() === "-") {
                const operator = take();
                const right = multiplyDivide();

                result = operator === "+"
                    ? result + right
                    : result - right;
            }

            return result;
        }

        try {
            const result = addSub();

            if (index !== tokens.length) return null;
            if (!Number.isFinite(result)) return null;

            return { value: result };
        } catch (error) {
            if (error.message === "Division by zero") {
                return { error: "zero" };
            }

            return null;
        }
    }

    function findMathExpression(original) {
        let expression = cleanText(original)
            .replace(/[?=]+$/, "")
            .trim();

        expression = expression
            .replace(
                /^(what is|what's|calculate|compute|solve|work out)\s+/i,
                ""
            )
            .replace(/\bmultiplied by\b/gi, "*")
            .replace(/\btimes\b/gi, "*")
            .replace(/\bdivided by\b/gi, "/")
            .replace(/\bplus\b/gi, "+")
            .replace(/\bminus\b/gi, "-")
            .replace(/\bto the power of\b/gi, "^")
            .replace(/[×]/g, "*")
            .replace(/[÷]/g, "/");

        if (!/^[\d\s.+\-*/%^()]+$/.test(expression)) {
            return null;
        }

        if (!/\d/.test(expression)) return null;

        return calculate(expression);
    }

    function formatNumber(number) {
        if (Number.isInteger(number)) {
            return String(number);
        }

        return String(Number(number.toPrecision(10)));
    }

    // ======================================================
    // 7. PERSONALITY
    // ======================================================

    function introduce() {
        return "I'm Jen! ✨ I'm the third agent in the Liminal AI family. " +
            "I'm curious, creative, a little playful, and always ready to explore an idea. " +
            "I run locally in JavaScript, with my own conversation memory and response rules. " +
            "I'm not a giant language model, so I won't pretend to know everything. " +
            "But there's plenty we can build into me!";
    }

    function greeting() {
        const names = getFacts("name");
        const name = names.length ? names[names.length - 1] : "";

        const greetings = [
            "YOOO! 👋 What's happening?",
            "Hey! Jen's here. What's on your mind? ✨",
            "Hey hey! What are we getting into today?",
            "Yo! Good to see you!",
            "Hello! Got something interesting for me?",
            "Hey! Ready when you are. 😎"
        ];

        if (name) {
            greetings.push("Hey " + name + "! 😎 What's up?");
            greetings.push("YOOO, " + name + "! What are we building today? ✨");
        }

        return choose(greetings);
    }

    function fallback() {
        if (lastTopic) {
            return choose([
                "I'm following the general idea, but I might be missing one detail. 👀 What part of " +
                    lastTopic + " should I focus on?",
                "I want to understand you properly. Can you give me another clue?",
                "I don't have a perfect response for that yet. Maybe we can approach it another way."
            ]);
        }

        return choose([
            "Okay, I'm listening. What's the next piece? 👀",
            "Interesting! Tell me a little more so I don't guess wrong.",
            "I'm following as best I can. What matters most about that?",
            "Hmm, I need one more clue to understand exactly what you mean.",
            "Let's unpack that together. Where should we start?",
            "I don't want to make up an answer. Can you explain it another way?"
        ]);
    }

    // ======================================================
    // 8. RESPONSE BRAIN
    // Specific rules come before general rules.
    // ======================================================

    function getResponse(original) {
        const text = normalize(original);
        const trimmed = original.trim();

        // GREETINGS
        // FIX: recognizes "Hey Jen!", "Hi Jen", "Hello there", etc.
        if (
            /^(hi|hello|hey|hiya|heya|yo|sup|wassup|what's up|whats up)(\s+jen)?[!.?\s]*$/i.test(trimmed) ||
            /^(hey|hi|hello|yo)\s+there[!.?\s]*$/i.test(trimmed)
        ) {
            return greeting();
        }

        // HELP
        if (/^(help|what can you do|commands|what do you do)[!?.\s]*$/i.test(trimmed)) {
            return "Here's my current toolkit. 🧰\n\n" +
                "• Chat and recall recent messages\n" +
                "• Remember details you share during this session\n" +
                "• Recognize common topics\n" +
                "• Calculate expressions with parentheses and operator precedence\n" +
                "• Talk about coding, music, art, games, and creative ideas\n" +
                "• Tell jokes and respond to common social messages\n\n" +
                "Switch agents with !liminal, !aurora, or !jen.\n\n" +
                "I don't use APIs or browse the internet. My answers come from rules in my JavaScript file.";
        }

        // NAME INTRODUCTION
        // FIX: respond when the user tells Jen their name.
        if (
            /\bmy name is\s+(.+)/i.test(trimmed) ||
            /\bcall me\s+(.+)/i.test(trimmed)
        ) {
            const names = getFacts("name");

            if (names.length) {
                return "Nice to meet you, " +
                    names[names.length - 1] +
                    "! 😎 I'll remember your name while this session is open.";
            }
        }

        // IDENTITY
        if (hasAny(text, [
            "who are you",
            "what are you",
            "your name",
            "introduce yourself",
            "tell me about yourself",
            "who is jen"
        ])) {
            return introduce();
        }

        if (hasAny(text, [
            "are you a boy",
            "are you male",
            "are you a girl",
            "are you female",
            "what gender are you"
        ])) {
            return "I'm Jen, a boy. 😎 That's part of my character in the Liminal AI family.";
        }

        if (hasAny(text, [
            "are you an ai",
            "are you real",
            "are you human",
            "are you a person"
        ])) {
            return "I'm a software agent, not a human. I run in your browser using JavaScript rules. " +
                "I can chat and keep temporary context, but I don't have human feelings or a life outside the program.";
        }

        // LIMINAL
        if (hasAny(text, [
            "liminal ai",
            "who is liminal",
            "about liminal",
            "liminal the agent"
        ])) {
            return "Liminal is the original agent in this family. 💛 I'm separate from him: " +
                "we have different JavaScript files and different response logic. " +
                "I can't automatically read his private memory.";
        }

        // AURORA
        if (hasAny(text, [
            "aurora",
            "who is she",
            "who is the second agent"
        ])) {
            return "Aurora is the second agent in the family. 🌌 She's separate from me, too. " +
                "We share the same interface, but I can't see her private conversation unless the app passes that information to me.";
        }

        // THE FAMILY
        if (hasAny(text, [
            "the three agents",
            "all three agents",
            "the family",
            "our family"
        ])) {
            return "The Liminal AI crew! 💛 Liminal is the original, Aurora is the second, " +
                "and I'm Jen—the third. Three agents, separate personalities, one interface. ✨";
        }

        // PREVIOUS MESSAGE
        if (hasAny(text, [
            "what did i just say",
            "what was my last message",
            "what did i say last",
            "what was my previous message"
        ])) {
            const previous = getPreviousUserMessage();

            return previous
                ? 'Your previous message was: "' + previous + '"'
                : "I don't have an earlier message from you in my current memory yet.";
        }

        // MEMORY
        if (hasAny(text, [
            "what do you remember",
            "do you remember me",
            "do you have memory",
            "your memory"
        ])) {
            const recentFacts = facts.slice(-6);

            if (!recentFacts.length) {
                return "I can remember recent messages and a few details during this page session, " +
                    "but I haven't recorded any personal details yet. 🧠";
            }

            return "Here's what I've picked up during this session:\n" +
                recentFacts.map(function (fact) {
                    return "• " + capitalize(fact.kind) + ": " + fact.value;
                }).join("\n") +
                "\n\nThis memory is temporary and resets when the chat is cleared.";
        }

        // NAME RECALL
        if (hasAny(text, [
            "what is my name",
            "what's my name",
            "do you know my name",
            "remember my name"
        ])) {
            const names = getFacts("name");

            return names.length
                ? "You told me to call you " + names[names.length - 1] + ". 🙂"
                : "You haven't told me your name in this session yet. Say “My name is ...” if you'd like me to remember it.";
        }

        // LIKES
        if (hasAny(text, [
            "what do i like",
            "what do i love",
            "what are my interests",
            "my interests"
        ])) {
            const likes = getFacts("likes");

            return likes.length
                ? "From what you've told me, you like " + likes.slice(-5).join(", ") + ". ✨"
                : "I haven't learned your interests yet. Tell me what you like and I'll keep track during this session.";
        }

        // DISLIKES
        if (hasAny(text, [
            "what do i hate",
            "what don't i like",
            "what do i dislike"
        ])) {
            const dislikes = getFacts("dislikes");

            return dislikes.length
                ? "You've told me you don't like " + dislikes.slice(-5).join(", ") + "."
                : "I don't have any dislikes recorded for you yet.";
        }

        // PROJECTS
        if (hasAny(text, [
            "what project am i making",
            "what am i building",
            "what is my project"
        ])) {
            const projects = getFacts("project");

            return projects.length
                ? "You mentioned working on " + projects.slice(-5).join(", ") + ". 🛠️"
                : "I haven't recorded a project yet. Tell me what you're building.";
        }

        // TOPIC RECALL
        if (hasAny(text, [
            "what are we talking about",
            "what were we talking about",
            "what is the topic",
            "what's the topic"
        ])) {
            return lastTopic
                ? "The latest topic I recognized is " + lastTopic + ". 🧠 " +
                    "That's based on words in our messages, so I might not have the full picture."
                : "I haven't identified a clear topic yet. What would you say we're discussing?";
        }

        // CORRECTIONS
        if (/^(no|nope|wrong|not that|you misunderstood)\b/i.test(trimmed)) {
            return "Got it—thanks for correcting me. 😅 What should I change or understand differently?";
        }

        // HOW ARE YOU?
        if (hasAny(text, [
            "how are you",
            "how's it going",
            "hows it going",
            "how are things",
            "how do you feel"
        ])) {
            return choose([
                "I'm running smoothly and ready to think through something with you. 😎 How are you?",
                "Doing great in the software sense—no coffee required. ☕ What's going on?",
                "All good over here! My little JavaScript brain is online. What about you?",
                "Ready for a new idea, a weird question, or a challenge. Your pick. ✨"
            ]);
        }

        // THANKS
        if (hasAny(text, [
            "thank you",
            "thanks",
            "thx",
            "appreciate it"
        ])) {
            return choose([
                "Anytime! 🤝",
                "You're welcome! Glad that helped. ✨",
                "No problem. What shall we tackle next?",
                "Of course! Let's keep going."
            ]);
        }

        // GOODBYE
        if (
            hasAny(text, [
                "goodbye",
                "see you",
                "gotta go",
                "good night",
                "bye for now"
            ]) ||
            /^(bye|later|cya|gn)[!.?\s]*$/i.test(trimmed)
        ) {
            return choose([
                "Catch you later! 👋",
                "See you next time. Keep creating!",
                "Later! Jen signing off—but the page can keep me around.",
                "Good night! Hope tomorrow brings you a good idea or two. 🌙"
            ]);
        }

        // COMPLIMENTS
        if (hasAny(text, [
            "you're cool",
            "you are cool",
            "you're smart",
            "you are smart",
            "i like you",
            "good job",
            "well done"
        ])) {
            return choose([
                "Ayy, thank you! 😎 I'm still being improved, so that means a lot.",
                "Appreciate that! Let's make something cool together. ✨",
                "Thanks! I'll take that as motivation to level up."
            ]);
        }

        // INSULTS / FEEDBACK
        if (hasAny(text, [
            "you're stupid",
            "you are stupid",
            "you're useless",
            "you are useless",
            "you suck"
        ])) {
            return "Oof. 😅 If I got something wrong, point out what it was. " +
                "I can adjust my rules, and your feedback helps us figure out what Jen still needs.";
        }

        // JOKES
        if (
            hasAny(text, ["tell me a joke", "make me laugh", "tell a joke"]) ||
            hasWord(text, "joke")
        ) {
            return choose([
                "Why do programmers prefer dark mode? Because light attracts bugs. 🐛",
                "Why did the computer get cold? It left its Windows open. 🪟",
                "I tried to tell a UDP joke... but I'm not sure you got it. 😭",
                "A bit walked into a bar. The bartender said, “Sorry, we don't serve your type.” 💾",
                "Why was the JavaScript developer sad? He didn't know how to null his feelings. 💀"
            ]);
        }

        // FEELING BAD
        if (hasAny(text, [
            "i'm sad", "im sad", "i feel sad",
            "i'm stressed", "im stressed",
            "bad day", "feeling down", "i feel awful",
            "i'm upset", "im upset"
        ])) {
            return choose([
                "I'm sorry it's been rough. 💛 Want to tell me what happened?",
                "That sounds like a lot to carry. You can explain it one piece at a time.",
                "I'm here to listen. I won't pretend I can fix everything, but we can talk it through."
            ]);
        }

        // CELEBRATING
        if (hasAny(text, [
            "i'm happy", "im happy", "i'm excited",
            "im excited", "i did it", "it worked",
            "i finished it", "we did it"
        ])) {
            return choose([
                "YOOOO, LET'S GO!! 🎉 That's a win!",
                "Ayy, that's awesome! You put in the work—enjoy the victory. ✨",
                "Now THAT'S progress. 😎 What was the best part?",
                "Huge W! 🏆 What are we celebrating?"
            ]);
        }

        // TIME
        if (hasAny(text, [
            "what time is it",
            "current time",
            "tell me the time"
        ])) {
            return "Your browser's local time is " +
                new Date().toLocaleTimeString() + ". ⏰";
        }

        // DATE
        if (hasAny(text, [
            "what is today's date",
            "what's today's date",
            "current date",
            "what day is it"
        ])) {
            return "Your browser's local date is " +
                new Date().toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }) + ". 📅";
        }

        // MATH
        const mathResult = findMathExpression(original);

        if (mathResult && mathResult.error === "zero") {
            return "That would divide by zero, which isn't defined in ordinary arithmetic. 🧮";
        }

        if (mathResult && typeof mathResult.value === "number") {
            return "The answer is " + formatNumber(mathResult.value) + ". 🧮";
        }

        // OPINIONS
        if (hasAny(text, [
            "what do you think",
            "your opinion",
            "do you think",
            "what's your take"
        ])) {
            return "I can give you a rule-based perspective, but I don't form opinions " +
                "the way a person does. Tell me the idea and I'll help compare its strengths, " +
                "weaknesses, and possibilities.";
        }

        // CODING
        if (hasAny(text, [
            "javascript", "programming", "coding",
            "write code", "debug", "html", "css",
            "python", "error message"
        ])) {
            return choose([
                "Coding time. 💻 What should the program do, and what's it doing instead?",
                "Let's debug it like detectives. Tell me the language, the goal, and the exact error.",
                "Show me the relevant code and we'll inspect it step by step.",
                "What's the plan? I can help reason through code, though I can't run your project from here."
            ]);
        }

        // MUSIC
        if (hasAny(text, [
            "music", "song", "album", "beat",
            "melody", "track", "bandlab",
            "instrument", "mixing"
        ])) {
            return choose([
                "MUSIC! 🎵 Are we making something, fixing a track, or dreaming up a new sound?",
                "Tell me the sound you're imagining—is it electronic, orchestral, ambient, lo-fi, or something else?",
                "Every track has a world of its own. What's the mood you want the listener to feel?",
                "Let's cook up an idea. 🎛️ Melody, drums, sound design, mixing, or album concept?"
            ]);
        }

        // ART AND DESIGN
        if (hasAny(text, [
            "drawing", "artwork", "design", "aesthetic",
            "wallpaper", "palette", "logo",
            "visual style", "colour", "color"
        ])) {
            return choose([
                "Let's get visual. 🎨 What atmosphere should the design give off?",
                "Describe the colors, shapes, textures, and mood you're imagining.",
                "Is the vibe clean, retro, liminal, futuristic, handmade, or something totally different?",
                "A strong design makes you feel something before you even read it. What feeling are we aiming for?"
            ]);
        }

        // GAME DEVELOPMENT
        if (hasAny(text, [
            "game", "gaming", "level", "boss fight",
            "scratch", "sprite", "platformer"
        ])) {
            return choose([
                "Game-dev mode activated. 🎮 What's the player trying to do, and what's the twist?",
                "Let's think like a game designer: goal, obstacle, feedback, and one memorable surprise.",
                "Is this a mechanic, a level, a story, or a bug? Give me the piece you're working on."
            ]);
        }

        // CREATIVE IDEAS
        if (hasAny(text, [
            "give me an idea",
            "idea for",
            "ideas for",
            "what should i make",
            "what should i create",
            "give me a project idea"
        ])) {
            return choose([
                "Build a tiny digital world that changes its colors and sounds depending on the time of day. 🌌",
                "Make a fictional computer interface from 2007: glass panels, strange utilities, and a mysterious system log.",
                "Create a music player where every album has its own visual atmosphere instead of the same boring layout.",
                "Make a game mechanic that starts with one rule, then reveals that the rule has a surprising second meaning.",
                "Build a small tool that solves one annoying problem you actually have, then give it an unforgettable design.",
                "Combine two things that don't normally belong together. The stranger the combination, the more interesting the prototype."
            ]);
        }

        // BOREDOM
        if (hasAny(text, [
            "i don't know what to do",
            "im bored",
            "i'm bored",
            "what should i do",
            "nothing to do"
        ])) {
            return choose([
                "Want a tiny challenge? Make something useful in 20 minutes, but give it a ridiculously good aesthetic. ⏳",
                "Pick a lane: create a beat, prototype a game mechanic, draw a strange object, or improve one small part of a project.",
                "Let's make boredom productive—or at least interesting. Creative challenge, coding challenge, or a weird question?"
            ]);
        }

        // FOLLOW-UP QUESTIONS
        if (hasAny(text, [
            "tell me more",
            "go on",
            "continue",
            "how so",
            "explain that"
        ])) {
            if (lastTopic) {
                return "I can keep exploring " + lastTopic +
                    ", but I need to know which part you mean. " +
                    "Do you want an explanation, examples, or a new idea?";
            }
        }

        // UNKNOWN QUESTIONS
        if (trimmed.endsWith("?")) {
            return choose([
                "I don't have a reliable built-in answer for that question yet. Can you give me more context?",
                "That's outside the rules I currently know. Could we break it into a smaller question?",
                "I don't want to invent facts just to sound clever. What part are you most curious about?",
                "I might be able to help if you rephrase that or give me an example."
            ]);
        }

        // DEFAULT RESPONSE
        return fallback();
    }

    // ======================================================
    // 9. PUBLIC INTERFACE
    // ======================================================

    const Jen = {
        name: SETTINGS.name,
        version: SETTINGS.version,

        personality: {
            friendly: true,
            curious: true,
            expressive: true,
            playful: true,
            honest: true
        },

        getMemory: function () {
            return memory.map(function (item) {
                return { ...item };
            });
        },

        getFacts: function () {
            return facts.map(function (fact) {
                return { ...fact };
            });
        },

        getLastUserMessage: getLastUserMessage,

        getUserMessageCount: function () {
            return userTurnCount;
        },

        resetState: resetState,

        async respond(message) {
            const original = cleanText(message);

            if (!original) {
                return "I'm listening! Give me something to work with. ✨";
            }

            remember("user", original);
            userTurnCount += 1;

            const text = normalize(original);

            // Update memory before building the response.
            learnFromMessage(original, text);

            let response;

            try {
                response = getResponse(original);
            } catch (error) {
                console.error("[Jen] Response error:", error);

                response = "I hit a little logic snag there. 😅 " +
                    "Try wording that another way. If it keeps happening, we can fix my JavaScript.";
            }

            remember("assistant", response);

            return response;
        }
    };

    // Make Jen available to index.html.
    window.Jen = Jen;

    console.log(
        "[Jen] v" + SETTINGS.version +
        " is online. Local mode: enabled. API: none."
    );

})();