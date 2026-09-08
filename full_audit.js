const fs = require('fs');

const server = fs.readFileSync('C:/chat-anonimo/server.js', 'utf8');
const app = fs.readFileSync('C:/chat-anonimo/public/app.js', 'utf8');
const html = fs.readFileSync('C:/chat-anonimo/public/index.html', 'utf8');
const css = fs.readFileSync('C:/chat-anonimo/public/style.css', 'utf8');

const findings = [];

// 1. Missing DOM IDs in app.js
const getElemMatches = app.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)/g);
const missingIds = new Set();
for (const match of getElemMatches) {
    const id = match[1];
    if (!html.includes(`id="${id}"`) && !html.includes(`id='${id}'`)) {
        // filter out dynamically generated IDs
        if (id !== 'typing-bubble-row' && !id.startsWith('msg_') && !id.startsWith('conv_')) {
            missingIds.add(id);
        }
    }
}
if (missingIds.size > 0) {
    findings.push(`[DOM Bug] Missing DOM elements in index.html referenced by getElementById: ${Array.from(missingIds).join(', ')}`);
}

// 2. Query selector missing IDs
const qsMatches = app.matchAll(/document\.querySelector\(['"]#([^'"]+)['"]\)/g);
const missingQs = new Set();
for (const match of qsMatches) {
    const id = match[1];
    if (!html.includes(`id="${id}"`) && !html.includes(`id='${id}'`)) {
        missingQs.add(id);
    }
}
if (missingQs.size > 0) {
    findings.push(`[DOM Bug] Missing querySelector IDs in index.html: ${Array.from(missingQs).join(', ')}`);
}

// 3. Server fallback bugs (In-memory vs Firebase)
if (server.includes("const convsSnap = await getDocs(collection(db, 'conversations'));") && !server.includes("if (convList.length === 0 && conversations.size > 0)")) {
    findings.push(`[Server Fallback Bug] GET /api/conversations returns empty array when running in stand-alone in-memory mode because getDocs(null) returns size: 0 without throwing.`);
}

if (server.includes("const usersSnap = await getDocs(collection(db, 'users'));") && !server.includes("if (list.length === 0 && users.size > 0)")) {
    findings.push(`[Server Fallback Bug] GET /api/users/list returns empty array in standalone mode when db is null.`);
}

// 4. Persistence bugs in server.js
if (server.includes("/api/messages/vote") && !server.includes("updateDoc(doc(db, 'messages', msg.id)")) {
    findings.push(`[Persistence Bug] /api/messages/vote updates poll votes in memory but does not update Firestore.`);
}

if (server.includes("/api/messages/react") && !server.includes("updateDoc(doc(db, 'messages', msg.id)")) {
    findings.push(`[Persistence Bug] /api/messages/react updates message reactions in memory but does not update Firestore.`);
}

// 5. Audio play without catch
if (app.includes("audio.play()") && !app.includes("audio.play().catch")) {
    findings.push(`[Audio Bug] audio.play() in audio player lacks .catch() handler, causing unhandled promise rejections if autoplay is blocked by browser.`);
}

// 6. Check accent normalization in user handle generation
if (server.includes("replace(/[^a-z0-9_]/g, '')") && !server.includes("normalize('NFD')") && !server.includes('normalize("NFD")')) {
    findings.push(`[UX Bug] Clean handle generation strips accented Portuguese characters incorrectly instead of normalizing them (e.g. 'João' -> 'da_silva' instead of 'joao_da_silva').`);
}

fs.writeFileSync('C:/chat-anonimo/full_audit_results.json', JSON.stringify(findings, null, 2), 'utf8');
