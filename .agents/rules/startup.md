# Startup Scripts Usage Rule

Whenever prompting or instructing the user to run the app or start the project, always explicitly distinguish between:

1. **Regular Development (TSX, TS, Python, UI changes):**
   ```powershell
   .\quick-start.ps1
   ```
   (Bypasses Gradle build, launches backend + Metro + already-installed app in seconds).

2. **Native Android Changes (changes in `android/`, gradle, manifests, or new native npm packages):**
   ```powershell
   .\quick-start.ps1 -Rebuild
   ```
   (Runs full Gradle build and reinstall).
