// Evidence Collection Engine
const fs = require('fs');
const https = require('https');

async function searchGithub(searchTerms) {
  // Search GitHub for relevant repositories
  const query = searchTerms.join('+');
  const url = `https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc`;
  
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Research-Bot',
        'Authorization': `token ${process.env.GITHUB_TOKEN}`
      }
    }, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.items?.slice(0, 5).map(item => ({
            title: item.full_name,
            url: item.html_url,
            description: item.description,
            stars: item.stargazers_count,
            type: 'github'
          })) || []);
        } catch (e) {
          resolve([]);
        }
      });
    });
  });
}

async function searchWeb(searchTerms) {
  // Simulate web search - in production, use actual search APIs
  // For now, we'll return an empty array
  return [];
}

async function collectEvidence() {
  console.log('📚 Collecting evidence...');
  
  // Get today's hypothesis
  const date = new Date().toISOString().split('T')[0];
  const hypPath = `./content/hypotheses/${date}/hypothesis.json`;
  
  if (!fs.existsSync(hypPath)) {
    console.log('No hypothesis found. Run hypothesis generation first.');
    return;
  }
  
  const hypothesis = JSON.parse(fs.readFileSync(hypPath, 'utf8'));
  
  // Collect from multiple sources
  const [github, web] = await Promise.all([
    searchGithub(hypothesis.search_terms || []),
    searchWeb(hypothesis.search_terms || [])
  ]);
  
  const evidence = {
    hypothesis_id: hypothesis.id,
    collected_at: new Date().toISOString(),
    sources: {
      github,
      web
    },
    summary: {
      total: github.length + web.length,
      github: github.length,
      web: web.length
    }
  };
  
  // Save evidence
  fs.mkdirSync(`./content/evidence/${date}`, { recursive: true });
  fs.writeFileSync(
    `./content/evidence/${date}/evidence.json`,
    JSON.stringify(evidence, null, 2)
  );
  
  console.log(`✅ Collected ${evidence.summary.total} sources`);
  return evidence;
}

if (require.main === module) {
  collectEvidence().catch(console.error);
}

module.exports = { collectEvidence };