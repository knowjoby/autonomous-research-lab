// Autonomous Research Discovery Engine
const fs = require('fs');
const https = require('https');

// Configuration
const CONFIG = JSON.parse(fs.readFileSync('./config/settings.json', 'utf8'));
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function fetchArxivPapers() {
  // Fetch recent AI/ML papers from arXiv
  return new Promise((resolve) => {
    const categories = CONFIG.sources.arxiv.categories.join(',');
    const url = `http://export.arxiv.org/api/query?search_query=cat:${categories}&sortBy=submittedDate&sortOrder=descending&max_results=10`;
    
    https.get(url, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => resolve(parseArxivXML(data)));
    });
  });
}

async function fetchHackerNews() {
  // Fetch top stories from HackerNews
  const topStories = await fetchJSON('https://hacker-news.firebaseio.com/v0/topstories.json');
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
function fetchJSON(url) {
  return new Promise((resolve) => {
    https.get(url, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => resolve(JSON.parse(data)));
    });
  });
}

function parseArxivXML(xml) {
  // Simple parser - in production use proper XML parser
  const papers = [];
  const entries = xml.split('<entry>');
  for (let i = 1; i < entries.length; i++) {
    const title = entries[i].match(/<title>(.*?)<\/title>/)?.[1] || '';
    const summary = entries[i].match(/<summary>(.*?)<\/summary>/)?.[1] || '';
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