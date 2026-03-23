import networkx as nx
import json
import logging
import os
from typing import List, Dict, Any, Optional

class GraphEngine:
    def __init__(self):
        self.logger = logging.getLogger("graph_engine")
        self.graph = nx.DiGraph()

    def build_graph(self, docs: List[Dict[str, Any]]):
        """
        Builds the citation graph from a list of structured documents.
        """
        for doc in docs:
            decision_id = doc['decision_id']
            self.graph.add_node(decision_id, type="decision", year=doc.get('year'))
            
            # Edges: Decision -> Constitution Article
            for article in doc.get('constitution_articles', []):
                self.graph.add_node(article, type="constitution")
                self.graph.add_edge(decision_id, article, relation="references")
                
            # Edges: Decision -> Law Article
            for law in doc.get('law_articles', []):
                self.graph.add_node(law, type="law")
                self.graph.add_edge(decision_id, law, relation="applies")
                
            # Edges: Decision -> Cited Decision
            for cited in doc.get('cited_decisions', []):
                # Note: 'cited' is a string like "E.2014/123 K.2015/456"
                # Ideally we resolve this to a decision_id, but for now we use the string as a node
                self.graph.add_node(cited, type="decision_ref")
                self.graph.add_edge(decision_id, cited, relation="cites")

    def export_metrics(self, filepath: Optional[str] = None) -> Dict[str, Any]:
        metrics = {
            "total_nodes": self.graph.number_of_nodes(),
            "total_edges": self.graph.number_of_edges(),
            "most_cited_decisions": sorted(self.graph.in_degree, key=lambda x: x[1], reverse=True)[:10],
            "most_referenced_articles": [n for n in sorted(self.graph.in_degree, key=lambda x: x[1], reverse=True) if "Madde" in str(n[0])][:10]
        }
        if filepath and (os.getenv("PIPELINE_WRITE_DIAG_FILES", "").lower() == "true"):
            with open(filepath, "w") as f:
                json.dump(metrics, f, indent=2, default=str)
        return metrics

class AuthorityScorer:
    def __init__(self, graph: nx.DiGraph):
        self.graph = graph
        
    def calculate_scores(self, docs: List[Dict[str, Any]]) -> Dict[str, float]:
        scores = {}
        max_citations = 1
        
        # Calculate max citations for normalization
        for node in self.graph.nodes:
            deg = self.graph.in_degree(node)
            if deg > max_citations: max_citations = deg
            
        for doc in docs:
            d_id = doc['decision_id']
            citations = self.graph.in_degree(d_id) if self.graph.has_node(d_id) else 0
            
            # Recency Weight (2025 -> 1.0, 2000 -> 0.0)
            year = doc.get('year', 2000) or 2000
            recency = (year - 2000) / 26.0
            if recency < 0: recency = 0
            
            # Vote Weight
            vote = 1.0 if "Oybirliği" in str(doc.get('vote_type')) else 0.5
            
            # Chamber Weight
            chamber = 1.0 if "Genel Kurul" in str(doc.get('chamber')) else 0.6
            
            # Formula: (C * 0.4) + (R * 0.2) + (V * 0.2) + (Ch * 0.2)
            # Normalize C
            c_norm = citations / max_citations
            
            score = (c_norm * 0.4) + (recency * 0.2) + (vote * 0.2) + (chamber * 0.2)
            scores[d_id] = round(score, 4)
            
        return scores

graph_engine = GraphEngine()
