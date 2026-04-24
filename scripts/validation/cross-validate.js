// Cross-Validation Engine
const fs = require('fs');
const fetch = require('node-fetch');

const CONFIG = JSON.parse(fs.readFileSync('./config/settings.json', 'utf8'));

const VALIDATION_PROMPT = `You are a critical research validator.

HYPOTHESIS: {{hypothesis}}
EVIDENCE: {{evidence}}

Evaluate this hypothesis against the evidence. Output ONLY valid JSON:
{
  "verdict": "supported|refuted|inconclusive",
  "confidence": 0.0,
  "reasoning": "brief explanation",
  "gaps": ["missing evidence type 1", "missing evidence type 2"],
  "strength_score": 0.0
}`;

async function crossValidate() {
  console.log('🔍 Cross-validating hypothesis...');

  const date = new Date().toISOString().split('T')[0];
  const hypPath = `./content/hypotheses/${date}/hypothesis.json`;
  const evidencePath = `./content/evidence/${date}/evidence.json`;

  if (!fs.existsSync(hypPath)) {
    console.log('No hypothesis found. Skipping validation.');
    return;
  }

  const hypothesis = JSON.parse(fs.readFileSync(hypPath, 'utf8'));
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
        { role: 'system', content: 'You are a scientific peer reviewer. Output only valid JSON.' },
        {
          role: 'user',
          content: VALIDATION_PROMPT
            .replace('{{hypothesis}}', JSON.stringify(hypothesis, null, 2))
            .replace('{{evidence}}', JSON.stringify(evidence, null, 2))
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    console.error(`Validation API error: ${response.status}`);
    return;
  }

  const data = await response.json();
  let validation;

  try {
    validation = JSON.parse(data.choices[0].message.content);
    validation.hypothesis_id = hypothesis.id;
    validation.validated_at = new Date().toISOString();
  } catch (e) {
    console.error('Failed to parse validation response:', e);
    return;
  }

  fs.mkdirSync(`./content/validation/${date}`, { recursive: true });
  fs.writeFileSync(
    `./content/validation/${date}/validation.json`,
    JSON.stringify(validation, null, 2)
  );

  console.log(`✅ Validation complete: ${validation.verdict} (confidence: ${validation.confidence})`);
  return validation;
}

if (require.main === module) {
  crossValidate().catch(console.error);
}

module.exports = { crossValidate };
