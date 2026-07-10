# GitHub Guided PR Review Extension

An AI-powered browser extension that transforms standard GitHub Pull Requests into an interactive, step-by-step guided tutorial experience. 

Instead of scrolling through hundreds of lines of diffs, this extension breaks down complex Pull Requests into logical steps, guiding the reviewer through the architectural changes and specific code snippets with interactive overlays.

## Features

- **Step-by-Step Guided Walkthrough**: Navigates through a Pull Request sequentially, explaining the "why" and "how" of the changes.
- **Focus Mode**: Automatically scrolls to the relevant code and dims the rest of the page, spotlighting exactly what you need to review.
- **Interactive Snippet Markers**: Places blue `i` markers in the gutter next to specific lines of code. Hovering reveals detailed explanations for that specific line.
- **Smart DOM Syncing**: Uses ultra-robust alphanumeric fuzzy-matching to accurately anchor AI-generated insights to GitHub's dynamic DOM, ignoring formatting quirks and invisible characters.
- **Powered by Groq**: Uses Llama 3.3 via Groq for blazingly fast inference and step generation.

## Getting Started

1. Clone this repository.
2. Install dependencies:
   ```bash
   pnpm install
   # or
   npm install
   ```
3. Create a `.env.local` file in the root directory and add your Groq API key:
   ```env
   PLASMO_PUBLIC_GROQ_API_KEY=your_groq_api_key_here
   ```
4. Run the development server:
   ```bash
   pnpm dev
   # or
   npm run dev
   ```
5. Load the unpacked extension in Chrome from the `build/chrome-mv3-dev` folder.

## Tech Stack
- **Framework**: [Plasmo](https://docs.plasmo.com/)
- **UI**: React + Vanilla CSS (Injected into GitHub DOM)
- **AI**: Groq API (Llama 3.3)
- **State Management**: Zustand
