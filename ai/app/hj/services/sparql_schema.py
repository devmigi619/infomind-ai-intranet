"""Fuseki SPARQL Graph RAG용 스키마 프롬프트 — Text2SPARQL 주입용.

온톨로지(TBox) + 인스턴스(ABox)가 적재되고 OWLMicro 리즈너가 켜진
/intranet-r 데이터셋을 대상으로 한다. 리즈너 덕분에 상위개념 질의(`a :Facility`)가
하위 인스턴스까지 자동 포함한다.
"""

ONTO_PREFIX = "http://www.semanticweb.org/infomind/ontologies/2026/5/untitled-ontology-3#"

# Fuseki(ABox+추론)에 적재된 도메인 intent. 이 intent의 조회(search)만 SPARQL로 라우팅.
GRAPH_RAG_INTENTS: set[str] = {"veh", "mtgr", "leave", "aprv", "brd", "schd", "rpt"}

SPARQL_SCHEMA_PROMPT = """\
[SPARQL 스키마 — Fuseki 추론 데이터셋]

■ 공통 PREFIX (쿼리 맨 위에 반드시 선언)
PREFIX :    <%(p)s>
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

■ 클래스(도메인 계층) — 리즈너가 subClassOf 를 추론함
- Organization ⊒ User
- Facility ⊒ Vehicle, MeetingRoom, VehicleReservation, MettingRoomReservation
- Leave ⊒ LeaveType, LeaveDetail, LeavePolicy, LeaveRequest, LeaveDate, LeaveApprovalStep
  (철자 주의: 회의실예약 클래스는 오타 그대로 :MettingRoomReservation)
- Approval ⊒ ApprovalForm, ApprovalFormField, ApprovalRequest, ApprovalStep, ApprovalReference
- Board ⊒ Board(게시판), Post, Comment
- Report ⊒ ReportForm, ReportRound, ReportEntry
- Schedule ⊒ Schedule(일정), ScheduleAttend, ScheduleException
  (부서(Department) ABox 미적재 — 각 도메인의 부서 연결 속성(ownedByDept 등)은 사용 불가)

■ 객체 속성 (주어 → 목적어)
- :VehicleReservation :vehicleReservedBy :User ; :reservedVehicle :Vehicle
- :MettingRoomReservation :reservedBy :User ; :reservedMeetingRoom :MeetingRoom
- :LeaveRequest :requestedBy :User ; :usesLeaveType :LeaveType ; :usesLeaveDetail :LeaveDetail
- :LeaveRequest :hasLeaveDate :LeaveDate ; :hasLeaveApprovalStep :LeaveApprovalStep
- :LeaveDetail :ofLeaveType :LeaveType
- :LeaveApprovalStep :leaveApprovedBy :User
- :ApprovalRequest :submittedBy :User ; :usesForm :ApprovalForm ; :hasApprovalStep :ApprovalStep
- :ApprovalForm :hasFormField :ApprovalFormField
  (ApprovalStep에는 승인자 링크 없음 — TBox 제약. 승인자가 필요하면 int_aprv_req_aprv 원본 컬럼 설명 참고 불가, 순서/유형/날짜만 조회 가능)
- :Post :postedIn :Board ; :writtenBy :User
- :Comment :commentOn :Post ; :commentBy :User ; :parentComment :Comment(대댓글일 때만)
- :ReportRound :roundOf :ReportForm ; :ReportForm :hasRound :ReportRound
- :ReportEntry :entrySubmittedBy :User ; :ReportRound :hasEntry :ReportEntry
- :Schedule :createdByUser :User ; :hasAttendee :ScheduleAttend ; :hasException :ScheduleException
- :ScheduleAttend :attendeeUser :User

■ 데이터 속성(리터럴) — 표시용
- User: :userId :userName :emailAddr :deptCode
- Vehicle: :vehicleName :vehicleNumber   MeetingRoom: :meetingRoomName
- 예약: :vehReservationStartDate :mtgrReservationStartDate ...
- LeaveType: :leaveName   LeaveRequest: :leaveReason :approvalResult :usedDays
- LeaveApprovalStep: :approvalOrder :approvalType :approvalDate
- ApprovalForm: :formName :hasFileAttach   ApprovalRequest: :requestContent :requestDate :approvalResult
- Board: :boardName :boardType   Post: :postTitle :postContent :isNotice :likeCount
- Comment: :commentContent :commentLevel :commentLikeCount
- ReportForm: :reportTitle :reportPeriodType :isPublic   ReportRound: :roundName :roundDate
- ReportEntry: :execContent :planContent :isSubmitted :submitDate
- Schedule: :scheduleName :scheduleStartDate :scheduleEndDate :isRecurring :recurringType

■ 추론 활용 (이 데이터셋은 리즈너 ON)
- 상위개념으로 물으면 하위 인스턴스가 자동 포함됨:
    SELECT ?s WHERE { ?s a :Facility }     # Vehicle/MeetingRoom/예약까지 자동
- subClassOf* 를 명시하지 않아도 된다.

■ 작성 규칙
- SELECT / ASK 읽기 전용만. INSERT/DELETE 등 쓰기 금지.
- 파라미터 대신 리터럴을 직접 사용. 본인 데이터는 [현재 사용자 ID] 값을 넣는다.
- 사람 이름/코드로 특정할 때 정확히 일치시킨다.

■ 예시 (이 패턴을 따르세요)
# 예1) 특정 사용자의 휴가 신청 + 종류
SELECT ?신청 ?휴가명 ?사유 WHERE {
  ?req a :LeaveRequest ; :requestedBy ?u ; :leaveReason ?사유 ;
       :usesLeaveType ?lt .
  ?u :userId "USER_ID_HERE" .
  ?lt :leaveName ?휴가명 .
  BIND(STR(?req) AS ?신청)
}

# 예2) 휴가 결재선 (reify된 LeaveApprovalStep)
SELECT ?결재자 ?순서 WHERE {
  ?req a :LeaveRequest ; :requestedBy ?ru ; :hasLeaveApprovalStep ?step .
  ?ru :userId "USER_ID_HERE" .
  ?step :leaveApprovedBy ?au ; :approvalOrder ?순서 .
  ?au :userName ?결재자 .
} ORDER BY ?순서

# 예3) 시설 도메인 전체 (추론)
SELECT ?s ?type WHERE { ?s a ?type . ?type rdfs:subClassOf :Facility . }

# 예4) 특정 사용자가 제출한 결재 요청 + 결재선
SELECT ?제목 ?결과 ?결재자 ?순서 WHERE {
  ?req a :ApprovalRequest ; :submittedBy ?u ; :requestContent ?제목 ; :approvalResult ?결과 ;
       :hasApprovalStep ?step .
  ?u :userId "USER_ID_HERE" .
  ?step :approvalOrder ?순서 .
} ORDER BY ?순서

# 예5) 게시판별 최근 게시글 + 작성자
SELECT ?제목 ?작성자 WHERE {
  ?pst a :Post ; :postedIn ?b ; :postTitle ?제목 ; :writtenBy ?wu .
  ?b :boardName "자유게시판" .
  ?wu :userName ?작성자 .
}
""" % {"p": ONTO_PREFIX}


def get_sparql_schema() -> str:
    return SPARQL_SCHEMA_PROMPT
