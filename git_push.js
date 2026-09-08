const { execSync } = require('child_process');

try {
    process.chdir('C:/chat-anonimo');
    
    console.log('Adding files...');
    execSync('"C:/Program Files/Git/cmd/git.exe" add -A', { stdio: 'inherit' });
    
    console.log('Committing...');
    execSync('"C:/Program Files/Git/cmd/git.exe" commit -m "feat: v4.0 Master - banner oficial, auditoria de botoes e estabilizacao anti-crash"', { stdio: 'inherit' });
    
    console.log('Pushing to origin...');
    execSync('"C:/Program Files/Git/cmd/git.exe" push origin main', { stdio: 'inherit' });
    
    console.log('--- GIT OPERATION COMPLETE ---');
} catch (e) {
    console.error('Git error:', e.message);
}
