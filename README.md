# Lughatuna Aljamila Quiz — لغتنا الجميلة

Arabic RTL quiz platform for grammar and Quranic parsing exercises.

## Current functionality
- Create quizzes from the home page using an owner-only admin key.
- Add multiple questions, 2–5 answer options, select the correct answer, and add explanations.
- Store quizzes centrally using Netlify Blobs.
- Share a unique URL; students can answer without an account.
- Check answers on the server and show scores and explanations after submission.
- Responsive interface using Tajawal and Amiri.

## Admin key
The admin form asks for a private, randomly generated key. The server stores only its SHA-256 hash in the function source; the original key is not committed to the repository. Keep the key in a password manager and never share it with students. To rotate the key, replace the hash constant `ADMIN_KEY_SHA256` in `netlify/functions/quizzes.mjs` with the SHA-256 hash of your new random key, then commit and deploy.

## Deployment
- Publish directory: `public`
- Functions directory: `netlify/functions`
- Build command: leave empty
- Base directory: leave empty
- Node.js: 24 (see `.nvmrc`)

The quiz API uses `@netlify/blobs` for persistent storage.

## Notes
The original first interface is preserved in Git history. The sample quiz is available at `/quiz.html?id=demo-zawi`. New quizzes receive unique URLs. This version supports single-answer scoring per question.
