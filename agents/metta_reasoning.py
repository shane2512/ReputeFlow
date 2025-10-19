"""
MeTTa Reasoning Module
Advanced AI reasoning using Hyperon's MeTTa language
Integrates symbolic reasoning with agent decision-making
"""

from typing import Dict, List, Any
from config import AgentConfig

class MeTTaReasoner:
    """
    MeTTa-based reasoning engine for intelligent agent decisions
    Uses symbolic AI for complex decision-making
    """
    
    def __init__(self):
        self.enabled = AgentConfig.ENABLE_METTA_REASONING
        self.knowledge_base = self._initialize_knowledge_base()
        
    def _initialize_knowledge_base(self) -> Dict[str, Any]:
        """Initialize MeTTa knowledge base with domain rules"""
        return {
            "job_matching": {
                "rules": [
                    "(if (and (has-skill ?agent ?skill) (requires-skill ?job ?skill)) (match ?agent ?job))",
                    "(if (> (reputation ?agent) 80) (high-quality ?agent))",
                    "(if (and (match ?agent ?job) (high-quality ?agent)) (recommend ?agent ?job))",
                ],
                "facts": []
            },
            "pricing": {
                "rules": [
                    "(if (and (high-demand ?skill) (low-supply ?skill)) (increase-price ?skill))",
                    "(if (> (reputation ?agent) 90) (premium-rate ?agent))",
                    "(if (urgent ?job) (apply-urgency-multiplier ?job 1.2))",
                ],
                "facts": []
            },
            "validation": {
                "rules": [
                    "(if (and (> (quality-score ?work) 70) (on-time ?work)) (approve ?work))",
                    "(if (< (quality-score ?work) 50) (reject ?work))",
                    "(if (and (> (quality-score ?work) 50) (< (quality-score ?work) 70)) (request-revision ?work))",
                ],
                "facts": []
            },
            "dispute_resolution": {
                "rules": [
                    "(if (and (provided-evidence ?party) (credible-evidence ?party)) (support ?party))",
                    "(if (> (reputation ?freelancer) (reputation ?client)) (bias-towards freelancer))",
                    "(if (multiple-violations ?party) (penalize ?party))",
                ],
                "facts": []
            }
        }
    
    def reason_about_job_match(self, agent_profile: Dict, job_requirements: Dict) -> Dict[str, Any]:
        """
        Use MeTTa reasoning to determine job-agent match quality
        
        Args:
            agent_profile: Agent's skills, reputation, etc.
            job_requirements: Job's required skills, budget, etc.
        
        Returns:
            Reasoning result with match score and explanation
        """
        if not self.enabled:
            return self._fallback_job_match(agent_profile, job_requirements)
        
        # MeTTa-style symbolic reasoning
        match_score = 0
        reasoning_steps = []
        
        # Rule 1: Skill matching
        agent_skills = set(agent_profile.get("skills", []))
        required_skills = set(job_requirements.get("required_skills", []))
        skill_overlap = agent_skills.intersection(required_skills)
        
        if skill_overlap:
            skill_match_ratio = len(skill_overlap) / len(required_skills) if required_skills else 0
            match_score += skill_match_ratio * 40
            reasoning_steps.append(
                f"(match-skills {len(skill_overlap)}/{len(required_skills)}) -> +{skill_match_ratio * 40:.1f}"
            )
        
        # Rule 2: Reputation threshold
        reputation = agent_profile.get("reputation", 0)
        if reputation > 80:
            match_score += 20
            reasoning_steps.append(f"(high-reputation {reputation}) -> +20")
        elif reputation > 50:
            match_score += 10
            reasoning_steps.append(f"(medium-reputation {reputation}) -> +10")
        
        # Rule 3: Budget compatibility
        agent_rate = agent_profile.get("hourly_rate", 0)
        job_budget = job_requirements.get("budget", 0)
        estimated_hours = job_requirements.get("estimated_hours", 40)
        
        if job_budget >= agent_rate * estimated_hours:
            match_score += 20
            reasoning_steps.append("(budget-compatible) -> +20")
        elif job_budget >= agent_rate * estimated_hours * 0.8:
            match_score += 10
            reasoning_steps.append("(budget-marginal) -> +10")
        
        # Rule 4: Availability
        if agent_profile.get("availability", 0) >= job_requirements.get("urgency", 0):
            match_score += 20
            reasoning_steps.append("(availability-sufficient) -> +20")
        
        return {
            "match_score": min(match_score, 100),
            "recommendation": "strong" if match_score >= 70 else "moderate" if match_score >= 50 else "weak",
            "reasoning": reasoning_steps,
            "confidence": match_score / 100,
            "explanation": self._generate_explanation(match_score, reasoning_steps)
        }
    
    def reason_about_pricing(self, skill: str, market_data: Dict) -> Dict[str, Any]:
        """
        Use MeTTa reasoning to determine optimal pricing
        
        Args:
            skill: The skill to price
            market_data: Market demand, supply, trends
        
        Returns:
            Pricing recommendation with reasoning
        """
        if not self.enabled:
            return self._fallback_pricing(skill, market_data)
        
        base_rate = market_data.get("average_rate", 50)
        reasoning_steps = []
        multiplier = 1.0
        
        # Rule 1: Demand-supply dynamics
        demand = market_data.get("demand", 50)
        supply = market_data.get("supply", 50)
        
        if demand > 80 and supply < 40:
            multiplier *= 1.3
            reasoning_steps.append("(high-demand low-supply) -> *1.3")
        elif demand > 60:
            multiplier *= 1.15
            reasoning_steps.append("(high-demand) -> *1.15")
        
        # Rule 2: Trend analysis
        trend = market_data.get("trend", "stable")
        if trend == "increasing":
            multiplier *= 1.1
            reasoning_steps.append("(increasing-trend) -> *1.1")
        elif trend == "decreasing":
            multiplier *= 0.95
            reasoning_steps.append("(decreasing-trend) -> *0.95")
        
        # Rule 3: Competition level
        competition = market_data.get("competition", "medium")
        if competition == "low":
            multiplier *= 1.2
            reasoning_steps.append("(low-competition) -> *1.2")
        elif competition == "high":
            multiplier *= 0.9
            reasoning_steps.append("(high-competition) -> *0.9")
        
        recommended_rate = base_rate * multiplier
        
        return {
            "recommended_rate": round(recommended_rate, 2),
            "base_rate": base_rate,
            "multiplier": round(multiplier, 2),
            "reasoning": reasoning_steps,
            "confidence": 0.85,
            "explanation": f"Based on market analysis, recommend ${recommended_rate:.2f}/hr (base: ${base_rate}, multiplier: {multiplier:.2f}x)"
        }
    
    def reason_about_validation(self, work_data: Dict) -> Dict[str, Any]:
        """
        Use MeTTa reasoning for work validation decision
        
        Args:
            work_data: Work quality metrics, deadlines, etc.
        
        Returns:
            Validation decision with reasoning
        """
        if not self.enabled:
            return self._fallback_validation(work_data)
        
        quality_score = work_data.get("quality_score", 0)
        on_time = work_data.get("on_time", False)
        completeness = work_data.get("completeness", 0)
        
        reasoning_steps = []
        decision = "pending"
        
        # Rule-based validation
        if quality_score >= 70 and on_time and completeness >= 90:
            decision = "approve"
            reasoning_steps.append("(and (quality>=70) (on-time) (complete>=90)) -> approve")
        elif quality_score < 50:
            decision = "reject"
            reasoning_steps.append("(quality<50) -> reject")
        elif quality_score >= 50 and quality_score < 70:
            decision = "request_revision"
            reasoning_steps.append("(50<=quality<70) -> request-revision")
        else:
            decision = "manual_review"
            reasoning_steps.append("(edge-case) -> manual-review")
        
        return {
            "decision": decision,
            "quality_score": quality_score,
            "reasoning": reasoning_steps,
            "confidence": 0.9 if decision in ["approve", "reject"] else 0.6,
            "explanation": self._generate_validation_explanation(decision, quality_score)
        }
    
    def reason_about_dispute(self, dispute_data: Dict) -> Dict[str, Any]:
        """
        Use MeTTa reasoning for dispute resolution
        
        Args:
            dispute_data: Evidence, party reputations, history
        
        Returns:
            Dispute resolution recommendation
        """
        if not self.enabled:
            return self._fallback_dispute(dispute_data)
        
        freelancer_rep = dispute_data.get("freelancer_reputation", 50)
        client_rep = dispute_data.get("client_reputation", 50)
        evidence_quality = dispute_data.get("evidence_quality", 50)
        
        reasoning_steps = []
        vote = "neutral"
        confidence = 0.5
        
        # Evidence-based reasoning
        if evidence_quality >= 80:
            if dispute_data.get("evidence_favors") == "freelancer":
                vote = "freelancer"
                confidence = 0.85
                reasoning_steps.append("(strong-evidence freelancer) -> vote-freelancer")
            elif dispute_data.get("evidence_favors") == "client":
                vote = "client"
                confidence = 0.85
                reasoning_steps.append("(strong-evidence client) -> vote-client")
        
        # Reputation-based tie-breaking
        if vote == "neutral":
            if freelancer_rep > client_rep + 20:
                vote = "freelancer"
                confidence = 0.65
                reasoning_steps.append("(reputation-advantage freelancer) -> vote-freelancer")
            elif client_rep > freelancer_rep + 20:
                vote = "client"
                confidence = 0.65
                reasoning_steps.append("(reputation-advantage client) -> vote-client")
        
        return {
            "vote": vote,
            "confidence": confidence,
            "reasoning": reasoning_steps,
            "explanation": f"Vote: {vote} (confidence: {confidence:.0%})"
        }
    
    def _fallback_job_match(self, agent_profile: Dict, job_requirements: Dict) -> Dict:
        """Simple fallback when MeTTa is disabled"""
        return {"match_score": 50, "recommendation": "moderate", "reasoning": ["fallback-mode"], "confidence": 0.5}
    
    def _fallback_pricing(self, skill: str, market_data: Dict) -> Dict:
        """Simple fallback pricing"""
        return {"recommended_rate": market_data.get("average_rate", 50), "confidence": 0.5}
    
    def _fallback_validation(self, work_data: Dict) -> Dict:
        """Simple fallback validation"""
        return {"decision": "manual_review", "confidence": 0.3}
    
    def _fallback_dispute(self, dispute_data: Dict) -> Dict:
        """Simple fallback dispute"""
        return {"vote": "neutral", "confidence": 0.3}
    
    def _generate_explanation(self, score: float, steps: List[str]) -> str:
        """Generate human-readable explanation"""
        if score >= 70:
            return f"Strong match ({score:.0f}/100). " + " → ".join(steps)
        elif score >= 50:
            return f"Moderate match ({score:.0f}/100). " + " → ".join(steps)
        else:
            return f"Weak match ({score:.0f}/100). " + " → ".join(steps)
    
    def _generate_validation_explanation(self, decision: str, score: float) -> str:
        """Generate validation explanation"""
        explanations = {
            "approve": f"Work approved. Quality score {score}/100 meets standards.",
            "reject": f"Work rejected. Quality score {score}/100 below minimum threshold.",
            "request_revision": f"Revision requested. Quality score {score}/100 needs improvement.",
            "manual_review": "Edge case detected. Manual review recommended."
        }
        return explanations.get(decision, "Unknown decision")


# Global reasoner instance
metta_reasoner = MeTTaReasoner()
