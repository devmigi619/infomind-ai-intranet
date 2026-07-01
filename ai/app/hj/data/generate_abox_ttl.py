"""PostgreSQL → ABox(RDF/TTL) 생성 — Fuseki 적재용.

load_to_neo4j.py 의 RDF 버전. PostgreSQL 데이터를 온톨로지(TBox) 클래스/속성에
맞춘 RDF 트리플로 변환해 Turtle 파일로 출력한다. 이 파일을 Fuseki 의 intranet
데이터셋(TBox가 이미 들어있는)에 추가 적재하면, rdf:type 으로 인스턴스가 클래스에
연결되고 SPARQL 추론(subClassOf 등)이 가능해진다.

  - 인스턴스 URI 는 TBox 와 동일 네임스페이스(:) 를 사용 → 한 그래프에서 자연 결합.
  - 결재는 온톨로지 설계(LeaveApprovalStep 클래스)를 따라 reify 한다.
    (Neo4j 에서 관계로 표현한 것과 다름 — Fuseki 는 온톨로지를 그대로 따른다)

대상: 차량/회의실/휴가 + 결재/게시판/보고/일정 도메인
  - 부서(Department) ABox는 미적재 → 부서 연결 오브젝트 속성(ownedByDept 등)은 전 도메인 공통 생략
  - ApprovalStep 승인자 링크: TBox에 도메인 불일치(승인자 속성이 ApprovalRequest 전용)로 생략

실행:
  cd ai && venv/bin/python -m app.hj.data.generate_abox_ttl
  → app/hj/data/intranet_abox.ttl 생성
"""

from __future__ import annotations

import os
import re

import psycopg
from rdflib import Graph, Namespace, Literal, URIRef
from rdflib.namespace import RDF, RDFS

ONTO = Namespace("http://www.semanticweb.org/infomind/ontologies/2026/5/untitled-ontology-3#")

OUT_PATH = os.path.join(os.path.dirname(__file__), "intranet_abox.ttl")


