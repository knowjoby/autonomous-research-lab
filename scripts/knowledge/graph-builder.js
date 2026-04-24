// Knowledge Graph Builder
const fs = require('fs');

const GRAPH_FILE = './content/knowledge-graph.json';

function loadGraph() {
  if (fs.existsSync(GRAPH_FILE)) {
    return JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'));
  }
  return { nodes: [], edges: [], updated_at: null };
}

function saveGraph(graph) {
  graph.updated_at = new Date().toISOString();
  fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2));
}

function buildGraph() {
  console.log('🕸️  Building knowledge graph...');

  const date = new Date().toISOString().split('T')[0];
  const reportPath = `./content/reports/${date}/report.json`;
  const hypPath = `./content/hypotheses/${date}/hypothesis.json`;

  if (!fs.existsSync(hypPath)) {
    console.log('No hypothesis found. Skipping graph build.');
    return;
  }

  const graph = loadGraph();
  const hypothesis = JSON.parse(fs.readFileSync(hypPath, 'utf8'));
  const report = fs.existsSync(reportPath)
    ? JSON.parse(fs.readFileSync(reportPath, 'utf8'))
    : null;

  const nodeExists = graph.nodes.find(n => n.id === hypothesis.id);
  if (!nodeExists) {
    graph.nodes.push({
      id: hypothesis.id,
      type: 'hypothesis',
      title: hypothesis.title,
      date,
      status: report?.status || hypothesis.status || 'proposed',
      confidence: report?.confidence || 0,
    });

    (hypothesis.search_terms || []).forEach(term => {
      const termId = `term:${term}`;
      if (!graph.nodes.find(n => n.id === termId)) {
        graph.nodes.push({ id: termId, type: 'concept', label: term });
      }
      graph.edges.push({ source: hypothesis.id, target: termId, relation: 'about' });
    });

    const prevHyps = graph.nodes.filter(n => n.type === 'hypothesis' && n.id !== hypothesis.id);
    if (prevHyps.length > 0) {
      const latest = prevHyps[prevHyps.length - 1];
      graph.edges.push({ source: hypothesis.id, target: latest.id, relation: 'follows' });
    }
  }

  saveGraph(graph);
  console.log(`✅ Knowledge graph updated: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
  return graph;
}

if (require.main === module) {
  buildGraph();
}

module.exports = { buildGraph };
