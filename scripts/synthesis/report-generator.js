// Research Report Synthesis Engine
const fs = require('fs');
const fetch = require('node-fetch');

const CONFIG = JSON.parse(fs.readFileSync('./config/settings.json', 'utf8'));

const SYNTHESIS_PROMPT = `You are a research report writer.

HYPOTHESIS: {{hypothesis}}
VALIDATION: {{validation}}
EVIDENCE: {{evidence}}

Write a concise research summary. Output ONLY valid JSON:
{
  "title": "report title",
  "abstract": "2-3 sentence summary",
  "key_findings": ["finding 1", "finding 2", "finding 3"],
  "conclusion": "one paragraph conclusion",
  "future_work": ["suggestion 1", "suggestion 2"],
  "confidence": 0.0
}`;

async function generateReport() {
  console.log('📝 Synthesizing research report...');

  const date = new Date().toISOString().split('T')[0];
  const hypPath = `./content/hypotheses/${date}/hypothesis.json`;
  const validationPath = `./content/validation/${date}/validation.json`;
  const evidencePath = `./content/evidence/${date}/evidence.json`;

  if (!fs.existsSync(hypPath)) {
    console.log('No hypothesis found. Skipping synthesis.');
    return;
  }

  const hypothesis = JSON.parse(fs.readFileSync(hypPath, 'utf8'));
  const validation = fs.existsSync(validationPath)
    ? JSON.parse(fs.readFileSync(validationPath, 'utf8'))
    : { verdict: 'inconclusive', confidence: 0 };
  const evidence = fs.existsSync(evidencePath)
    ? JSON.parse(fs.readFileSync(evidencePath, 'utf8'))
    : { sources: {} };

  const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CONFIG.llm.primary_model,
      messages: [
        { role: 'system', content: 'You are a research report writer. Output only valid JSON.' },
        {
          role: 'user',
          content: SYNTHESIS_PROMPT
            .replace('{{hypothesis}}', JSON.stringify(hypothesis, null, 2))
            .replace('{{validation}}', JSON.stringify(validation, null, 2))
            .replace('{{evidence}}', JSON.stringify(evidence.sources || {}, null, 2))
        }
      ],
      temperature: 0.5,
      max_tokens: 800,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    console.error(`Synthesis API error: ${response.status}`);
    return;
  }

  const data = await response.json();
  let report;

  try {
    report = JSON.parse(data.choices[0].message.content);
    report.id = hypothesis.id;
    report.date = date;
    report.generated_at = new Date().toISOString();
    report.status = validation.verdict || 'inconclusive';
    report.evidence_count = (evidence.sources?.github?.length || 0) + (evidence.sources?.web?.length || 0);
  } catch (e) {
    console.error('Failed to parse synthesis response:', e);
    return;
  }

  fs.mkdirSync(`./content/reports/${date}`, { recursive: true });
  fs.writeFileSync(
    `./content/reports/${date}/report.json`,
    JSON.stringify(report, null, 2)
  );

  console.log(`✅ Report synthesized: ${report.title}`);
  return report;
}

if (require.main === module) {
  generateReport().catch(console.error);
}

module.exports = { generateReport };
