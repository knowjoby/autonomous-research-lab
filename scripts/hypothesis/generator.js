// Hypothesis Generation Engine
const fs = require('fs');
const fetch = require('node-fetch'); // We'll add this via package.json

const CONFIG = JSON.parse(fs.readFileSync('./config/settings.json', 'utf8'));

const HYPOTHESIS_PROMPT = `
You are a research scientist. Based on the provided sources, identify ONE significant research opportunity.

SOURCES: {{sources}}

TASK:
Generate a formal research hypothesis that:
1. Addresses a gap, contradiction, or anomaly in the sources
2. Is testable with publicly available information
3. Would be valuable to the research community

OUTPUT IN THIS EXACT JSON FORMAT:
{
  "title": "Clear hypothesis title",
  "null_hypothesis": "What would disprove this",
  "alternative_hypothesis": "What we're testing",
  "significance": "Why this matters",
  "predictions": [
    "If true, we should see X",
    "If true, we should see Y",
    "If true, we should see Z"
  ],
  "search_terms": ["key", "search", "terms"],
  "evidence_needed": "What kind of evidence would prove this"
}
`;

async function generateHypothesis() {
  console.log('🧪 Generating hypothesis...');
  
  // Get today's sources
  const date = new Date().toISOString().split('T')[0];
  const sourcesPath = `./content/topics/${date}/sources.json`;
  
  if (!fs.existsSync(sourcesPath)) {
    console.log('No sources found. Run discovery first.');
    return;
  }
  
  const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));
  
  // Call LLM via GitHub Models
  const response = await fetch('https://models.github.ai/inference/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CONFIG.llm.primary_model,
      messages: [
        { role: "system", content: "You are a research scientist generating testable hypotheses." },
        { role: "user", content: HYPOTHESIS_PROMPT.replace('{{sources}}', JSON.stringify(sources, null, 2)) }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    })
  });

  const data = await response.json();
  let hypothesis;
  
  try {
    hypothesis = JSON.parse(data.choices[0].message.content);
    hypothesis.id = `HYP-${Date.now()}`;
    hypothesis.generated_at = new Date().toISOString();
    hypothesis.status = 'proposed';
  } catch (e) {
    console.error('Failed to parse LLM response:', e);
    return;
  }
  
  // Save hypothesis
  fs.mkdirSync(`./content/hypotheses/${date}`, { recursive: true });
  fs.writeFileSync(
    `./content/hypotheses/${date}/hypothesis.json`,
    JSON.stringify(hypothesis, null, 2)
  );
  
  console.log(`✅ Hypothesis generated: ${hypothesis.title}`);
  return hypothesis;
}

if (require.main === module) {
  generateHypothesis().catch(console.error);
}

module.exports = { generateHypothesis };