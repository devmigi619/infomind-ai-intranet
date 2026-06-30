"""ABox(인스턴스) ↔ TBox(온톨로지 클래스) 연결 + 추론 데모.

load_to_neo4j.py 로 적재한 ABox 노드를, n10s 로 적재한 TBox(owl__Class)에
rdf:type 에 해당하는 RDF_TYPE 관계로 연결한다. 이렇게 하면 subClassOf 계층을
타고 올라가는 '온톨로지 추론'이 가능해진다.

  (홍길동:User)-[:RDF_TYPE]->(:owl__Class "User")-[:rdfs__subClassOf]->(:owl__Class "Organization")

추론 예시:
  "Organization 도메인의 모든 인스턴스"를 물으면, 쿼리에서 User/Department 를
  직접 언급하지 않아도 계층을 통해 자동으로 도출된다.

실행:
  cd ai && NEO4J_PASSWORD=... venv/bin/python -m app.hj.data.link_tbox_abox
"""

from __future__ import annotations

import os

from neo4j import GraphDatabase

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "infomind")

ONTO_PREFIX = "http://www.semanticweb.org/infomind/ontologies/2026/5/untitled-ontology-3#"

# ABox 노드 라벨 → TBox 클래스 local name 매핑.
# (이름이 다른 것: MtgrReservation→MettingRoomReservation, LeaveSubType→LeaveDetail,
#  LeaveRequestDay→LeaveDate)
LABEL_TO_CLASS = {
    "User": "User",
    "Vehicle": "Vehicle",
    "MeetingRoom": "MeetingRoom",
    "VehicleReservation": "VehicleReservation",
    "MtgrReservation": "MettingRoomReservation",
    "LeaveType": "LeaveType",
    "LeaveSubType": "LeaveDetail",
    "LeavePolicy": "LeavePolicy",
    "LeaveRequest": "LeaveRequest",
    "LeaveRequestDay": "LeaveDate",
}


def link_abox_to_tbox(neo) -> None:
    """각 ABox 라벨의 노드를 대응 TBox 클래스에 RDF_TYPE 로 연결."""
    for label, class_name in LABEL_TO_CLASS.items():
        uri = ONTO_PREFIX + class_name
        result = neo.run(
            f"""
            MATCH (c:owl__Class {{uri: $uri}})
            MATCH (i:`{label}`)
            MERGE (i)-[:RDF_TYPE]->(c)
            RETURN count(i) AS linked
            """,
            uri=uri,
        ).single()
        print(f"  {label:20} -> {class_name:24} {result['linked']} linked")


def demo_inference(neo) -> None:
    """추론 데모: subClassOf 계층을 타고 상위 도메인의 인스턴스를 도출."""
    print("\n=== 추론1: 'Facility' 도메인의 모든 인스턴스 (하위클래스 자동 포함) ===")
    # 쿼리는 Vehicle/MeetingRoom 을 전혀 언급하지 않는다.
    # subClassOf* 로 Facility 의 모든 하위 클래스를 찾고, 그 인스턴스를 모은다.
    rows = neo.run(
        """
        MATCH (sub:owl__Class)-[:rdfs__subClassOf*0..]->(top:owl__Class)
        WHERE top.uri = $top
        MATCH (inst)-[:RDF_TYPE]->(sub)
        RETURN split(sub.uri,'#')[1] AS class, count(inst) AS instances
        ORDER BY class
        """,
        top=ONTO_PREFIX + "Facility",
    )
    for r in rows:
        print(f"  {r['class']:26} {r['instances']}")

    print("\n=== 추론2: 'Organization' 도메인의 인스턴스 종류 ===")
    rows = neo.run(
        """
        MATCH (sub:owl__Class)-[:rdfs__subClassOf*0..]->(top:owl__Class)
        WHERE top.uri = $top
        MATCH (inst)-[:RDF_TYPE]->(sub)
        RETURN split(sub.uri,'#')[1] AS class, count(inst) AS instances
        ORDER BY class
        """,
        top=ONTO_PREFIX + "Organization",
    )
    for r in rows:
        print(f"  {r['class']:26} {r['instances']}")

    print("\n=== 추론3: 임의 인스턴스의 전체 타입 체인(자신→상위클래스) ===")
    rows = neo.run(
        """
        MATCH (i:User)-[:RDF_TYPE]->(c:owl__Class)-[:rdfs__subClassOf*0..]->(sup:owl__Class)
        WITH i, collect(split(sup.uri,'#')[1]) AS types
        RETURN i.user_nm AS name, types LIMIT 3
        """
    )
    for r in rows:
        print(f"  {r['name']}: {' ⊑ '.join(r['types'])}")


def main() -> None:
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    with driver.session() as neo:
        print("=== ABox → TBox 연결(RDF_TYPE) ===")
        link_abox_to_tbox(neo)
        demo_inference(neo)
    driver.close()
    print("\ndone.")


if __name__ == "__main__":
    main()
