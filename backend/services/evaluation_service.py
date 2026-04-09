from sqlalchemy.orm import Session
from models.models import Feedback


def get_evaluation_metrics(db: Session) -> dict:
    all_feedback = db.query(Feedback).all()
    total = len(all_feedback)

    if total == 0:
        return {
            "total_feedback": 0,
            "pct_summary_helpful": 0.0,
            "pct_relevance_correct": 0.0,
            "pct_tags_correct": 0.0,
            "pct_action_items_useful": 0.0,
        }

    helpful = sum(1 for f in all_feedback if f.summary_helpful is True)
    rel_correct = sum(1 for f in all_feedback if f.relevance_feedback == "correct")
    tags_ok = sum(1 for f in all_feedback if f.tags_correct is True)
    actions_ok = sum(1 for f in all_feedback if f.action_items_useful is True)

    return {
        "total_feedback": total,
        "pct_summary_helpful": round(helpful / total * 100, 1),
        "pct_relevance_correct": round(rel_correct / total * 100, 1),
        "pct_tags_correct": round(tags_ok / total * 100, 1),
        "pct_action_items_useful": round(actions_ok / total * 100, 1),
    }
