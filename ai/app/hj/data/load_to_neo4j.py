"""PostgreSQL → Neo4j ABox(인스턴스) 적재 스크립트.

대상 테이블(5개)을 그래프 모델로 변환해 Neo4j에 적재한다.

  (User)-[:RESERVED]->(VehicleReservation)-[:FOR_VEHICLE]->(Vehicle)
  (User)-[:RESERVED]->(MtgrReservation)-[:FOR_ROOM]->(MeetingRoom)

- 예약(reservation)은 속성이 많아 관계가 아닌 '노드'로 표현(reification)한다.
- 모든 쓰기는 MERGE 기반이라 여러 번 실행해도 중복이 생기지 않는다(멱등).
- int_user.pwd 등 민감/불필요 컬럼은 적재에서 제외한다.

실행:
  cd ai && venv/bin/python -m app.hj.data.load_to_neo4j
"""

from __future__ import annotations

import os

import psycopg
from neo4j import GraphDatabase

# --- 접속 설정 -------------------------------------------------------------
# PostgreSQL: ai/.env.local 의 DATABASE_URL 재사용
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://infomind:infomind@192.168.0.248:5434/intranet",
)

# Neo4j: 단독 컨테이너(학습용) 기본값. 필요 시 환경변수로 override.
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "test1234")


