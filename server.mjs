import "dotenv/config";
import express from "express";
import OpenAI from "openai";

const app = express();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.json({ limit: "10kb" }));
app.use(express.static("public"));

// Paste your complete existing `faqs` array here.
// Keep each entry's category, question, keywords, answer, url, and source.
const faqs = [
  {
    category: "academics",
    question: "Where can I find tutoring or academic support?",
    keywords: ["tutor", "tutoring", "academic support", "study help", "learning center"],
    answer: "Academic support and tutoring options are organized by campus and course. Check your campus’s official academic support page or contact your academic adviser.",
    url: "https://www.psu.edu/academics",
    source: "Penn State Academics"
  },
  {
    category: "academics",
    question: "Where do I find academic advising?",
    keywords: ["advising", "adviser", "advisor", "degree", "major", "course plan"],
    answer: "For questions about your academic path or degree requirements, contact academic advising through your campus or college.",
    url: "https://www.psu.edu/academics",
    source: "Penn State Academics"
  },
  {
    category: "academics",
    question: "Where can I find registrar information?",
    keywords: ["registrar", "transcript", "enrollment", "academic calendar", "drop a class"],
    answer: "The Office of the University Registrar provides official academic and enrollment information.",
    url: "https://www.registrar.psu.edu/",
    source: "Office of the University Registrar"
  },
  {
    category: "wellbeing",
    question: "Where can I find mental health support?",
    keywords: ["mental health", "counseling", "counselor", "therapy", "stress", "anxiety"],
    answer: "Penn State Student Affairs provides mental health service information. For immediate danger, call 911. For 24/7 crisis support, call 1-877-229-6400 or text LIONS to 741741.",
    url: "https://studentaffairs.psu.edu/health-wellbeing/mental-health-services",
    source: "Penn State mental health services"
  },
  {
    category: "wellbeing",
    question: "Where can I find student health services?",
    keywords: ["health", "doctor", "medical", "clinic", "uhs", "sick"],
    answer: "University Health Services provides health information and services. Check its site for current services and campus details.",
    url: "https://studentaffairs.psu.edu/about/directory/uhs",
    source: "University Health Services"
  },
  {
    category: "campus",
    question: "Where can I find housing and dining information?",
    keywords: ["housing", "dorm", "residence", "dining", "meal plan", "food"],
    answer: "Penn State’s LiveOn site provides university housing and dining information. Details can vary by campus.",
    url: "https://liveon.psu.edu/",
    source: "Penn State LiveOn"
  },
  {
    category: "campus",
    question: "Where can I find library and research help?",
    keywords: ["library", "libraries", "research", "books", "study space"],
    answer: "Penn State Libraries provides library, research, and study resources.",
    url: "https://libraries.psu.edu/",
    source: "Penn State Libraries"
  },
  {
    category: "admin",
    question: "Where can I find financial aid information?",
    keywords: ["financial aid", "student aid", "scholarship", "fafsa", "grants", "loans"],
    answer: "Penn State’s Office of Student Aid provides information about aid and scholarships, including ways to contact campus offices.",
    url: "https://www.psu.edu/costs-aid/contact",
    source: "Contact the Office of Student Aid"
  },
  {
    category: "admin",
    question: "Where can I search Penn State’s official website?",
    keywords: ["search penn state", "website", "contact", "not listed"],
    answer: "Search the official Penn State website or contact the relevant office at your campus.",
    url: "https://www.psu.edu/",
    source: "Penn State"
  }
];
const urgentTerms = [
  "suicide", "kill myself", "hurt myself", "self harm",
  "overdose", "immediate danger", "hurt someone", "sexual assault"
];

app.post("/api/ask", async (req, res) => {
  try {
    const question = req.body?.question?.trim();

    if (!question || question.length > 500) {
      return res.status(400).json({ error: "Enter a question under 500 characters." });
    }

    const normalizedQuestion = question.toLowerCase();

    // Fixed emergency response; don't ask the model to handle this.
    if (urgentTerms.some(term => normalizedQuestion.includes(term))) {
      return res.json({
        answer:
          "This may need urgent help. If anyone is in immediate danger, call 911. " +
          "For 24/7 Penn State crisis support, call 1-877-229-6400 or text LIONS to 741741.",
        source: "Penn State urgent-help information",
        url: "https://studentaffairs.psu.edu/get-urgent-help"
      });
    }

    // Find the best matching FAQ using your existing keyword approach.
    const match = faqs
      .map(item => ({
        item,
        score: item.keywords.reduce(
          (total, keyword) =>
            total + (normalizedQuestion.includes(keyword.toLowerCase()) ? keyword.length : 0),
          0
        )
      }))
      .sort((a, b) => b.score - a.score)[0];

    if (!match || match.score === 0) {
      return res.json({
        answer:
          "I couldn’t find an answer in my prepared Penn State resources. " +
          "Search Penn State’s official website or contact your campus office.",
        source: "Penn State",
        url: "https://www.psu.edu/"
      });
    }

    const faq = match.item;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-6-astra",
      instructions:
        "You answer student questions using only the supplied Penn State FAQ. " +
        "Do not add facts, policies, dates, contact details, or advice not present in it. " +
        "If the FAQ does not answer the question, say so briefly. Keep the response concise.",
      input: JSON.stringify({
        studentQuestion: question,
        officialFaq: {
          question: faq.question,
          answer: faq.answer,
          source: faq.source
        }
      })
    });

    res.json({
      answer: response.output_text || faq.answer,
      source: faq.source,
      url: faq.url
    });
  } catch (error) {
    console.error("Answer request failed:", error.message);
    res.status(500).json({
      error: "Sorry, the guide couldn’t answer right now. Please try again."
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Nittany Guide running at http://localhost:${port}`);
});
