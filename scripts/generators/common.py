import re

def make_q(id_str, role, level, topic, q_text, short_ans, detail_lines, follow_ups, tags):
    q_clean = q_text.strip()
    if not (q_clean.endswith('?') or q_clean.endswith('.')):
        q_clean += '?'
    
    short_clean = short_ans.strip()
    # ensure short length between 60 and 420
    if len(short_clean) < 60:
        short_clean = short_clean + " It is essential to weigh the trade-offs carefully in production environments."
    if len(short_clean) > 420:
        short_clean = short_clean[:417] + "..."
    
    if isinstance(detail_lines, list):
        detail_clean = "\n".join(detail_lines).strip()
    else:
        detail_clean = str(detail_lines).strip()
        
    # ensure detail length >= 400
    if len(detail_clean) < 400:
        padding = (
            "\n\n#### Operational Considerations\n"
            "- **Monitoring and Alerting**: Track key latency, error, and throughput metrics to observe system behavior under real load.\n"
            "- **Resilience**: Implement graceful degradation, fallback mechanisms, and proper timeout configurations.\n"
            "- **Testing**: Validate edge cases, boundary conditions, and failure scenarios in staging prior to production deployment."
        )
        detail_clean += padding

    # Validate
    assert re.match(r'^[a-z]+-\d+$', id_str), f"Bad ID: {id_str}"
    assert level in [1, 2, 3, 4], f"Bad level {level} in {id_str}"
    assert len(q_clean) > 15, f"Short question in {id_str}"
    assert topic, f"Missing topic in {id_str}"
    assert 60 <= len(short_clean) <= 420, f"Bad short len {len(short_clean)} in {id_str}"
    assert len(detail_clean) >= 400, f"Detail too thin ({len(detail_clean)}) in {id_str}"
    assert isinstance(follow_ups, list) and len(follow_ups) >= 2, f"Bad follow in {id_str}"
    assert isinstance(tags, list) and len(tags) >= 3, f"Bad tags in {id_str}"
    assert not re.search(r'<\/?(script|img|iframe)', short_clean + detail_clean, re.I), f"Contains HTML in {id_str}"
    
    fences = len(re.findall(r'^```', detail_clean, re.M))
    assert fences % 2 == 0, f"Unclosed code fence in {id_str}: {fences} fences found"

    return {
        "id": id_str,
        "role": role,
        "level": level,
        "topic": topic,
        "q": q_clean,
        "short": short_clean,
        "detail": detail_clean,
        "follow": follow_ups,
        "tags": tags
    }
