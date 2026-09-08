const fs = require('fs');

const appLines = fs.readFileSync('C:/chat-anonimo/public/app.js', 'utf8').split('\n');

const audioCalls = [];
appLines.forEach((line, idx) => {
    if (line.includes('.play()') || line.includes('Audio(') || line.includes('MediaRecorder') || line.includes('getUserMedia')) {
        audioCalls.push(`Line ${idx + 1}: ${line.trim()}`);
    }
});

fs.writeFileSync('C:/chat-anonimo/audio_media_report.txt', audioCalls.join('\n'), 'utf8');
