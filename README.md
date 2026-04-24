# 🤖 Autonomous Research Lab

A self-operating AI research system that continuously discovers research topics, generates hypotheses, validates them with evidence, and publishes findings—all on autopilot via GitHub Actions.

## Overview

This system runs a 7-phase research pipeline every 6 hours:

1. **Discovery** — Scrapes arXiv, Hacker News, GitHub for trending topics
2. **Hypothesis Generation** — Uses GitHub Models API to formulate testable hypotheses
3. **Evidence Collection** — Searches GitHub repos and web for supporting evidence
4. **Validation** — Cross-validates hypotheses against collected evidence
5. **Synthesis** — Generates research reports with findings and recommendations
6. **Knowledge Graph** — Builds a knowledge graph of hypotheses and concepts
7. **Publishing** — Generates static site + deploys to GitHub Pages

No human intervention required. Results update every 6 hours automatically.

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/knowjoby/autonomous-research-lab.git
cd autonomous-research-lab
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and add your GitHub token:

```bash
cp .env.example .env
```

Edit `.env`:
```env
GITHUB_TOKEN=your_github_token_here
```

**Getting a token:**
- Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
- Create a token with `public_repo` + `read:user` scopes
- Paste into `.env`

### 3. Configure Research Parameters

Edit `config/settings.json` to customize:
- **Research sources** (arXiv categories, HN, GitHub topics)
- **LLM models** (currently supports OpenAI models via GitHub Models)
- **Confidence thresholds**
- **Publishing options** (site title, posts per page, RSS, search)

### 4. Deploy to GitHub Actions

Push to GitHub — the workflow runs automatically every 6 hours.

Or trigger manually:
```bash
gh workflow run research.yml
```

## Local Testing

Run the pipeline manually:

```bash
npm run discover      # Phase 1
npm run hypothesize   # Phase 2
npm run collect       # Phase 3
npm run validate      # Phase 4
npm run synthesize    # Phase 5
npm run publish       # Generate site
```

## Architecture

```
scripts/
├── discovery/        → Scrapes sources (arXiv, HN, GitHub)
├── hypothesis/       → LLM-based hypothesis generation
├── evidence/         → Evidence collection & search
├── validation/       → Cross-validation against evidence
├── synthesis/        → Report generation
├── knowledge/        → Knowledge graph building
└── publish/          → Static site generation

content/
├── topics/           → Raw discovered sources
├── hypotheses/       → Generated hypotheses
├── evidence/         → Collected evidence
├── validation/       → Validation results
├── reports/          → Final research reports
├── knowledge-graph.json → Knowledge graph state
└── latest.json       → Latest research for site

site/
└── index.html        → Deployed research journal
```

## Results

- **Research outputs** saved to `content/` (JSON format)
- **Static site** generated in `site/` → deployed to GitHub Pages
- **Knowledge graph** tracks hypothesis evolution over time
- **Latest research** always available at `/site/content/latest.json`

## Configuration

### LLM Models

Supports GitHub Models API:
```json
{
  "llm": {
    "primary_model": "openai/gpt-4o-mini",
    "validation_models": ["openai/gpt-4o-mini", "deepseek/DeepSeek-R1"],
    "max_tokens_per_run": 10000,
    "temperature": 0.7
  }
}
```

Available via GitHub Models:
- `openai/gpt-4o-mini`
- `openai/gpt-4o`
- `meta-llama/Llama-2-7b-chat-hf`
- `deepseek/DeepSeek-R1`
- And others...

### Data Sources

```json
{
  "sources": {
    "arxiv": {
      "enabled": true,
      "categories": ["cs.AI", "cs.LG", "cs.CL"]
    },
    "hackernews": {
      "enabled": true,
      "max_stories": 30
    },
    "github": {
      "enabled": true,
      "topics": ["machine-learning", "ai", "research"]
    }
  }
}
```

## Troubleshooting

### "GITHUB_TOKEN not found"
- Ensure `.env` exists and contains `GITHUB_TOKEN=<your_token>`
- Token must have `public_repo` scope

### "Invalid model"
- Check `config/settings.json` — model name must match GitHub Models API
- Verify token has access to GitHub Models

### "No sources found"
- arXiv/HN APIs may be rate-limited
- Check network connectivity
- Logs available in GitHub Actions run output

### "Knowledge graph not updating"
- Ensure previous phases completed successfully
- Check `content/hypotheses/` for today's hypothesis

## Performance Notes

- **Discovery** — ~10 papers + 30 HN stories per run
- **LLM calls** — ~3 per cycle (hypothesis, validation, synthesis)
- **Rate limits** — GitHub API: 60 req/hr unauthenticated, unlimited with token
- **Runtime** — Typical cycle: 2–5 minutes

## Future Enhancements

- [ ] Multi-hypothesis support (test multiple ideas per cycle)
- [ ] Cross-validate against academic databases (DBLP, PubMed)
- [ ] Automatic paper download + full-text analysis
- [ ] Impact scoring (citations, trending topics)
- [ ] Long-form report generation (PDF export)
- [ ] Collaborative features (shared knowledge graphs)

## License

MIT