// Autonomous Research Discovery Engine
const fs = require('fs');
const https = require('https');

// Configuration
let CONFIG;
try {
  CONFIG = JSON.parse(fs.readFileSync('./config/settings.json', 'utf8'));
  if (!CONFIG.sources || !CONFIG.sources.arxiv || !CONFIG.sources.hackernews) {
    throw new Error('Missing required config fields: sources.arxiv or sources.hackernews');
  }
} catch (e) {
  console.error('Config validation error:', e.message);
  process.exit(1);
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  console.error('Error: GITHUB_TOKEN not set in environment');
  process.exit(1);
}

// Rate limiting
const requestQueue = [];
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100; // ms between requests

async function rateLimitedFetch() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
}

async function fetchArxivPapers() {
  // Fetch recent AI/ML papers from arXiv
  await rateLimitedFetch();
  return new Promise((resolve) => {
    const categories = CONFIG.sources.arxiv.categories.join(',');
    const url = `https://export.arxiv.org/api/query?search_query=cat:${categories}&sortBy=submittedDate&sortOrder=descending&max_results=10`;

    https.get(url, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => resolve(parseArxivXML(data)));
    }).on('error', (err) => {
      console.error('arXiv fetch error:', err.message);
      resolve([]);
    });
  });
}

async function fetchHackerNews() {
  // Fetch top stories from HackerNews
  const topStories = await fetchJSON('https://hacker-news.firebaseio.com/v0/topstories.json');
  if (!topStories) return [];
  const stories = await Promise.all(
    topStories.slice(0, CONFIG.sources.hackernews.max_stories)
      .map(id => fetchJSON(`https://hacker-news.firebaseio.com/v0/item/${id}.json`))
  );
  return stories.filter(s => s && s.url && s.title);
}

async function discoverOpportunities() {
  console.log('🔍 Starting discovery phase...');
  
  // Collect sources
  const [arxiv, hackernews] = await Promise.all([
    fetchArxivPapers(),
    fetchHackerNews()
  ]);
  
  // Prepare context for LLM
  const context = {
    papers: arxiv.map(p => ({
      title: p.title,
      summary: p.summary.substring(0, 500),
      categories: p.categories
    })),
    discussions: hackernews.map(s => ({
      title: s.title,
      url: s.url,
      score: s.score
    }))
  };
  
  // Save raw data
  const date = new Date().toISOString().split('T')[0];
  fs.mkdirSync(`./content/topics/${date}`, { recursive: true });
  fs.writeFileSync(
    `./content/topics/${date}/sources.json`,
    JSON.stringify(context, null, 2)
  );
  
  console.log('✅ Discovery complete. Sources saved.');
}

// Helper functions
async function fetchJSON(url) {
  await rateLimitedFetch();
  return new Promise((resolve) => {
    https.get(url, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
      });
    }).on('error', (err) => {
      console.error('fetchJSON error:', err.message);
      resolve(null);
    });
  });
}

function parseArxivXML(xml) {
  // Simple parser - in production use proper XML parser
  const papers = [];
  const entries = xml.split('<entry>');
  for (let i = 1; i < entries.length; i++) {
    const title = entries[i].match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
    const summary = entries[i].match(/<summary>([\s\S]*?)<\/summary>/)?.[1] || '';
    const categories = entries[i].match(/<category term="(.*?)"/g) || [];
    papers.push({
      title: title.replace(/<!\[CDATA\[|\]\]>/g, ''),
      summary: summary.replace(/<!\[CDATA\[|\]\]>/g, ''),
      categories: categories.map(c => c.match(/term="(.*?)"/)[1])
    });
  }
  return papers;
}

// Run if called directly
if (require.main === module) {
  discoverOpportunities().catch(console.error);
}

module.exports = { discoverOpportunities };