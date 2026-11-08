# Lughatuna Aljamila Quiz — لغتنا الجميلة

Arabic RTL quiz platform for grammar and Quranic parsing exercises.

## Current functionality
- Create quizzes from the home page using an admin key.
- Add multiple questions, 2–5 answer options, choose the correct answer, and add explanations.
- Store quizzes centrally using Netlify Blobs.
- Share a unique URL; students can answer without an account.
- Check answers on the server and show scores/explanations after submission.
- Responsive interface using Tajawal and Amiri.

## Required Netlify environment variable
Before creating quizzes, add a **secret** environment variable named `QUIZ_ADMIN_KEY` in Netlify, scoped to **Functions** (or All scopes), for **Production**. Choose a long private value. Enter the same value in the admin form when creating a quiz. Never put this value in GitHub or share it with students.

After adding or changing the variable, trigger a new production deploy so the function receives it.

## Deployment
- Publish directory: `public`
- Functions directory: `netlify/functions`
- Build command: leave empty
- Base directory: leave empty

Netlify installs `@netlify/blobs` from `package.json`.

## Notes
The demo quiz is available at `/quiz.html?id=demo-zawi`. Newly created quizzes receive unique URLs. This version supports single-answer scoring. The admin secret is checked by the server and must not be included in client code or public commits.
