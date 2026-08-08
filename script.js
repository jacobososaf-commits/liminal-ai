// ==========================================
// LIMINAL AI 0.5
// ==========================================


// ---------------- MEMORY ----------------

let memory =
    JSON.parse(localStorage.getItem("liminalMemory")) || {};

function saveMemory() {
    localStorage.setItem(
        "liminalMemory",
        JSON.stringify(memory)
    );
}


// ---------------- CONVERSATION CONTEXT ----------------

let lastTopic = null;
let lastResponse = "";
let lastAction = null;


// ---------------- PERSONALITY ----------------

function randomResponse(responses) {
    return responses[
        Math.floor(Math.random() * responses.length)
    ];
}


// ---------------- THEME ----------------

function updateThemeButton() {

    const button =
        document.getElementById("themeButton");

    if (!button) {
        return;
    }

    const lightMode =
        document.body.classList.contains("light-mode");

    if (lightMode) {
        button.textContent = "🌙 Dark";
    } else {
        button.textContent = "☀️ Light";
    }
}


function toggleTheme() {

    document.body.classList.toggle("light-mode");

    const lightMode =
        document.body.classList.contains("light-mode");

    localStorage.setItem(
        "liminalTheme",
        lightMode ? "light" : "dark"
    );

    updateThemeButton();
}


function loadTheme() {

    const savedTheme =
        localStorage.getItem("liminalTheme");

    if (savedTheme === "light") {
        document.body.classList.add("light-mode");
    }

    updateThemeButton();
}


// ---------------- TEXT NORMALIZATION ----------------