def _load_database_url() -> str:
    """.env.local 에서 DATABASE_URL 을 읽는다(환경변수 우선)."""
    if os.getenv("DATABASE_URL"):
        return os.environ["DATABASE_URL"]
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env.local")
    env_path = os.path.abspath(env_path)
    if os.path.exists(env_path):
        with open(env_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("DATABASE_URL="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    return DATABASE_URL


# --- 노드 적재 -------------------------------------------------------------
def load_users(pg, neo) -> int:
    """int_user → (:User). pwd 등 민감 컬럼 제외."""
    rows = pg.execute(
        """
        SELECT user_id, user_nm, eml, mtelno, telno,
               dept_cd, jbgd_cd, user_se, hire_ymd, resg_ymd
        FROM int_user
        """
    ).fetchall()
    cols = [d.name for d in pg.description]
    cypher = """
    UNWIND $rows AS row
    MERGE (u:User {user_id: row.user_id})
      SET u += row
    """
    neo.run(cypher, rows=[dict(zip(cols, r)) for r in rows])
    return len(rows)


def load_vehicles(pg, neo) -> int:
    """int_veh → (:Vehicle)."""
    rows = pg.execute(
        """
        SELECT veh_id, veh_nm, veh_no, veh_se, dept_cd, use_yn
        FROM int_veh
        """
    ).fetchall()
    cols = [d.name for d in pg.description]
    neo.run(
        """
        UNWIND $rows AS row
        MERGE (v:Vehicle {veh_id: row.veh_id})
          SET v += row
        """,
        rows=[dict(zip(cols, r)) for r in rows],
    )
    return len(rows)


def load_meeting_rooms(pg, neo) -> int:
    """int_mtgr → (:MeetingRoom)."""
    rows = pg.execute(
        """
        SELECT mtgr_id, mtgr_nm, mtgr_plc, mtgr_se, dept_cd, use_yn
        FROM int_mtgr
        """
    ).fetchall()
    cols = [d.name for d in pg.description]
    neo.run(
        """
        UNWIND $rows AS row
        MERGE (m:MeetingRoom {mtgr_id: row.mtgr_id})
          SET m += row
        """,
        rows=[dict(zip(cols, r)) for r in rows],
    )
    return len(rows)


# --- 예약(노드 + 관계) 적재 -------------------------------------------------
def load_vehicle_reservations(pg, neo) -> int:
    """int_veh_rsv → (:VehicleReservation) + User/Vehicle 연결.

    복합키(veh_id + rsv_sn)를 rsv_key 로 합쳐 노드 식별자로 쓴다.
    """
    rows = pg.execute(
        """
        SELECT veh_id, rsv_sn, user_id,
               rsv_st_ymd, rsv_st_hhmm, rsv_end_ymd, rsv_end_hhmm,
               rtn_yn, ext_yn, rmk
        FROM int_veh_rsv
        """
    ).fetchall()
    cols = [d.name for d in pg.description]
    data = []
    for r in rows:
        d = dict(zip(cols, r))
        d["rsv_sn"] = int(d["rsv_sn"])  # bigint → int
        d["rsv_key"] = f"{d['veh_id']}#{d['rsv_sn']}"
        data.append(d)
    neo.run(
        """
        UNWIND $rows AS row
        MERGE (rsv:VehicleReservation {rsv_key: row.rsv_key})
          SET rsv += row
        MERGE (u:User {user_id: row.user_id})
        MERGE (v:Vehicle {veh_id: row.veh_id})
        MERGE (u)-[:RESERVED]->(rsv)
        MERGE (rsv)-[:FOR_VEHICLE]->(v)
        """,
        rows=data,
    )
    return len(data)


def load_mtgr_reservations(pg, neo) -> int:
    """int_mtgr_rsv → (:MtgrReservation) + User/MeetingRoom 연결."""
    rows = pg.execute(
        """
        SELECT mtgr_id, rsv_sn, user_id,
               rsv_st_ymd, rsv_st_hhmm, rsv_end_ymd, rsv_end_hhmm,
               ext_yn, rmk
        FROM int_mtgr_rsv
        """
    ).fetchall()
    cols = [d.name for d in pg.description]
    data = []
    for r in rows:
        d = dict(zip(cols, r))
        d["rsv_sn"] = int(d["rsv_sn"])
        d["rsv_key"] = f"{d['mtgr_id']}#{d['rsv_sn']}"
        data.append(d)
    neo.run(
        """
        UNWIND $rows AS row
        MERGE (rsv:MtgrReservation {rsv_key: row.rsv_key})
          SET rsv += row
        MERGE (u:User {user_id: row.user_id})
        MERGE (m:MeetingRoom {mtgr_id: row.mtgr_id})
        MERGE (u)-[:RESERVED]->(rsv)
        MERGE (rsv)-[:FOR_ROOM]->(m)
        """,
        rows=data,
    )
    return len(data)


# --- 휴가: 마스터/정책 노드 -------------------------------------------------
def load_leave_types(pg, neo) -> int:
    """int_leave_mst → (:LeaveType). 휴가 종류 마스터(연차/병가 등)."""
    rows = pg.execute(
        "SELECT leave_cd, leave_nm, ded_yn, paid_yn, use_yn FROM int_leave_mst"
    ).fetchall()
    cols = [d.name for d in pg.description]
    neo.run(
        """
        UNWIND $rows AS row
        MERGE (t:LeaveType {leave_cd: row.leave_cd})
          SET t += row
        """,
        rows=[dict(zip(cols, r)) for r in rows],
    )
    return len(rows)


def load_leave_subtypes(pg, neo) -> int:
    """int_leave_dtl → (:LeaveSubType) + LeaveType 연결. 복합키 leave_cd#leave_dtl_cd."""
    rows = pg.execute(
        """
        SELECT leave_cd, leave_dtl_cd, leave_dtl_nm, leave_dtl_desc,
               leave_se, use_avl_dcnt, use_yn
        FROM int_leave_dtl
        """
    ).fetchall()
    cols = [d.name for d in pg.description]
    data = []
    for r in rows:
        d = dict(zip(cols, r))
        d["use_avl_dcnt"] = float(d["use_avl_dcnt"]) if d["use_avl_dcnt"] is not None else None
        d["subtype_key"] = f"{d['leave_cd']}#{d['leave_dtl_cd']}"
        data.append(d)
    neo.run(
        """
        UNWIND $rows AS row
        MERGE (s:LeaveSubType {subtype_key: row.subtype_key})
          SET s += row
        MERGE (t:LeaveType {leave_cd: row.leave_cd})
        MERGE (s)-[:OF_TYPE]->(t)
        """,
        rows=data,
    )
    return len(data)


def load_leave_policies(pg, neo) -> int:
    """int_leave_pol → (:LeavePolicy). 독립 노드(연결 컬럼 없음)."""
    rows = pg.execute(
        """
        SELECT leave_pol_cd, leave_pol_nm, leave_pol_desc,
               pol_st_mon, pol_end_mon, add_dcnt, add_cyc_mon,
               max_dcnt, leave_dcnt, use_yn
        FROM int_leave_pol
        """
    ).fetchall()
    cols = [d.name for d in pg.description]
    data = []
    for r in rows:
        d = dict(zip(cols, r))
        for k in ("add_dcnt", "max_dcnt", "leave_dcnt"):
            if d[k] is not None:
                d[k] = float(d[k])  # numeric → float
        data.append(d)
    neo.run(
        """
        UNWIND $rows AS row
        MERGE (p:LeavePolicy {leave_pol_cd: row.leave_pol_cd})
          SET p += row
        """,
        rows=data,
    )
    return len(data)


# --- 휴가: 신청/상세/결재/참조 ---------------------------------------------
def load_leave_requests(pg, neo) -> int:
    """int_leave_req_mst → (:LeaveRequest) + User/LeaveType/LeaveSubType 연결."""
    rows = pg.execute(
        """
        SELECT req_user_id, req_sn, leave_rsn, aprv_rslt_se,
               leave_cd, leave_dtl_cd, leave_use_dcnt, afile_id, dept_ref_yn
        FROM int_leave_req_mst
        """
    ).fetchall()
    cols = [d.name for d in pg.description]
    data = []
    for r in rows:
        d = dict(zip(cols, r))
        d["req_sn"] = int(d["req_sn"])
        if d["leave_use_dcnt"] is not None:
            d["leave_use_dcnt"] = float(d["leave_use_dcnt"])
        d["req_key"] = f"{d['req_user_id']}#{d['req_sn']}"
        d["subtype_key"] = (
            f"{d['leave_cd']}#{d['leave_dtl_cd']}" if d["leave_dtl_cd"] is not None else None
        )
        data.append(d)
    neo.run(
        """
        UNWIND $rows AS row
        MERGE (req:LeaveRequest {req_key: row.req_key})
          SET req += row
        MERGE (u:User {user_id: row.req_user_id})
        MERGE (u)-[:REQUESTED]->(req)
        WITH req, row
        WHERE row.leave_cd IS NOT NULL
        MERGE (t:LeaveType {leave_cd: row.leave_cd})
        MERGE (req)-[:OF_TYPE]->(t)
        WITH req, row
        WHERE row.subtype_key IS NOT NULL
        MERGE (s:LeaveSubType {subtype_key: row.subtype_key})
        MERGE (req)-[:OF_SUBTYPE]->(s)
        """,
        rows=data,
    )
    return len(data)


def load_leave_request_days(pg, neo) -> int:
    """int_leave_req_dtl → (:LeaveRequestDay) + LeaveRequest 연결(일자별 사용)."""
    rows = pg.execute(
        """
        SELECT req_user_id, req_sn, leave_use_ymd, leave_st_hhmm, leave_end_hhmm
        FROM int_leave_req_dtl
        """
    ).fetchall()
    cols = [d.name for d in pg.description]
    data = []
    for r in rows:
        d = dict(zip(cols, r))
        d["req_sn"] = int(d["req_sn"])
        d["req_key"] = f"{d['req_user_id']}#{d['req_sn']}"
        d["day_key"] = f"{d['req_key']}#{d['leave_use_ymd']}"
        data.append(d)
    neo.run(
        """
        UNWIND $rows AS row
        MERGE (day:LeaveRequestDay {day_key: row.day_key})
          SET day += row
        MERGE (req:LeaveRequest {req_key: row.req_key})
        MERGE (req)-[:HAS_DAY]->(day)
        """,
        rows=data,
    )
    return len(data)


def load_leave_approvals(pg, neo) -> int:
    """int_leave_req_aprv → (aprvUser:User)-[:APPROVED {...}]->(LeaveRequest).

    결재는 User-Request 사이의 '행위'라 노드가 아닌 관계의 속성으로 표현한다.
    같은 신청에 대한 다단계 결재는 aprv_ord 로 구분한다.
    """
    rows = pg.execute(
        """
        SELECT req_user_id, req_sn, aprv_user_id, aprv_se, aprv_ymd, aprv_ord, rmk
        FROM int_leave_req_aprv
        """
    ).fetchall()
    cols = [d.name for d in pg.description]
    data = []
    for r in rows:
        d = dict(zip(cols, r))
        d["req_sn"] = int(d["req_sn"])
        d["aprv_ord"] = int(d["aprv_ord"]) if d["aprv_ord"] is not None else None
        d["req_key"] = f"{d['req_user_id']}#{d['req_sn']}"
        data.append(d)
    neo.run(
        """
        UNWIND $rows AS row
        MERGE (req:LeaveRequest {req_key: row.req_key})
        MERGE (au:User {user_id: row.aprv_user_id})
        MERGE (au)-[a:APPROVED {aprv_ord: row.aprv_ord}]->(req)
          SET a.aprv_se = row.aprv_se, a.aprv_ymd = row.aprv_ymd, a.rmk = row.rmk
        """,
        rows=data,
    )
    return len(data)


def load_leave_references(pg, neo) -> int:
    """int_leave_req_ref → (refUser:User)-[:REFERENCED {qry_yn}]->(LeaveRequest)."""
    rows = pg.execute(
        "SELECT req_user_id, req_sn, ref_user_id, qry_yn FROM int_leave_req_ref"
    ).fetchall()
    cols = [d.name for d in pg.description]
    data = []
    for r in rows:
        d = dict(zip(cols, r))
        d["req_sn"] = int(d["req_sn"])
        d["req_key"] = f"{d['req_user_id']}#{d['req_sn']}"
        data.append(d)
    neo.run(
        """
        UNWIND $rows AS row
        MERGE (req:LeaveRequest {req_key: row.req_key})
        MERGE (ru:User {user_id: row.ref_user_id})
        MERGE (ru)-[ref:REFERENCED]->(req)
          SET ref.qry_yn = row.qry_yn
        """,
        rows=data,
    )
    return len(data)


# --- 제약(인덱스) ----------------------------------------------------------
def ensure_constraints(neo) -> None:
    """노드 식별자에 UNIQUE 제약(=인덱스). MERGE 성능과 무결성 확보."""
    stmts = [
        "CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.user_id IS UNIQUE",
        "CREATE CONSTRAINT veh_id IF NOT EXISTS FOR (v:Vehicle) REQUIRE v.veh_id IS UNIQUE",
        "CREATE CONSTRAINT mtgr_id IF NOT EXISTS FOR (m:MeetingRoom) REQUIRE m.mtgr_id IS UNIQUE",
        "CREATE CONSTRAINT veh_rsv_key IF NOT EXISTS FOR (r:VehicleReservation) REQUIRE r.rsv_key IS UNIQUE",
        "CREATE CONSTRAINT mtgr_rsv_key IF NOT EXISTS FOR (r:MtgrReservation) REQUIRE r.rsv_key IS UNIQUE",
        "CREATE CONSTRAINT leave_cd IF NOT EXISTS FOR (t:LeaveType) REQUIRE t.leave_cd IS UNIQUE",
        "CREATE CONSTRAINT leave_subtype_key IF NOT EXISTS FOR (s:LeaveSubType) REQUIRE s.subtype_key IS UNIQUE",
        "CREATE CONSTRAINT leave_pol_cd IF NOT EXISTS FOR (p:LeavePolicy) REQUIRE p.leave_pol_cd IS UNIQUE",
        "CREATE CONSTRAINT leave_req_key IF NOT EXISTS FOR (r:LeaveRequest) REQUIRE r.req_key IS UNIQUE",
        "CREATE CONSTRAINT leave_day_key IF NOT EXISTS FOR (d:LeaveRequestDay) REQUIRE d.day_key IS UNIQUE",
    ]
    for s in stmts:
        neo.run(s)


def main() -> None:
    db_url = _load_database_url()
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

    with psycopg.connect(db_url) as conn, conn.cursor() as pg:
        with driver.session() as neo:
            ensure_constraints(neo)
            print(f"User:               {load_users(pg, neo)} rows")
            print(f"Vehicle:            {load_vehicles(pg, neo)} rows")
            print(f"MeetingRoom:        {load_meeting_rooms(pg, neo)} rows")
            print(f"VehicleReservation: {load_vehicle_reservations(pg, neo)} rows")
            print(f"MtgrReservation:    {load_mtgr_reservations(pg, neo)} rows")
            # 휴가 도메인
            print(f"LeaveType:          {load_leave_types(pg, neo)} rows")
            print(f"LeaveSubType:       {load_leave_subtypes(pg, neo)} rows")
            print(f"LeavePolicy:        {load_leave_policies(pg, neo)} rows")
            print(f"LeaveRequest:       {load_leave_requests(pg, neo)} rows")
            print(f"LeaveRequestDay:    {load_leave_request_days(pg, neo)} rows")
            print(f"LeaveApproval(rel): {load_leave_approvals(pg, neo)} rows")
            print(f"LeaveReference(rel):{load_leave_references(pg, neo)} rows")

    driver.close()
    print("done.")


if __name__ == "__main__":
    main()
