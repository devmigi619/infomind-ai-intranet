"""Graph RAG용 그래프 스키마 — Text2Cypher 프롬프트 주입용.

load_to_neo4j.py(ABox) + n10s(TBox) + link_tbox_abox.py(연결)로 구성된
Neo4j 그래프의 구조를 LLM이 이해하도록 자연어 스키마로 기술한다.

핵심:
  - ABox: 실제 데이터 노드(:User, :Vehicle, :LeaveRequest ...)와 관계
  - TBox: 온톨로지 클래스(:owl__Class)와 계층(:rdfs__subClassOf)
  - 둘은 (:인스턴스)-[:RDF_TYPE]->(:owl__Class) 로 연결됨 → 상위 개념 추론 가능
"""

ONTO_PREFIX = "http://www.semanticweb.org/infomind/ontologies/2026/5/untitled-ontology-3#"

# Neo4j(ABox)에 적재 완료된 도메인 intent.
# 이 intent의 '조회(search)'만 Cypher 전용으로 라우팅한다.
# 미적재 도메인(brd/aprv/rpt/schd)과 쓰기(excu)는 기존 SQL 경로를 유지한다.
GRAPH_RAG_INTENTS: set[str] = {"veh", "mtgr", "leave"}

# Text2Cypher 시스템 프롬프트에 주입할 그래프 스키마 설명.
GRAPH_SCHEMA_PROMPT = """\
[Neo4j 그래프 스키마]

■ 노드(인스턴스 = ABox)
- (:User {user_id, user_nm, dept_cd, eml, ...})            직원
- (:Vehicle {veh_id, veh_nm, veh_no})                      차량
- (:MeetingRoom {mtgr_id, mtgr_nm, mtgr_plc})              회의실
- (:VehicleReservation {rsv_key, rsv_st_ymd, rsv_end_ymd}) 차량 예약
- (:MtgrReservation {rsv_key, rsv_st_ymd, rsv_end_ymd})    회의실 예약
- (:LeaveType {leave_cd, leave_nm, paid_yn})               휴가 종류(연차/병가)
- (:LeaveSubType {subtype_key, leave_dtl_nm})              휴가 세부 종류
- (:LeavePolicy {leave_pol_cd, leave_pol_nm})              휴가 정책
- (:LeaveRequest {req_key, leave_rsn, aprv_rslt_se})       휴가 신청
- (:LeaveRequestDay {day_key, leave_use_ymd})              휴가 사용 일자

■ 관계(방향 중요)
- (User)-[:RESERVED]->(VehicleReservation)-[:FOR_VEHICLE]->(Vehicle)
- (User)-[:RESERVED]->(MtgrReservation)-[:FOR_ROOM]->(MeetingRoom)
- (User)-[:REQUESTED]->(LeaveRequest)-[:OF_TYPE]->(LeaveType)
- (LeaveRequest)-[:OF_SUBTYPE]->(LeaveSubType)-[:OF_TYPE]->(LeaveType)
- (LeaveRequest)-[:HAS_DAY]->(LeaveRequestDay)
- (User)-[:APPROVED {aprv_ord, aprv_se, aprv_ymd}]->(LeaveRequest)   결재선
- (User)-[:REFERENCED {qry_yn}]->(LeaveRequest)                       참조자

■ 온톨로지 추론(TBox) — 상위 개념으로 질의할 때만 사용
- 각 인스턴스는 (i)-[:RDF_TYPE]->(:owl__Class) 로 클래스에 연결됨.
- 클래스는 (:owl__Class)-[:rdfs__subClassOf]->(:owl__Class) 로 계층 구성.
- 도메인 상위 클래스: Organization(User 등), Facility(Vehicle/MeetingRoom/예약),
  Leave(LeaveType/LeaveRequest 등).
- "시설 관련 전체", "휴가 도메인 전체"처럼 상위 개념 질의 시:
    MATCH (sub:owl__Class)-[:rdfs__subClassOf*0..]->(top:owl__Class)
    WHERE top.uri = '%sFacility'
    MATCH (inst)-[:RDF_TYPE]->(sub) RETURN inst
  처럼 계층을 타고 하위 인스턴스를 모은다.

■ Cypher 작성 규칙
- 읽기 전용(MATCH/RETURN/WITH/OPTIONAL MATCH)만 작성. 쓰기 구문 금지.
- 파라미터($user_id 등)를 쓰지 말고 값을 리터럴로 직접 넣으세요.
  본인 데이터 조회 시 위 [현재 사용자 ID] 값을 그대로 사용: WHERE u.user_id = '그_값'.
- 결과는 노드 전체보다 필요한 속성만 RETURN.
- 이름(user_nm 등)으로 사람을 특정할 때 정확히 일치(=)시킨다.
""" % (ONTO_PREFIX,)


def get_graph_schema() -> str:
    """ReAct 프롬프트에 주입할 그래프 스키마 텍스트."""
    return GRAPH_SCHEMA_PROMPT
