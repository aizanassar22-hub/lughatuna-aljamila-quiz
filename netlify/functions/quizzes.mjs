import { getStore } from "@netlify/blobs";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

const store = getStore({ name: "lughatuna-quizzes", consistency: "strong" });
const DEMO_QUIZ = {
  id: "demo-zawi",
  title: "إعراب كلمة «ذَوِي»",
  description: "سورة البقرة · الآية ١٧٧",
  createdAt: "2026-11-08T00:00:00.000Z",
  questions: [
    {
      prompt: "ما الإعراب الصحيح لكلمة (ذَوِي) في قوله تعالى:",
      verse: "﴿وَآتَى الْمَالَ عَلَىٰ حُبِّهِ ذَوِي الْقُرْبَىٰ﴾",
      reference: "البقرة: ١٧٧",
      options: [
        "بدل من (الْمَالِ) منصوب وعلامة نصبه الياء لأنه ملحق بجمع المذكر السالم.",
        "نعت مجرور وعلامة جره الياء لأنه ملحق بجمع المذكر السالم.",
        "مفعول به ثانٍ منصوب وعلامة نصبه الياء لأنه ملحق بجمع المذكر السالم وهو مضاف.",
        "مفعول به أول منصوب وعلامة نصبه الفتحة المقدرة على الياء."
      ],
      correctIndex: 2,
      explanation: "«ذَوِي» مفعول به ثانٍ منصوب، وعلامة نصبه الياء لأنه ملحق بجمع المذكر السالم، وهو مضاف."
    }
  ]
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

const ADMIN_KEY_SHA256 = "c1348cf09758621bba91be2433554179066edc989b59767ce7a7cc51c02ac87a";

function safeEqual(candidate, expectedHex) {
  if (typeof candidate !== "string" || !candidate || typeof expectedHex !== "string") return false;
  if (!/^[a-f0-9]{64}$/i.test(expectedHex)) return false;
  const candidateHash = createHash("sha256").update(candidate).digest();
  const expectedHash = Buffer.from(expectedHex, "hex");
  return timingSafeEqual(candidateHash, expectedHash);
}

function publicQuiz(quiz) {
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description || "",
    category: quiz.category || "general",
    createdAt: quiz.createdAt,
    questionCount: quiz.questions.length,
    questions: quiz.questions.map((q) => ({
      prompt: q.prompt,
      verse: q.verse || "",
      reference: q.reference || "",
      options: q.options
    }))
  };
}

function validateQuiz(input) {
  if (!input || typeof input !== "object") return "بيانات الكويز غير صحيحة.";
  if (typeof input.title !== "string" || !input.title.trim() || input.title.length > 140) return "اكتب عنوانًا للكويز (بحد أقصى ١٤٠ حرفًا).";
  if (!Array.isArray(input.questions) || input.questions.length < 1 || input.questions.length > 30) return "أضف سؤالًا واحدًا على الأقل، وبحد أقصى ٣٠ سؤالًا.";
  for (let i = 0; i < input.questions.length; i++) {
    const q = input.questions[i];
    if (!q || typeof q.prompt !== "string" || !q.prompt.trim() || q.prompt.length > 2000) return `نص السؤال رقم ${i + 1} مطلوب.`;
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 5) return `السؤال رقم ${i + 1}: يجب أن يحتوي على خيارين إلى خمسة خيارات.`;
    if (q.options.some((o) => typeof o !== "string" || !o.trim() || o.length > 1000)) return `السؤال رقم ${i + 1}: تأكد من كتابة جميع الخيارات.`;
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.options.length) return `حدد الإجابة الصحيحة للسؤال رقم ${i + 1}.`;
  }
  return null;
}