function normalizeText(text) {

    text = text.toLowerCase().trim();

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

    for (const wrong in replacements) {

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
        text.replace(/\s+/g, " ");

    return text.trim();
}


// ---------------- FUZZY MATCHING ----------------

function levenshtein(a, b) {

    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {

        for (let j = 1; j <= a.length; j++) {

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
        levenshtein(word, target);

    const maxDistance =
        word.length <= 4 ? 1 : 2;

    return distance <= maxDistance;
}


// ---------------- MEMORY HELPERS ----------------

function cleanMemoryKey(key) {

    key =
        normalizeText(key)
            .replace(/[?!.]/g, "")
            .trim();

    if (key.startsWith("my ")) {
        key = key.substring(3);
    }

    return key;
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

    key =
        cleanMemoryKey(key);

    return memory[key];
}


// ---------------- FIND MEMORY KEY ----------------

function findMemoryKey(text) {

    text =
        normalizeText(text);

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

    if (text.includes("my name")) {
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


// ---------------- SMART UNKNOWN ----------------

function smartUnknown(text) {

    const words =
        normalizeText(text)
            .replace(/[?!.]/g, "")
            .split(" ")
            .filter(word => word.length > 0);

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

    words.forEach(word => {

        for (const memoryWord of memoryWords) {

            if (
                word === memoryWord ||
                similarWord(word, memoryWord)
            ) {

                memoryScore++;
                break;
            }
        }
    });

    if (memoryScore >= 2) {

        return "I think you're asking about something I remember. Try asking me something like \"what is my favorite color?\"";
    }

    if (
        words.some(word =>
            similarWord(word, "time")
        )
    ) {

        return "I think you're asking about the time. Try asking \"what time is it?\"";
    }

    if (
        words.some(word =>
            similarWord(word, "date")
        )
    ) {

        return "I think you're asking about the date. Try asking \"what is the date?\"";
    }

    if (
        words.some(word =>
            similarWord(word, "joke")
        )
    ) {

        return "I think you want a joke. Try asking \"tell me a joke.\"";
    }

    return "I'm not sure what you mean. Could you rephrase that?";
}


// ---------------- THINK ----------------

function think(originalText) {

    const text =
        normalizeText(originalText);


    // TIME

    if (
        text.includes("what time is it") ||
        text === "time" ||
        text.includes("current time")
    ) {

        const now = new Date();

        return "The current time is " +
            now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            }) +
            ".";
    }


    // DATE

    if (
        text.includes("what is the date") ||
        text === "date" ||
        text.includes("what day is it")
    ) {

        const now = new Date();

        return "Today is " +
            now.toLocaleDateString([], {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            }) +
            ".";
    }


    // GREETINGS

    if (
        text === "hello" ||
        text === "hi" ||
        text === "hey" ||
        text === "hello there" ||
        text === "hey there"
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
        text.includes("how are you") ||
        text.includes("how is it going")
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
        text.includes("what is your name") ||
        text.includes("who are you")
    ) {

        return "I'm Liminal AI 0.5.";
    }


    // CREATOR

    if (
        text.includes("who made you") ||
        text.includes("who created you") ||
        text.includes("who built you")
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
        text.includes("tell me a joke") ||
        text.includes("make me laugh") ||
        text === "joke"
    ) {

        const jokes = [
            "Why did the computer go to the doctor? Because it had a virus.",
            "Why was the computer cold? It left its Windows open.",
            "What do computers eat? Microchips!",
            "Why did the programmer quit his job? He didn't get arrays."
        ];

        return randomResponse(jokes);
    }


    // REMEMBER THAT

    if (text.startsWith("remember that ")) {

        const information =
            text.substring(14).trim();

        const parts =
            information.split(" is ");

        if (parts.length >= 2) {

            const key =
                parts[0].trim();

            const value =
                parts.slice(1)
                    .join(" is ")
                    .trim();

            remember(key, value);

            return "I'll remember that your " +
                cleanMemoryKey(key) +
                " is " +
                value +
                ".";
        }

        return "Try saying: remember that my favorite color is yellow.";
    }


    // NATURAL MEMORY

    if (
        text.startsWith("my ") &&
        text.includes(" is ")
    ) {

        const parts =
            text.split(" is ");

        const key =
            parts[0]
                .substring(3)
                .trim();

        const value =
            parts.slice(1)
                .join(" is ")
                .trim();

        remember(key, value);

        return "Got it. I'll remember that your " +
            cleanMemoryKey(key) +
            " is " +
            value +
            ".";
    }


    // I AM

    if (text.startsWith("i am ")) {

        const value =
            text.substring(5).trim();

        remember("identity", value);

        return "Got it. I'll remember that you are " +
            value +
            ".";
    }


    // I LIVE IN

    if (text.startsWith("i live in ")) {

        const value =
            text.substring(10).trim();

        remember("location", value);

        return "Got it. I'll remember that you live in " +
            value +
            ".";
    }


    // MEMORY QUESTIONS

    const possibleKey =
        findMemoryKey(text);

    if (possibleKey) {

        const value =
            getMemory(possibleKey);

        if (value) {

            return "Your " +
                possibleKey +
                " is " +
                value +
                ".";
        }

        return "I don't remember your " +
            possibleKey +
            " yet.";
    }


    // WHAT IS MY

    if (
        text.startsWith("what is my ") ||
        text.startsWith("tell me my ")
    ) {

        const key =
            text.substring(
                text.startsWith("what is my ")
                    ? 11
                    : 11
            );

        const cleanKey =
            cleanMemoryKey(key);

        const value =
            getMemory(cleanKey);

        if (value) {

            return "Your " +
                cleanKey +
                " is " +
                value +
                ".";
        }

        return "I don't remember your " +
            cleanKey +
            " yet.";
    }


    // SHOW MEMORY

    if (
        text === "what do you remember" ||
        text === "show my memories" ||
        text === "what do you know about me"
    ) {

        const keys =
            Object.keys(memory);

        if (keys.length === 0) {
            return "I don't remember anything yet.";
        }

        let response =
            "Here's what I remember:<br><br>";

        keys.forEach(function(key) {

            response +=
                "• " +
                key +
                " = " +
                memory[key] +
                "<br>";

        });

        return response;
    }


    // FORGET

    if (
        text.startsWith("forget my ") ||
        text.startsWith("forget ")
    ) {

        let key;

        if (text.startsWith("forget my ")) {
            key = text.substring(10);
        } else {
            key = text.substring(7);
        }

        key =
            cleanMemoryKey(key);

        if (memory[key]) {

            delete memory[key];

            saveMemory();

            return "Okay, I forgot your " +
                key +
                ".";
        }

        return "I don't have a memory about your " +
            key +
            ".";
    }


    // CONTEXT

    if (
        text === "what is it" ||
        text === "what is that" ||
        text === "what was it" ||
        text === "what's it" ||
        text === "what's that" ||
        text === "tell me about it"
    ) {

        if (lastTopic) {

            const value =
                getMemory(lastTopic);

            if (value) {

                return "Your " +
                    lastTopic +
                    " is " +
                    value +
                    ".";
            }
        }

        return "I'm not sure what \"it\" refers to yet.";
    }


    // FOLLOW-UP

    if (
        text === "why" ||
        text === "how come"
    ) {

        if (lastTopic) {

            return "Because that's the information I currently have stored about your " +
                lastTopic +
                ".";
        }

        return "I'm not sure what you're referring to.";
    }


    if (
        text === "which one" ||
        text === "what one"
    ) {

        if (lastTopic) {

            const value =
                getMemory(lastTopic);

            if (value) {

                return "The one I remember is " +
                    value +
                    ".";
            }
        }

        return "I'm not sure which one you mean.";
    }


    if (
        text === "when did i tell you" ||
        text === "when did i tell you that"
    ) {

        if (lastTopic) {

            return "I remember your " +
                lastTopic +
                ", but I don't currently keep track of when you told me.";
        }

        return "I don't know what you're referring to.";
    }


    // MATH

    if (
        text.match(/^[0-9+\-*/().\s]+$/)
    ) {

        try {

            const answer =
                Function(
                    '"use strict"; return (' +
                    text +
                    ')'
                )();

            return "The answer is " +
                answer +
                ".";

        } catch (error) {

            return "I couldn't calculate that.";
        }
    }


    // UNKNOWN

    return smartUnknown(text);
}


// ---------------- SEND MESSAGE ----------------

function sendMessage() {

    const input =
        document.getElementById("userInput");

    const messages =
        document.getElementById("messages");

    const text =
        input.value.trim();

    if (text === "") {
        return;
    }


    const userMessage =
        document.createElement("div");

    userMessage.className = "user";

    userMessage.textContent = text;

    messages.appendChild(userMessage);


    const aiMessage =
        document.createElement("div");

    aiMessage.className = "ai";

    aiMessage.innerHTML =
        think(text);

    messages.appendChild(aiMessage);


    input.value = "";

    messages.scrollTop =
        messages.scrollHeight;

    lastResponse =
        aiMessage.innerText;
}


// ---------------- ENTER KEY ----------------

document.addEventListener(
    "DOMContentLoaded",
    function() {

        const input =
            document.getElementById("userInput");

        if (input) {

            input.addEventListener(
                "keydown",
                function(event) {

                    if (event.key === "Enter") {
                        sendMessage();
                    }

                }
            );
        }

        loadTheme();
    }
);


// ---------------- CLEAR CHAT ----------------

function clearChat() {

    const messages =
        document.getElementById("messages");

    messages.innerHTML = `
        <div class="ai">
            Hello! I'm Liminal AI 0.5.
        </div>
    `;
}