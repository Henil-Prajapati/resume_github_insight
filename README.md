## AI Resume Insights

AI Resume Insights is a lightweight Next.js application that extracts key details from a resume, including the candidate's GitHub profile and a concise summary of their experience.

### Features
- Upload PDF or plain text resumes (up to 5 MB)
- Automatically detect GitHub profile links, emails, and phone numbers
- Generate a brief AI-assisted summary from resume content
- Highlight a skills snapshot when a skills section is detected
- Pull live GitHub analytics (followers, language usage, highlighted repositories) when a GitHub URL is present in the resume

### Getting Started
Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

### Usage
1. Click **Browse files** and upload a resume (`.pdf` or `.txt`).
2. Wait a moment while the server extracts the text.
3. View the detected GitHub URL, contact details, skills, summary, and GitHub analytics on the results panel.

### Notes
- The parsing logic is heuristic-based. Cleanly formatted resumes produce the best summaries.
- For improved accuracy with other formats (e.g., DOCX), convert the resume to PDF or text before uploading.
- GitHub analytics rely on the public GitHub API (unauthenticated); rate limits apply (60 requests/hour).

### Tech Stack
- Next.js 14 (App Router)
- React + TypeScript
- Tailwind CSS for UI styling
- `pdf-parse` for server-side text extraction

### Scripts
- `npm run dev` - start the development server
- `npm run lint` - lint the project with ESLint
- `npm run build` - build the production bundle
- `npm run start` - serve the production build
