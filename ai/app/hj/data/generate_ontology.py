"""
PostgreSQL 스키마 기반 인트라넷 온톨로지 생성 스크립트
실행: python generate_ontology.py
출력: intranet_ontology.owl
"""

from owlready2 import *

IRI = "http://infomind.co.kr/ontology/intranet#"
OUTPUT = "intranet_ontology.owl"


def build_ontology():
    onto = get_ontology(IRI)

    with onto:

        # ─────────────────────────────────────────────
        # 공통 베이스 클래스
        # ─────────────────────────────────────────────
        class IntranetEntity(Thing):
            """모든 인트라넷 엔티티의 공통 베이스"""

        # 공통 감사 Data Properties
        class createdAt(DataProperty, FunctionalProperty):
            domain = [IntranetEntity]
            range  = [str]

        class createdBy(DataProperty, FunctionalProperty):
            domain = [IntranetEntity]
            range  = [str]

        class updatedAt(DataProperty, FunctionalProperty):
            domain = [IntranetEntity]
            range  = [str]

        class updatedBy(DataProperty, FunctionalProperty):
            domain = [IntranetEntity]
            range  = [str]

        # ─────────────────────────────────────────────
        # 조직 도메인
        # ─────────────────────────────────────────────
        class Department(IntranetEntity):
            """부서 (int_dept)"""

        class JobGrade(IntranetEntity):
            """직급 (int_jbgd)"""

        class User(IntranetEntity):
            """사용자 (int_user)"""

        # Department 속성
        class deptCode(DataProperty, FunctionalProperty):
            domain = [Department]; range = [str]

        class deptName(DataProperty, FunctionalProperty):
            domain = [Department]; range = [str]

        class deptLevel(DataProperty, FunctionalProperty):
            domain = [Department]; range = [int]

        class isActive(DataProperty, FunctionalProperty):
            domain = [IntranetEntity]; range = [bool]

        # JobGrade 속성
        class jobGradeCode(DataProperty, FunctionalProperty):
            domain = [JobGrade]; range = [str]

        class jobGradeName(DataProperty, FunctionalProperty):
            domain = [JobGrade]; range = [str]

        class jobGradeOrder(DataProperty, FunctionalProperty):
            domain = [JobGrade]; range = [int]

        # User 속성
        class userId(DataProperty, FunctionalProperty):
            domain = [User]; range = [str]

        class userName(DataProperty, FunctionalProperty):
            domain = [User]; range = [str]

        class email(DataProperty, FunctionalProperty):
            domain = [User]; range = [str]

        class mobile(DataProperty, FunctionalProperty):
            domain = [User]; range = [str]

        class gender(DataProperty, FunctionalProperty):
            domain = [User]; range = [str]

        class birthDate(DataProperty, FunctionalProperty):
            domain = [User]; range = [str]

        class hireDate(DataProperty, FunctionalProperty):
            domain = [User]; range = [str]

        class resignDate(DataProperty, FunctionalProperty):
            domain = [User]; range = [str]

        class userType(DataProperty, FunctionalProperty):
            domain = [User]; range = [str]

        # 조직 Object Properties
        class belongsToDept(ObjectProperty, FunctionalProperty):
            domain = [User]; range = [Department]
            label  = ["소속 부서"]

        class hasJobGrade(ObjectProperty, FunctionalProperty):
            domain = [User]; range = [JobGrade]
            label  = ["직급"]

        class hasParentDept(ObjectProperty, FunctionalProperty):
            domain = [Department]; range = [Department]
            label  = ["상위 부서"]

        # ─────────────────────────────────────────────
        # 공통 코드 도메인
        # ─────────────────────────────────────────────
        class CommonCode(IntranetEntity):
            """공통 코드 (int_com_code)"""

        class Menu(IntranetEntity):
            """메뉴 (int_menu)"""

        class cdCode(DataProperty, FunctionalProperty):
            domain = [CommonCode]; range = [str]

        class cdName(DataProperty, FunctionalProperty):
            domain = [CommonCode]; range = [str]

        class cdLevel(DataProperty, FunctionalProperty):
            domain = [CommonCode]; range = [int]

        class hasParentCode(ObjectProperty, FunctionalProperty):
            domain = [CommonCode]; range = [CommonCode]

        class menuId(DataProperty, FunctionalProperty):
            domain = [Menu]; range = [str]

        class menuName(DataProperty, FunctionalProperty):
            domain = [Menu]; range = [str]

        class isAdminMenu(DataProperty, FunctionalProperty):
            domain = [Menu]; range = [bool]

        # ─────────────────────────────────────────────
        # 파일 도메인
        # ─────────────────────────────────────────────
        class FileGroup(IntranetEntity):
            """파일 그룹 (int_com_file_grp)"""

        class File(IntranetEntity):
            """파일 메타데이터 (int_com_file)"""

        class FileEmbedding(IntranetEntity):
            """파일 임베딩 벡터 (int_com_file_emb)"""

        class fileGroupId(DataProperty, FunctionalProperty):
            domain = [FileGroup]; range = [str]

        class fileName(DataProperty, FunctionalProperty):
            domain = [File]; range = [str]

        class originalFileName(DataProperty, FunctionalProperty):
            domain = [File]; range = [str]

        class fileExtension(DataProperty, FunctionalProperty):
            domain = [File]; range = [str]

        class fileSize(DataProperty, FunctionalProperty):
            domain = [File]; range = [int]

        class filePath(DataProperty, FunctionalProperty):
            domain = [File]; range = [str]

        class embeddingModel(DataProperty, FunctionalProperty):
            domain = [FileEmbedding]; range = [str]

        class belongsToGroup(ObjectProperty, FunctionalProperty):
            domain = [File]; range = [FileGroup]

        class hasEmbedding(ObjectProperty):
            domain = [File]; range = [FileEmbedding]

        # ─────────────────────────────────────────────
        # 결재 도메인
        # ─────────────────────────────────────────────
        class ApprovalForm(IntranetEntity):
            """결재 양식 (int_aprv_form_mst)"""

        class ApprovalFormField(IntranetEntity):
            """결재 양식 항목 (int_aprv_form_dtl)"""

        class ApprovalRequest(IntranetEntity):
            """결재 요청 (int_aprv_req)"""

        class ApprovalStep(IntranetEntity):
            """결재 단계 (int_aprv_req_aprv)"""

        class ApprovalReference(IntranetEntity):
            """결재 참조 (int_aprv_req_ref)"""

        # ApprovalForm 속성
        class formId(DataProperty, FunctionalProperty):
            domain = [ApprovalForm]; range = [str]

        class formName(DataProperty, FunctionalProperty):
            domain = [ApprovalForm]; range = [str]

        class hasFileAttach(DataProperty, FunctionalProperty):
            domain = [ApprovalForm]; range = [bool]

        # ApprovalRequest 속성
        class requestSeq(DataProperty, FunctionalProperty):
            domain = [ApprovalRequest]; range = [int]

        class requestContent(DataProperty, FunctionalProperty):
            domain = [ApprovalRequest]; range = [str]

        class approvalResult(DataProperty, FunctionalProperty):
            domain = [ApprovalRequest]; range = [str]

        class requestDate(DataProperty, FunctionalProperty):
            domain = [ApprovalRequest]; range = [str]

        class viewCount(DataProperty, FunctionalProperty):
            domain = [ApprovalRequest]; range = [int]

        # ApprovalStep 속성
        class approvalOrder(DataProperty, FunctionalProperty):
            domain = [ApprovalStep]; range = [int]

        class approvalType(DataProperty, FunctionalProperty):
            domain = [ApprovalStep]; range = [str]

        class approvalDate(DataProperty, FunctionalProperty):
            domain = [ApprovalStep]; range = [str]

        class remark(DataProperty):
            domain = [IntranetEntity]; range = [str]

        # 결재 Object Properties
        class usesForm(ObjectProperty, FunctionalProperty):
            domain = [ApprovalRequest]; range = [ApprovalForm]
            label  = ["결재 양식 사용"]

        class submittedBy(ObjectProperty, FunctionalProperty):
            domain = [ApprovalRequest]; range = [User]
            label  = ["결재 요청자"]

        class hasApprovalStep(ObjectProperty):
            domain = [ApprovalRequest]; range = [ApprovalStep]
            label  = ["결재 단계"]

        class approvedBy(ObjectProperty, FunctionalProperty):
            domain = [ApprovalStep]; range = [User]
            label  = ["결재자"]

        class hasApprovalRef(ObjectProperty):
            domain = [ApprovalRequest]; range = [ApprovalReference]

        class referenceUser(ObjectProperty, FunctionalProperty):
            domain = [ApprovalReference]; range = [User]

        class hasFormField(ObjectProperty):
            domain = [ApprovalForm]; range = [ApprovalFormField]

        class attachedFile(ObjectProperty, FunctionalProperty):
            domain = [ApprovalRequest]; range = [FileGroup]

        # ─────────────────────────────────────────────
        # 휴가 도메인
        # ─────────────────────────────────────────────
        class LeaveType(IntranetEntity):
            """휴가 유형 (int_leave_mst)"""

        class LeaveDetail(IntranetEntity):
            """휴가 세부 유형 (int_leave_dtl)"""

        class LeavePolicy(IntranetEntity):
            """휴가 정책 (int_leave_pol)"""

        class LeaveRequest(IntranetEntity):
            """휴가 신청 (int_leave_req_mst)"""

        class LeaveDate(IntranetEntity):
            """휴가 사용 일자 (int_leave_req_dtl)"""

        class LeaveApprovalStep(IntranetEntity):
            """휴가 결재 단계 (int_leave_req_aprv)"""

        class LeaveReference(IntranetEntity):
            """휴가 참조 (int_leave_req_ref)"""

        # LeaveType 속성
        class leaveCode(DataProperty, FunctionalProperty):
            domain = [LeaveType]; range = [str]

        class leaveName(DataProperty, FunctionalProperty):
            domain = [LeaveType]; range = [str]

        class isPaid(DataProperty, FunctionalProperty):
            domain = [LeaveType]; range = [bool]

        # LeavePolicy 속성
        class policyCode(DataProperty, FunctionalProperty):
            domain = [LeavePolicy]; range = [str]

        class policyName(DataProperty, FunctionalProperty):
            domain = [LeavePolicy]; range = [str]

        class maxDays(DataProperty, FunctionalProperty):
            domain = [LeavePolicy]; range = [float]

        class leaveDays(DataProperty, FunctionalProperty):
            domain = [LeavePolicy]; range = [float]

        # LeaveRequest 속성
        class leaveReason(DataProperty, FunctionalProperty):
            domain = [LeaveRequest]; range = [str]

        class usedDays(DataProperty, FunctionalProperty):
            domain = [LeaveRequest]; range = [float]

        # LeaveDate 속성
        class leaveDate(DataProperty, FunctionalProperty):
            domain = [LeaveDate]; range = [str]

        class startTime(DataProperty, FunctionalProperty):
            domain = [LeaveDate]; range = [str]

        class endTime(DataProperty, FunctionalProperty):
            domain = [LeaveDate]; range = [str]

        # 휴가 Object Properties
        class requestedBy(ObjectProperty, FunctionalProperty):
            domain = [LeaveRequest]; range = [User]
            label  = ["휴가 신청자"]

        class usesLeaveType(ObjectProperty, FunctionalProperty):
            domain = [LeaveRequest]; range = [LeaveType]

        class usesLeaveDetail(ObjectProperty, FunctionalProperty):
            domain = [LeaveRequest]; range = [LeaveDetail]

        class hasLeaveDate(ObjectProperty):
            domain = [LeaveRequest]; range = [LeaveDate]

        class hasLeaveApprovalStep(ObjectProperty):
            domain = [LeaveRequest]; range = [LeaveApprovalStep]

        class leaveApprovedBy(ObjectProperty, FunctionalProperty):
            domain = [LeaveApprovalStep]; range = [User]

        class ofLeaveType(ObjectProperty, FunctionalProperty):
            domain = [LeaveDetail]; range = [LeaveType]

        # ─────────────────────────────────────────────
        # 게시판 도메인
        # ─────────────────────────────────────────────
        class Board(IntranetEntity):
            """게시판 (int_brd)"""

        class Post(IntranetEntity):
            """게시글 (int_pst)"""

        class Comment(IntranetEntity):
            """댓글 (int_pst_cmt)"""

        # Board 속성
        class boardId(DataProperty, FunctionalProperty):
            domain = [Board]; range = [str]

        class boardName(DataProperty, FunctionalProperty):
            domain = [Board]; range = [str]

        class boardType(DataProperty, FunctionalProperty):
            domain = [Board]; range = [str]

        class allowFile(DataProperty, FunctionalProperty):
            domain = [Board]; range = [bool]

        class allowComment(DataProperty, FunctionalProperty):
            domain = [Board]; range = [bool]

        # Post 속성
        class postSeq(DataProperty, FunctionalProperty):
            domain = [Post]; range = [int]

        class postTitle(DataProperty, FunctionalProperty):
            domain = [Post]; range = [str]

        class postContent(DataProperty, FunctionalProperty):
            domain = [Post]; range = [str]

        class isNotice(DataProperty, FunctionalProperty):
            domain = [Post]; range = [bool]

        class likeCount(DataProperty, FunctionalProperty):
            domain = [Post | Comment]; range = [int]

        # Comment 속성
        class commentLevel(DataProperty, FunctionalProperty):
            domain = [Comment]; range = [int]

        class commentTitle(DataProperty, FunctionalProperty):
            domain = [Comment]; range = [str]

        class commentContent(DataProperty, FunctionalProperty):
            domain = [Comment]; range = [str]

        # 게시판 Object Properties
        class postedIn(ObjectProperty, FunctionalProperty):
            domain = [Post]; range = [Board]
            label  = ["게시판 소속"]

        class writtenBy(ObjectProperty, FunctionalProperty):
            domain = [Post]; range = [User]
            label  = ["작성자"]

        class commentOn(ObjectProperty, FunctionalProperty):
            domain = [Comment]; range = [Post]
            label  = ["댓글 대상"]

        class commentBy(ObjectProperty, FunctionalProperty):
            domain = [Comment]; range = [User]

        class parentComment(ObjectProperty, FunctionalProperty):
            domain = [Comment]; range = [Comment]

        class postHasFile(ObjectProperty, FunctionalProperty):
            domain = [Post]; range = [FileGroup]

        class ownedByDept(ObjectProperty, FunctionalProperty):
            domain = [Board]; range = [Department]

        # ─────────────────────────────────────────────
        # 일정 도메인
        # ─────────────────────────────────────────────
        class Schedule(IntranetEntity):
            """일정 (int_schd)"""

        class ScheduleAttendee(IntranetEntity):
            """일정 참석자 (int_schd_attd)"""

        class ScheduleException(IntranetEntity):
            """일정 예외일 (int_schd_excp)"""

        class scheduleName(DataProperty, FunctionalProperty):
            domain = [Schedule]; range = [str]

        class scheduleStartDate(DataProperty, FunctionalProperty):
            domain = [Schedule]; range = [str]

        class scheduleEndDate(DataProperty, FunctionalProperty):
            domain = [Schedule]; range = [str]

        class scheduleStartTime(DataProperty, FunctionalProperty):
            domain = [Schedule]; range = [str]

        class scheduleEndTime(DataProperty, FunctionalProperty):
            domain = [Schedule]; range = [str]

        class isRecurring(DataProperty, FunctionalProperty):
            domain = [Schedule]; range = [bool]

        class recurringType(DataProperty, FunctionalProperty):
            domain = [Schedule]; range = [str]

        class exceptionDate(DataProperty, FunctionalProperty):
            domain = [ScheduleException]; range = [str]

        class createdByUser(ObjectProperty, FunctionalProperty):
            domain = [Schedule]; range = [User]

        class scheduledForDept(ObjectProperty, FunctionalProperty):
            domain = [Schedule]; range = [Department]

        class hasAttendee(ObjectProperty):
            domain = [Schedule]; range = [ScheduleAttendee]

        class attendeeUser(ObjectProperty, FunctionalProperty):
            domain = [ScheduleAttendee]; range = [User]

        class hasException(ObjectProperty):
            domain = [Schedule]; range = [ScheduleException]

        # ─────────────────────────────────────────────
        # 시설 예약 도메인
        # ─────────────────────────────────────────────
        class MeetingRoom(IntranetEntity):
            """회의실 (int_mtgr)"""

        class MeetingRoomReservation(IntranetEntity):
            """회의실 예약 (int_mtgr_rsv)"""

        class Vehicle(IntranetEntity):
            """차량 (int_veh)"""

        class VehicleReservation(IntranetEntity):
            """차량 예약 (int_veh_rsv)"""

        class resourceId(DataProperty, FunctionalProperty):
            domain = [MeetingRoom | Vehicle]; range = [str]

        class resourceName(DataProperty, FunctionalProperty):
            domain = [MeetingRoom | Vehicle]; range = [str]

        class resourceType(DataProperty, FunctionalProperty):
            domain = [MeetingRoom | Vehicle]; range = [str]

        class location(DataProperty, FunctionalProperty):
            domain = [MeetingRoom]; range = [str]

        class vehicleNumber(DataProperty, FunctionalProperty):
            domain = [Vehicle]; range = [str]

        class reservationStartDate(DataProperty, FunctionalProperty):
            domain = [MeetingRoomReservation | VehicleReservation]; range = [str]

        class reservationEndDate(DataProperty, FunctionalProperty):
            domain = [MeetingRoomReservation | VehicleReservation]; range = [str]

        class reservationStartTime(DataProperty, FunctionalProperty):
            domain = [MeetingRoomReservation | VehicleReservation]; range = [str]

        class reservationEndTime(DataProperty, FunctionalProperty):
            domain = [MeetingRoomReservation | VehicleReservation]; range = [str]

        class isReturned(DataProperty, FunctionalProperty):
            domain = [VehicleReservation]; range = [bool]

        class isExtended(DataProperty, FunctionalProperty):
            domain = [MeetingRoomReservation | VehicleReservation]; range = [bool]

        class reservedMeetingRoom(ObjectProperty, FunctionalProperty):
            domain = [MeetingRoomReservation]; range = [MeetingRoom]

        class meetingRoomReservedBy(ObjectProperty, FunctionalProperty):
            domain = [MeetingRoomReservation]; range = [User]

        class reservedVehicle(ObjectProperty, FunctionalProperty):
            domain = [VehicleReservation]; range = [Vehicle]

        class vehicleReservedBy(ObjectProperty, FunctionalProperty):
            domain = [VehicleReservation]; range = [User]

        class meetingRoomOwnedByDept(ObjectProperty, FunctionalProperty):
            domain = [MeetingRoom]; range = [Department]

        class vehicleOwnedByDept(ObjectProperty, FunctionalProperty):
            domain = [Vehicle]; range = [Department]

        # ─────────────────────────────────────────────
        # 근무 도메인
        # ─────────────────────────────────────────────
        class Workplace(IntranetEntity):
            """근무지 (int_wkpl)"""

        class WorkLog(IntranetEntity):
            """근무 기록 (int_work)"""

        class WorkTimeChangeRequest(IntranetEntity):
            """근무 시간 변경 요청 (int_work_chg)"""

        class WorkTimeChangeApproval(IntranetEntity):
            """근무 시간 변경 결재 (int_work_chg_aprv)"""

        class workplaceCode(DataProperty, FunctionalProperty):
            domain = [Workplace]; range = [str]

        class workplaceName(DataProperty, FunctionalProperty):
            domain = [Workplace]; range = [str]

        class workStartTime(DataProperty, FunctionalProperty):
            domain = [Workplace]; range = [str]

        class workEndTime(DataProperty, FunctionalProperty):
            domain = [Workplace]; range = [str]

        class useLocationCheck(DataProperty, FunctionalProperty):
            domain = [Workplace]; range = [bool]

        class workDate(DataProperty, FunctionalProperty):
            domain = [WorkLog]; range = [str]

        class checkedIn(DataProperty, FunctionalProperty):
            domain = [WorkLog]; range = [bool]

        class checkedOut(DataProperty, FunctionalProperty):
            domain = [WorkLog]; range = [bool]

        class changeReason(DataProperty, FunctionalProperty):
            domain = [WorkTimeChangeRequest]; range = [str]

        class changedStartTime(DataProperty, FunctionalProperty):
            domain = [WorkTimeChangeRequest]; range = [str]

        class changedEndTime(DataProperty, FunctionalProperty):
            domain = [WorkTimeChangeRequest]; range = [str]

        class worksAt(ObjectProperty, FunctionalProperty):
            domain = [WorkLog]; range = [Workplace]
            label  = ["근무지"]

        class workLogOf(ObjectProperty, FunctionalProperty):
            domain = [WorkLog]; range = [User]

        class workChangeRequestBy(ObjectProperty, FunctionalProperty):
            domain = [WorkTimeChangeRequest]; range = [User]

        class hasWorkChangeRequest(ObjectProperty):
            domain = [WorkLog]; range = [WorkTimeChangeRequest]

        class workChangeApprovedBy(ObjectProperty, FunctionalProperty):
            domain = [WorkTimeChangeApproval]; range = [User]

        class hasWorkChangeApproval(ObjectProperty):
            domain = [WorkTimeChangeRequest]; range = [WorkTimeChangeApproval]

        # ─────────────────────────────────────────────
        # 보고서 도메인
        # ─────────────────────────────────────────────
        class ReportForm(IntranetEntity):
            """보고서 양식 (int_rpt_form)"""

        class ReportRound(IntranetEntity):
            """보고서 회차 (int_rpt_round)"""

        class ReportEntry(IntranetEntity):
            """보고서 제출 (int_rpt_desc)"""

        class reportFormId(DataProperty, FunctionalProperty):
            domain = [ReportForm]; range = [str]

        class reportTitle(DataProperty, FunctionalProperty):
            domain = [ReportForm]; range = [str]

        class reportPeriodType(DataProperty, FunctionalProperty):
            domain = [ReportForm]; range = [str]

        class isPublic(DataProperty, FunctionalProperty):
            domain = [ReportForm]; range = [bool]

        class roundName(DataProperty, FunctionalProperty):
            domain = [ReportRound]; range = [str]

        class roundDate(DataProperty, FunctionalProperty):
            domain = [ReportRound]; range = [str]

        class execContent(DataProperty, FunctionalProperty):
            domain = [ReportEntry]; range = [str]

        class planContent(DataProperty, FunctionalProperty):
            domain = [ReportEntry]; range = [str]

        class isSubmitted(DataProperty, FunctionalProperty):
            domain = [ReportEntry]; range = [bool]

        class submitDate(DataProperty, FunctionalProperty):
            domain = [ReportEntry]; range = [str]

        class reportManagedBy(ObjectProperty, FunctionalProperty):
            domain = [ReportForm]; range = [User]
            label  = ["보고서 관리자"]

        class reportBelongsToDept(ObjectProperty, FunctionalProperty):
            domain = [ReportForm]; range = [Department]

        class hasRound(ObjectProperty):
            domain = [ReportForm]; range = [ReportRound]

        class roundOf(ObjectProperty, FunctionalProperty):
            domain = [ReportRound]; range = [ReportForm]

        class hasEntry(ObjectProperty):
            domain = [ReportRound]; range = [ReportEntry]

        class entrySubmittedBy(ObjectProperty, FunctionalProperty):
            domain = [ReportEntry]; range = [User]

        # ─────────────────────────────────────────────
        # AI / 채팅 도메인
        # ─────────────────────────────────────────────
        class Guardrail(IntranetEntity):
            """가드레일 (int_chat_grdl)"""

        class ChatMessage(IntranetEntity):
            """채팅 메시지 (int_chat_history)"""

        class guardrailCode(DataProperty, FunctionalProperty):
            domain = [Guardrail]; range = [str]

        class guardrailType(DataProperty, FunctionalProperty):
            domain = [Guardrail]; range = [str]

        class guardrailKeyword(DataProperty, FunctionalProperty):
            domain = [Guardrail]; range = [str]

        class embeddingModel2(DataProperty, FunctionalProperty):
            domain = [Guardrail]; range = [str]

        class sessionId(DataProperty, FunctionalProperty):
            domain = [ChatMessage]; range = [str]

        class messageSeq(DataProperty, FunctionalProperty):
            domain = [ChatMessage]; range = [int]

        class messageRole(DataProperty, FunctionalProperty):
            domain = [ChatMessage]; range = [str]

        class messageContent(DataProperty, FunctionalProperty):
            domain = [ChatMessage]; range = [str]

        class isGuardrailTriggered(DataProperty, FunctionalProperty):
            domain = [ChatMessage]; range = [bool]

        class tokenCount(DataProperty, FunctionalProperty):
            domain = [ChatMessage]; range = [int]

        class chatDate(DataProperty, FunctionalProperty):
            domain = [ChatMessage]; range = [str]

        class sentBy(ObjectProperty, FunctionalProperty):
            domain = [ChatMessage]; range = [User]
            label  = ["채팅 발신자"]

        class triggeredGuardrail(ObjectProperty, FunctionalProperty):
            domain = [ChatMessage]; range = [Guardrail]

        class chatRelatedMenu(ObjectProperty, FunctionalProperty):
            domain = [ChatMessage]; range = [Menu]

        class chatAttachedFile(ObjectProperty, FunctionalProperty):
            domain = [ChatMessage]; range = [FileGroup]

        # 사용자 결재선 도메인 (UserApprovalLevel)
        class UserApprovalLevel(IntranetEntity):
            """사용자 결재선 (int_user_aprvl)"""

        class approvalLevelName(DataProperty, FunctionalProperty):
            domain = [UserApprovalLevel]; range = [str]

        class levelOwnedBy(ObjectProperty, FunctionalProperty):
            domain = [UserApprovalLevel]; range = [User]

        class levelApprover(ObjectProperty):
            domain = [UserApprovalLevel]; range = [User]

    return onto


def main():
    onto = build_ontology()
    onto.save(file=OUTPUT, format="rdfxml")
    print(f"✅ 온톨로지 생성 완료: {OUTPUT}")

    # 통계 출력
    classes     = list(onto.classes())
    obj_props   = list(onto.object_properties())
    data_props  = list(onto.data_properties())
    print(f"   클래스 수:            {len(classes)}")
    print(f"   Object Property 수:  {len(obj_props)}")
    print(f"   Data Property 수:    {len(data_props)}")


if __name__ == "__main__":
    main()
