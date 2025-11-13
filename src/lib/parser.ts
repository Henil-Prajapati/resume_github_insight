const GITHUB_REGEX =
  /https?:\/\/(?:www\.)?github\.com\/[^\s)]+/gi;
const EMAIL_REGEX =
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_REGEX =
  /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?)?\d{3}[\s-]?\d{4}/g;

const SUMMARY_KEYWORDS = [
  "experience",
  "developed",
  "engineer",
  "project",
  "designed",
  "built",
  "led",
  "collaborated",
  "improved",
  "delivered",
  "managed",
  "optimized",
  "implemented",
  "created",
  "modernized",
  "launched",
];

export type ParsedResume = {
  name: string | null;
  headline: string | null;
  githubUrl: string | null;
  githubUsername: string | null;
  emails: string[];
  phones: string[];
  skills: string[];
  summary: string[];
  rawText: string;
};

function cleanText(text: string): string {
  return text.replace(/\r/g, "\n").replace(/\n{2,}/g, "\n\n").trim();
}

function extractName(lines: string[]): string | null {
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.length > 60) continue;
    if (/\d/.test(trimmed)) continue;
    if (trimmed.toLowerCase().includes("curriculum vitae")) continue;
    if (trimmed.split(" ").length <= 5) {
      return trimmed;
    }
  }
  return null;
}

function extractHeadline(lines: string[], name: string | null): string | null {
  if (!name) return null;
  const nameIndex = lines.findIndex(
    (line) => line.trim().toLowerCase() === name.toLowerCase(),
  );
  if (nameIndex >= 0 && nameIndex + 1 < lines.length) {
    const nextLine = lines[nameIndex + 1]?.trim();
    if (nextLine && nextLine.length <= 80) {
      return nextLine;
    }
  }
  return null;
}

function extractSkills(text: string): string[] {
  const skillsSectionMatch = text.match(
    /(skills|technical skills|toolbox|technologies)\s*: ?([\s\S]+?)(?:\n\n|experience|projects|education)/i,
  );
  if (!skillsSectionMatch) return [];

  const [, , sectionBody] = skillsSectionMatch;
  return sectionBody
    .split(/[,\u2022\n]/u)
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 1)
    .slice(0, 15);
}

function tokenizeSentences(text: string): string[] {
  const sentences = text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0 && sentence.length <= 300);
  return [...new Set(sentences)];
}

function scoreSentence(sentence: string): number {
  let score = 0;
  const lower = sentence.toLowerCase();
  for (const keyword of SUMMARY_KEYWORDS) {
    if (lower.includes(keyword)) score += 2;
  }
  const lengthScore = Math.min(sentence.length / 10, 10);
  score += lengthScore;
  if (/[\u2022*-]/u.test(sentence)) score += 1;
  if (sentence.includes("%") || sentence.match(/\d+/)) score += 1;
  return score;
}

function buildSummary(sentences: string[]): string[] {
  if (!sentences.length) return [];

  const scored = sentences
    .map((sentence) => ({ sentence, score: scoreSentence(sentence) }))
    .sort((a, b) => b.score - a.score);

  const topSentences = scored.slice(0, 4).map((item) => item.sentence);

  if (!topSentences.length) {
    return sentences.slice(0, 3);
  }

  return topSentences;
}

export function parseResumeText(text: string): ParsedResume {
  const cleaned = cleanText(text);
  const lines = cleaned.split("\n");

  const name = extractName(lines);
  const headline = extractHeadline(lines, name);

  const emails = Array.from(new Set(cleaned.match(EMAIL_REGEX) ?? [])).map(
    (email) => email.toLowerCase(),
  );

  const phones =
    cleaned
      .match(PHONE_REGEX)
      ?.map((phone) => phone.replace(/\s+/g, " ").trim())
      .filter((phone) => phone.replace(/\D/g, "").length >= 10) ?? [];

  const githubMatches = cleaned.match(GITHUB_REGEX) ?? [];
  const firstMatch = githubMatches.length > 0 ? githubMatches[0] : null;
  const rawGithubUrl = firstMatch ? firstMatch.replace(/[\s,.;)]*$/, "") : null;

  let githubUsername: string | null = null;
  if (rawGithubUrl) {
    const match = rawGithubUrl
      .replace(/https?:\/\//, "")
      .replace(/www\./, "")
      .match(/^github\.com\/([^\/\s]+)/i);
    githubUsername = match?.[1] ?? null;
  }

  const githubUrl =
    githubUsername !== null
      ? `https://github.com/${githubUsername}`
      : rawGithubUrl;

  const skills = extractSkills(cleaned);
  const sentences = tokenizeSentences(cleaned);
  const summary = buildSummary(sentences);

  return {
    name,
    headline,
    githubUrl,
    githubUsername,
    emails,
    phones,
    skills,
    summary,
    rawText: cleaned,
  };
}