def _load_database_url() -> str:
    if os.getenv("DATABASE_URL"):
        return os.environ["DATABASE_URL"]
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env.local"))
    if os.path.exists(env_path):
        with open(env_path, encoding="utf-8") as f:
            for line in f:
                if line.strip().startswith("DATABASE_URL="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError("DATABASE_URL 을 찾을 수 없습니다.")


def _iri(*parts: str) -> URIRef:
    """인스턴스 IRI 생성 — 비-URL 문자를 _ 로 치환."""
    raw = "_".join(str(p) for p in parts)
    safe = re.sub(r"[^A-Za-z0-9_]", "_", raw)
    return ONTO[safe]


def _lit(g: Graph, s: URIRef, prop: str, value) -> None:
    """값이 있으면 (s, :prop, value) 데이터 속성 트리플 추가."""
    if value is None or value == "":
        return
    g.add((s, ONTO[prop], Literal(value)))


def build_graph(pg) -> Graph:
    g = Graph()
    g.bind("", ONTO)        # 기본 네임스페이스
    g.bind("owl", "http://www.w3.org/2002/07/owl#")

    # ── User (int_user) ───────────────────────────────────────────────────────
    pg.execute("""SELECT user_id, user_nm, eml, mtelno, gndr_se, brdt,
                         dept_cd, jbgd_cd, user_se, hire_ymd, resg_ymd FROM int_user""")
    for r in pg.fetchall():
        (uid, nm, eml, mtel, gndr, brdt, dept, jbgd, use, hire, resg) = r
        s = _iri("user", uid)
        g.add((s, RDF.type, ONTO.User))
        g.add((s, RDFS.label, Literal(nm or uid)))
        _lit(g, s, "userId", uid);      _lit(g, s, "userName", nm)
        _lit(g, s, "emailAddr", eml);   _lit(g, s, "mobile", mtel)
        _lit(g, s, "gender", gndr);     _lit(g, s, "birthDate", brdt)
        _lit(g, s, "deptCode", dept);   _lit(g, s, "jobGradeCode", jbgd)
        _lit(g, s, "userType", use);    _lit(g, s, "hireDate", hire)
        _lit(g, s, "resignDate", resg)

    # ── Vehicle (int_veh) ─────────────────────────────────────────────────────
    pg.execute("SELECT veh_id, veh_nm, veh_no, veh_se, dept_cd FROM int_veh")
    for veh_id, nm, no, se, dept in pg.fetchall():
        s = _iri("veh", veh_id)
        g.add((s, RDF.type, ONTO.Vehicle))
        g.add((s, RDFS.label, Literal(nm or veh_id)))
        _lit(g, s, "vehicleId", veh_id);   _lit(g, s, "vehicleName", nm)
        _lit(g, s, "vehicleNumber", no);   _lit(g, s, "vehicleType", se)
        _lit(g, s, "deptCode", dept)

    # ── MeetingRoom (int_mtgr) ────────────────────────────────────────────────
    pg.execute("SELECT mtgr_id, mtgr_nm, mtgr_se FROM int_mtgr")
    for mid, nm, se in pg.fetchall():
        s = _iri("mtgr", mid)
        g.add((s, RDF.type, ONTO.MeetingRoom))
        g.add((s, RDFS.label, Literal(nm or mid)))
        _lit(g, s, "meetingRoomId", mid);  _lit(g, s, "meetingRoomName", nm)
        _lit(g, s, "meetingRoomType", se)

    # ── VehicleReservation (int_veh_rsv) ──────────────────────────────────────
    pg.execute("""SELECT veh_id, rsv_sn, user_id, rsv_st_ymd, rsv_st_hhmm,
                         rsv_end_ymd, rsv_end_hhmm, ext_yn, rtn_yn FROM int_veh_rsv""")
    for veh_id, sn, uid, sd, st, ed, et, ext, rtn in pg.fetchall():
        s = _iri("vehrsv", veh_id, sn)
        g.add((s, RDF.type, ONTO.VehicleReservation))
        g.add((s, ONTO.vehicleReservedBy, _iri("user", uid)))
        g.add((s, ONTO.reservedVehicle, _iri("veh", veh_id)))
        _lit(g, s, "vehReservationStartDate", sd); _lit(g, s, "vehReservationStartTime", st)
        _lit(g, s, "vehReservationEndDate", ed);   _lit(g, s, "vehReservationEndTime", et)
        _lit(g, s, "vehIsExtended", ext);          _lit(g, s, "isReturned", rtn)

    # ── MettingRoomReservation (int_mtgr_rsv) ─ 온톨로지 철자(Metting) 유지 ────
    pg.execute("""SELECT mtgr_id, rsv_sn, user_id, rsv_st_ymd, rsv_st_hhmm,
                         rsv_end_ymd, rsv_end_hhmm, ext_yn FROM int_mtgr_rsv""")
    for mid, sn, uid, sd, st, ed, et, ext in pg.fetchall():
        s = _iri("mtgrrsv", mid, sn)
        g.add((s, RDF.type, ONTO.MettingRoomReservation))
        g.add((s, ONTO.reservedBy, _iri("user", uid)))
        g.add((s, ONTO.reservedMeetingRoom, _iri("mtgr", mid)))
        _lit(g, s, "mtgrReservationStartDate", sd); _lit(g, s, "mtgrReservationStartTime", st)
        _lit(g, s, "mtgrReservationEndDate", ed);   _lit(g, s, "mtgrReservationEndTime", et)
        _lit(g, s, "mtgrIsExtended", ext)

    # ── LeaveType (int_leave_mst) ─────────────────────────────────────────────
    pg.execute("SELECT leave_cd, leave_nm FROM int_leave_mst")
    for cd, nm in pg.fetchall():
        s = _iri("leavetype", cd)
        g.add((s, RDF.type, ONTO.LeaveType))
        g.add((s, RDFS.label, Literal(nm or cd)))
        _lit(g, s, "leaveCode", cd); _lit(g, s, "leaveName", nm)

    # ── LeaveDetail (int_leave_dtl) → ofLeaveType ─────────────────────────────
    pg.execute("SELECT leave_cd, leave_dtl_cd, leave_dtl_nm FROM int_leave_dtl")
    for cd, dtl_cd, dtl_nm in pg.fetchall():
        s = _iri("leavedetail", cd, dtl_cd)
        g.add((s, RDF.type, ONTO.LeaveDetail))
        g.add((s, RDFS.label, Literal(dtl_nm or dtl_cd)))
        g.add((s, ONTO.ofLeaveType, _iri("leavetype", cd)))
        _lit(g, s, "leaveCode", cd)

    # ── LeavePolicy (int_leave_pol) ───────────────────────────────────────────
    pg.execute("SELECT leave_pol_cd, leave_pol_nm, max_dcnt, leave_dcnt FROM int_leave_pol")
    for cd, nm, maxd, leaved in pg.fetchall():
        s = _iri("leavepol", cd)
        g.add((s, RDF.type, ONTO.LeavePolicy))
        g.add((s, RDFS.label, Literal(nm or cd)))
        _lit(g, s, "policyCode", cd);  _lit(g, s, "policyName", nm)
        _lit(g, s, "maxDays", maxd);   _lit(g, s, "leaveDays", leaved)

    # ── LeaveRequest (int_leave_req_mst) ──────────────────────────────────────
    pg.execute("""SELECT req_user_id, req_sn, leave_rsn, aprv_rslt_se,
                         leave_cd, leave_dtl_cd, leave_use_dcnt FROM int_leave_req_mst""")
    for uid, sn, rsn, rslt, lcd, ldtl, used in pg.fetchall():
        s = _iri("leavereq", uid, sn)
        g.add((s, RDF.type, ONTO.LeaveRequest))
        g.add((s, ONTO.requestedBy, _iri("user", uid)))
        if lcd is not None:
            g.add((s, ONTO.usesLeaveType, _iri("leavetype", lcd)))
        if lcd is not None and ldtl is not None:
            g.add((s, ONTO.usesLeaveDetail, _iri("leavedetail", lcd, ldtl)))
        _lit(g, s, "leaveReason", rsn);  _lit(g, s, "approvalResult", rslt)
        _lit(g, s, "usedDays", used)

    # ── LeaveDate (int_leave_req_dtl) ← hasLeaveDate ──────────────────────────
    pg.execute("""SELECT req_user_id, req_sn, leave_use_ymd, leave_st_hhmm,
                         leave_end_hhmm FROM int_leave_req_dtl""")
    for uid, sn, ymd, sh, eh in pg.fetchall():
        s = _iri("leavedate", uid, sn, ymd)
        g.add((s, RDF.type, ONTO.LeaveDate))
        g.add((_iri("leavereq", uid, sn), ONTO.hasLeaveDate, s))
        _lit(g, s, "leaveDate", ymd); _lit(g, s, "startTime", sh); _lit(g, s, "endTime", eh)

    # ── LeaveApprovalStep (int_leave_req_aprv) ← hasLeaveApprovalStep ─────────
    pg.execute("""SELECT req_user_id, req_sn, aprv_user_id, aprv_se,
                         aprv_ymd, aprv_ord FROM int_leave_req_aprv""")
    for uid, sn, auid, ase, aymd, aord in pg.fetchall():
        s = _iri("leaveaprv", uid, sn, aord)
        g.add((s, RDF.type, ONTO.LeaveApprovalStep))
        g.add((_iri("leavereq", uid, sn), ONTO.hasLeaveApprovalStep, s))
        g.add((s, ONTO.leaveApprovedBy, _iri("user", auid)))
        _lit(g, s, "approvalType", ase);  _lit(g, s, "approvalDate", aymd)
        _lit(g, s, "approvalOrder", aord)

    # ── ApprovalForm (int_aprv_form_mst) ──────────────────────────────────────
    pg.execute("SELECT aprv_form_id, aprv_form_nm, file_yn, rmk FROM int_aprv_form_mst")
    for fid, nm, file_yn, rmk in pg.fetchall():
        s = _iri("aprvform", fid)
        g.add((s, RDF.type, ONTO.ApprovalForm))
        g.add((s, RDFS.label, Literal(nm or fid)))
        _lit(g, s, "formId", fid);  _lit(g, s, "formName", nm)
        _lit(g, s, "hasFileAttach", file_yn); _lit(g, s, "remark", rmk)

    # ── ApprovalFormField (int_aprv_form_dtl) ← hasFormField ──────────────────
    pg.execute("SELECT aprv_form_id, aprv_ref_cd, aprv_ref_nm FROM int_aprv_form_dtl")
    for fid, refcd, refnm in pg.fetchall():
        s = _iri("aprvformfld", fid, refcd)
        g.add((s, RDF.type, ONTO.ApprovalFormField))
        g.add((s, RDFS.label, Literal(refnm or refcd)))
        g.add((_iri("aprvform", fid), ONTO.hasFormField, s))

    # ── ApprovalRequest (int_aprv_req) ────────────────────────────────────────
    pg.execute("""SELECT aprv_form_id, req_user_id, aprv_req_sn, aprv_rslt_se,
                         req_sum, req_ymd FROM int_aprv_req""")
    for fid, uid, sn, rslt, sumry, ymd in pg.fetchall():
        s = _iri("aprvreq", fid, uid, sn)
        g.add((s, RDF.type, ONTO.ApprovalRequest))
        g.add((s, ONTO.submittedBy, _iri("user", uid)))
        g.add((s, ONTO.usesForm, _iri("aprvform", fid)))
        _lit(g, s, "requestContent", sumry); _lit(g, s, "requestDate", ymd)
        _lit(g, s, "requestSeq", sn);        _lit(g, s, "approvalResult", rslt)

    # ── ApprovalStep (int_aprv_req_aprv) ← hasApprovalStep ────────────────────
    pg.execute("""SELECT aprv_form_id, req_user_id, aprv_req_sn, aprv_user_id,
                         aprv_ord, aprv_se, aprv_ymd FROM int_aprv_req_aprv""")
    for fid, uid, sn, auid, ord_, se, ymd in pg.fetchall():
        s = _iri("aprvstep", fid, uid, sn, ord_)
        g.add((s, RDF.type, ONTO.ApprovalStep))
        g.add((_iri("aprvreq", fid, uid, sn), ONTO.hasApprovalStep, s))
        _lit(g, s, "approvalOrder", ord_); _lit(g, s, "approvalType", se)
        _lit(g, s, "approvalDate", ymd)

    # ── ApprovalReference (int_aprv_req_ref) ← hasApprovalRef ────────────────
    pg.execute("SELECT aprv_form_id, req_user_id, aprv_req_sn, ref_user_id FROM int_aprv_req_ref")
    for fid, uid, sn, ruid in pg.fetchall():
        s = _iri("aprvref", fid, uid, sn, ruid)
        g.add((s, RDF.type, ONTO.ApprovalReference))
        g.add((_iri("aprvreq", fid, uid, sn), ONTO.hasApprovalRef, s))
        g.add((s, ONTO.referenceUser, _iri("user", ruid)))

    # ── Board (int_brd) ────────────────────────────────────────────────────────
    pg.execute("SELECT brd_id, brd_nm, brd_se, file_use_yn, cmt_use_yn FROM int_brd")
    for bid, nm, se, file_use, cmt_use in pg.fetchall():
        s = _iri("brd", bid)
        g.add((s, RDF.type, ONTO.Board))
        g.add((s, RDFS.label, Literal(nm or bid)))
        _lit(g, s, "boardId", bid);   _lit(g, s, "boardName", nm)
        _lit(g, s, "boardType", se);  _lit(g, s, "allowFile", file_use)
        _lit(g, s, "allowComment", cmt_use)

    # ── Post (int_pst) ← postedIn, writtenBy ──────────────────────────────────
    pg.execute("""SELECT brd_id, pst_sn, pst_ttl, pst_desc, user_id, ntc_yn,
                         qry_cnt, like_num FROM int_pst WHERE del_yn = 'N'""")
    for bid, sn, ttl, desc, uid, ntc, qry, like in pg.fetchall():
        s = _iri("pst", bid, sn)
        g.add((s, RDF.type, ONTO.Post))
        g.add((s, RDFS.label, Literal(ttl or "")))
        g.add((s, ONTO.postedIn, _iri("brd", bid)))
        g.add((s, ONTO.writtenBy, _iri("user", uid)))
        _lit(g, s, "postTitle", ttl);   _lit(g, s, "postContent", desc)
        _lit(g, s, "postSeq", sn);      _lit(g, s, "isNotice", ntc)
        _lit(g, s, "likeCount", like)

    # ── Comment (int_pst_cmt) ← commentOn, commentBy, parentComment ──────────
    pg.execute("""SELECT brd_id, pst_sn, cmt_sn, cmt_lvl, up_cmt_sn, cmt_desc,
                         user_id, like_cnt FROM int_pst_cmt WHERE del_yn = 'N'""")
    for bid, sn, csn, lvl, upcsn, desc, uid, like in pg.fetchall():
        s = _iri("cmt", bid, sn, csn)
        g.add((s, RDF.type, ONTO.Comment))
        g.add((s, ONTO.commentOn, _iri("pst", bid, sn)))
        g.add((s, ONTO.commentBy, _iri("user", uid)))
        if lvl == 2 and upcsn is not None:
            g.add((s, ONTO.parentComment, _iri("cmt", bid, sn, upcsn)))
        _lit(g, s, "commentContent", desc); _lit(g, s, "commentLevel", lvl)
        _lit(g, s, "commentLikeCount", like)

    # ── ReportForm (int_rpt_form) ─────────────────────────────────────────────
    pg.execute("SELECT rpt_form_id, rpt_ttl, rpt_dt_se, rpt_adm_id, open_yn FROM int_rpt_form")
    for fid, ttl, dtse, adm, open_yn in pg.fetchall():
        s = _iri("rptform", fid)
        g.add((s, RDF.type, ONTO.ReportForm))
        g.add((s, RDFS.label, Literal(ttl or fid)))
        g.add((s, ONTO.reportManagedBy, _iri("user", adm)))
        _lit(g, s, "reportFormId", fid); _lit(g, s, "reportTitle", ttl)
        _lit(g, s, "reportPeriodType", dtse); _lit(g, s, "isPublic", open_yn)

    # ── ReportRound (int_rpt_round) ← roundOf, hasRound ───────────────────────
    pg.execute("SELECT rpt_form_id, round_sn, round_nm, round_ymd, rpt_sum FROM int_rpt_round")
    for fid, sn, nm, ymd, summ in pg.fetchall():
        s = _iri("rptround", fid, sn)
        g.add((s, RDF.type, ONTO.ReportRound))
        g.add((s, ONTO.roundOf, _iri("rptform", fid)))
        g.add((_iri("rptform", fid), ONTO.hasRound, s))
        _lit(g, s, "roundName", nm); _lit(g, s, "roundDate", ymd)
        _lit(g, s, "remark", summ)

    # ── ReportEntry (int_rpt_desc) ← hasEntry, entrySubmittedBy ───────────────
    pg.execute("""SELECT rpt_form_id, round_sn, user_id, exec_desc, plan_desc,
                         sbmt_yn, sbmt_ymd FROM int_rpt_desc""")
    for fid, sn, uid, execd, pland, sbmt, sbmtymd in pg.fetchall():
        s = _iri("rptentry", fid, sn, uid)
        g.add((s, RDF.type, ONTO.ReportEntry))
        g.add((_iri("rptround", fid, sn), ONTO.hasEntry, s))
        g.add((s, ONTO.entrySubmittedBy, _iri("user", uid)))
        _lit(g, s, "execContent", execd); _lit(g, s, "planContent", pland)
        _lit(g, s, "isSubmitted", sbmt);  _lit(g, s, "submitDate", sbmtymd)

    # ── Schedule (int_schd) ← createdByUser ───────────────────────────────────
    pg.execute("""SELECT schd_sn, user_id, schd_nm, rmk, schd_st_ymd, schd_st_hr,
                         schd_end_ymd, schd_end_hr, loop_yn, loop_se FROM int_schd""")
    for sn, uid, nm, rmk, sd, sh, ed, eh, loop_yn, loop_se in pg.fetchall():
        s = _iri("schd", sn)
        g.add((s, RDF.type, ONTO.Schedule))
        g.add((s, RDFS.label, Literal(nm or str(sn))))
        g.add((s, ONTO.createdByUser, _iri("user", uid)))
        _lit(g, s, "scheduleName", nm);      _lit(g, s, "remark", rmk)
        _lit(g, s, "scheduleStartDate", sd); _lit(g, s, "scheduleStartTime", sh)
        _lit(g, s, "scheduleEndDate", ed);   _lit(g, s, "scheduleEndTime", eh)
        _lit(g, s, "isRecurring", loop_yn);  _lit(g, s, "recurringType", loop_se)

    # ── ScheduleAttend (int_schd_attd) ← hasAttendee, attendeeUser ────────────
    pg.execute("SELECT schd_sn, attd_user_id FROM int_schd_attd")
    for sn, uid in pg.fetchall():
        s = _iri("schdattd", sn, uid)
        g.add((s, RDF.type, ONTO.ScheduleAttend))
        g.add((_iri("schd", sn), ONTO.hasAttendee, s))
        g.add((s, ONTO.attendeeUser, _iri("user", uid)))

    # ── ScheduleException (int_schd_excp) ← hasException ──────────────────────
    pg.execute("SELECT schd_sn, excp_ymd FROM int_schd_excp")
    for sn, ymd in pg.fetchall():
        s = _iri("schdexcp", sn, ymd)
        g.add((s, RDF.type, ONTO.ScheduleException))
        g.add((_iri("schd", sn), ONTO.hasException, s))
        _lit(g, s, "exceptionDate", ymd)

    return g


def main() -> None:
    db_url = _load_database_url()
    with psycopg.connect(db_url) as conn, conn.cursor() as pg:
        g = build_graph(pg)
    g.serialize(destination=OUT_PATH, format="turtle")
    print(f"트리플 {len(g)}개 → {OUT_PATH}")


if __name__ == "__main__":
    main()