export default async (request) => {
  const url = new URL(request.url);
  try {
    if (request.method === "GET") {
      const id = url.searchParams.get("id");
      if (id) {
        const quiz = id === DEMO_QUIZ.id ? DEMO_QUIZ : await store.get(`quiz/${id}`, { type: "json" });
        if (!quiz) return json({ error: "لم نعثر على هذا الكويز." }, 404);
        return json(publicQuiz(quiz));
      }
      const { blobs } = await store.list({ prefix: "quiz/" });
      const saved = await Promise.all(blobs.map((blob) => store.get(blob.key, { type: "json" })));
      const quizzes = [DEMO_QUIZ, ...saved.filter(Boolean)].map((quiz) => ({
        id: quiz.id,
        title: quiz.title,
        description: quiz.description || "",
        category: quiz.category || "general",
        createdAt: quiz.createdAt,
        questionCount: quiz.questions.length
      }));
      quizzes.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      return json({ quizzes });
    }

    if (request.method === "POST") {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object") return json({ error: "تعذّرت قراءة البيانات المرسلة." }, 400);

      if (body.action === "create") {
        if (!safeEqual(request.headers.get("x-admin-key"), ADMIN_KEY_SHA256)) return json({ error: "مفتاح الإدارة غير صحيح." }, 401);
        const validationError = validateQuiz(body.quiz);
        if (validationError) return json({ error: validationError }, 400);
        const quiz = {
          id: randomUUID().replaceAll("-", "").slice(0, 12),
          title: body.quiz.title.trim(),
          description: typeof body.quiz.description === "string" ? body.quiz.description.trim().slice(0, 300) : "",
          category: ["grammar", "quran", "general"].includes(body.quiz.category) ? body.quiz.category : "general",
          createdAt: new Date().toISOString(),
          questions: body.quiz.questions.map((q) => ({
            prompt: q.prompt.trim(),
            verse: typeof q.verse === "string" ? q.verse.trim().slice(0, 1500) : "",
            reference: typeof q.reference === "string" ? q.reference.trim().slice(0, 100) : "",
            options: q.options.map((o) => o.trim()),
            correctIndex: q.correctIndex,
            explanation: typeof q.explanation === "string" ? q.explanation.trim().slice(0, 1500) : ""
          }))
        };
        await store.setJSON(`quiz/${quiz.id}`, quiz, { onlyIfNew: true });
        return json({ ok: true, quiz: { ...publicQuiz(quiz), url: `/quiz.html?id=${quiz.id}` } }, 201);
      }

      if (body.action === "submit") {
        if (typeof body.id !== "string" || !Array.isArray(body.answers)) return json({ error: "بيانات الإجابة غير مكتملة." }, 400);
        const quiz = body.id === DEMO_QUIZ.id ? DEMO_QUIZ : await store.get(`quiz/${body.id}`, { type: "json" });
        if (!quiz) return json({ error: "لم نعثر على هذا الكويز." }, 404);
        if (body.answers.length !== quiz.questions.length) return json({ error: "عدد الإجابات لا يطابق عدد الأسئلة." }, 400);
        let score = 0;
        const results = quiz.questions.map((q, i) => {
          const selectedIndex = body.answers[i];
          const isCorrect = Number.isInteger(selectedIndex) && selectedIndex === q.correctIndex;
          if (isCorrect) score++;
          return {
            selectedIndex: Number.isInteger(selectedIndex) ? selectedIndex : null,
            correctIndex: q.correctIndex,
            isCorrect,
            explanation: q.explanation || ""
          };
        });
        return json({ score, total: quiz.questions.length, percentage: Math.round((score / quiz.questions.length) * 100), results });
      }
      return json({ error: "نوع العملية غير معروف." }, 400);
    }
    return json({ error: "طريقة الطلب غير مدعومة." }, 405);
  } catch (error) {
    console.error("Quiz API error:", error);
    return json({ error: "حدث خطأ أثناء معالجة الطلب. حاول مرة أخرى." }, 500);
  }
};

export const config = { path: "/api/quizzes", method: ["GET", "POST"] };
