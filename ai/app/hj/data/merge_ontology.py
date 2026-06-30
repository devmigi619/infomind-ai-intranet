"""
온톨로지 병합 스크립트
- 사용자 작성 파일(Untitled.owx)의 클래스 계층 구조를 베이스로 유지
- Data Property 전체 추가
- 누락된 Object Property 추가
- writtendBy 오타 → writtenBy 수정
- 새 클래스(FileEmbedding, WorkTimeChangeApproval, LeaveApprovalStep, LeaveReference, UserApprovalLevel) 추가
"""
from owlready2 import *

FILE = "/Users/infomind/dev/protege_data/Untitled.owx"
onto = get_ontology(f"file://{FILE}").load()

# ── 기존 클래스 별칭 ──────────────────────────────
_AI              = onto.AI
_Approval        = onto.Approval
_Board           = onto.Board
_Common          = onto.Common
_Facility        = onto.Facility
_Leave           = onto.Leave
_Organization    = onto.Organization
_Report          = onto.Report
_Schedule        = onto.Schedule
_Work            = onto.Work

_User                    = onto.User
_Department              = onto.Department
_JobGrade                = onto.JobGrade
_ApprovalForm            = onto.ApprovalForm
_ApprovalFormField       = onto.ApprovalFormField
_ApprovalRequest         = onto.ApprovalRequest
_ApprovalStep            = onto.ApprovalStep
_ApprovalReference       = onto.ApprovalReference
_BoardType               = onto.BoardType
_Post                    = onto.Post
_Comment                 = onto.Comment
_ChatMessage             = onto.ChatMessage
_ChatSession             = onto.ChatSession
_Guardrail               = onto.Guardrail
_CommonCode              = onto.CommonCode
_File                    = onto.File
_FileGroup               = onto.FileGroup
_Menu                    = onto.Menu
_MeetingRoom             = onto.MeetingRoom
_MettingRoomReservation  = onto.MettingRoomReservation
_Vehicle                 = onto.Vehicle
_VehicleReservation      = onto.VehicleReservation
_LeaveType               = onto.LeaveType
_LeaveDetail             = onto.LeaveDetail
_LeavePolicy             = onto.LeavePolicy
_LeaveRequest            = onto.LeaveRequest
_LeaveDate               = onto.LeaveDate
_ReportForm              = onto.ReportForm
_ReportRound             = onto.ReportRound
_ReportEntry             = onto.ReportEntry
_ScheduleAttend          = onto.ScheduleAttend
_ScheduleException       = onto.ScheduleException
_ScheduleType            = onto.ScheduleType
_WorkLog                 = onto.WorkLog
_WorkPlace               = onto.WorkPlace
_WorkTimeChangeRequest   = onto.WorkTimeChangeRequest

with onto:

    # ── 오타 수정: writtendBy → writtenBy ──────────
    destroy_entity(onto.writtendBy)

    class writtenBy(ObjectProperty, FunctionalProperty):
        domain = [_Post]
        range  = [_User]
        label  = ["작성자"]

    # ── 신규 클래스 ──────────────────────────────────
    class FileEmbedding(_Common):
        """파일 임베딩 벡터 (int_com_file_emb)"""

    class WorkTimeChangeApproval(_Work):
        """근무시간 변경 결재 (int_work_chg_aprv)"""

    class LeaveApprovalStep(_Leave):
        """휴가 결재 단계 (int_leave_req_aprv)"""

    class LeaveReference(_Leave):
        """휴가 참조 (int_leave_req_ref)"""

    class UserApprovalLevel(_Organization):
        """사용자 결재선 (int_user_aprvl)"""

    # ── 누락 Object Property ─────────────────────────
    class hasParentDept(ObjectProperty, FunctionalProperty):
        domain = [_Department]; range = [_Department]
        label  = ["상위 부서"]

    class hasApprovalStep(ObjectProperty):
        domain = [_ApprovalRequest]; range = [_ApprovalStep]

    class hasApprovalRef(ObjectProperty):
        domain = [_ApprovalRequest]; range = [_ApprovalReference]

    class referenceUser(ObjectProperty, FunctionalProperty):
        domain = [_ApprovalReference]; range = [_User]

    class hasFormField(ObjectProperty):
        domain = [_ApprovalForm]; range = [_ApprovalFormField]

    class attachedFile(ObjectProperty, FunctionalProperty):
        domain = [_ApprovalRequest]; range = [_FileGroup]

    class usesLeaveType(ObjectProperty, FunctionalProperty):
        domain = [_LeaveRequest]; range = [_LeaveType]

    class usesLeaveDetail(ObjectProperty, FunctionalProperty):
        domain = [_LeaveRequest]; range = [_LeaveDetail]

    class hasLeaveDate(ObjectProperty):
        domain = [_LeaveRequest]; range = [_LeaveDate]

    class hasLeaveApprovalStep(ObjectProperty):
        domain = [_LeaveRequest]; range = [LeaveApprovalStep]

    class leaveApprovedBy(ObjectProperty, FunctionalProperty):
        domain = [LeaveApprovalStep]; range = [_User]

    class ofLeaveType(ObjectProperty, FunctionalProperty):
        domain = [_LeaveDetail]; range = [_LeaveType]

    class commentBy(ObjectProperty, FunctionalProperty):
        domain = [_Comment]; range = [_User]

    class parentComment(ObjectProperty, FunctionalProperty):
        domain = [_Comment]; range = [_Comment]

    class postHasFile(ObjectProperty, FunctionalProperty):
        domain = [_Post]; range = [_FileGroup]

    class ownedByDept(ObjectProperty, FunctionalProperty):
        domain = [_Board]; range = [_Department]

    class createdByUser(ObjectProperty, FunctionalProperty):
        domain = [_Schedule]; range = [_User]

    class scheduledForDept(ObjectProperty, FunctionalProperty):
        domain = [_Schedule]; range = [_Department]

    class hasAttendee(ObjectProperty):
        domain = [_Schedule]; range = [_ScheduleAttend]

    class attendeeUser(ObjectProperty, FunctionalProperty):
        domain = [_ScheduleAttend]; range = [_User]

    class hasException(ObjectProperty):
        domain = [_Schedule]; range = [_ScheduleException]

    class reservedMeetingRoom(ObjectProperty, FunctionalProperty):
        domain = [_MettingRoomReservation]; range = [_MeetingRoom]

    class meetingRoomOwnedByDept(ObjectProperty, FunctionalProperty):
        domain = [_MeetingRoom]; range = [_Department]

    class reservedVehicle(ObjectProperty, FunctionalProperty):
        domain = [_VehicleReservation]; range = [_Vehicle]

    class vehicleReservedBy(ObjectProperty, FunctionalProperty):
        domain = [_VehicleReservation]; range = [_User]

    class vehicleOwnedByDept(ObjectProperty, FunctionalProperty):
        domain = [_Vehicle]; range = [_Department]

    class workLogOf(ObjectProperty, FunctionalProperty):
        domain = [_WorkLog]; range = [_User]

    class workChangeRequestBy(ObjectProperty, FunctionalProperty):
        domain = [_WorkTimeChangeRequest]; range = [_User]

    class hasWorkChangeRequest(ObjectProperty):
        domain = [_WorkLog]; range = [_WorkTimeChangeRequest]

    class workChangeApprovedBy(ObjectProperty, FunctionalProperty):
        domain = [WorkTimeChangeApproval]; range = [_User]

    class hasWorkChangeApproval(ObjectProperty):
        domain = [_WorkTimeChangeRequest]; range = [WorkTimeChangeApproval]

    class reportManagedBy(ObjectProperty, FunctionalProperty):
        domain = [_ReportForm]; range = [_User]

    class reportBelongsToDept(ObjectProperty, FunctionalProperty):
        domain = [_ReportForm]; range = [_Department]

    class hasRound(ObjectProperty):
        domain = [_ReportForm]; range = [_ReportRound]

    class roundOf(ObjectProperty, FunctionalProperty):
        domain = [_ReportRound]; range = [_ReportForm]

    class hasEntry(ObjectProperty):
        domain = [_ReportRound]; range = [_ReportEntry]

    class entrySubmittedBy(ObjectProperty, FunctionalProperty):
        domain = [_ReportEntry]; range = [_User]

    class sentBy(ObjectProperty, FunctionalProperty):
        domain = [_ChatMessage]; range = [_User]

    class triggeredGuardrail(ObjectProperty, FunctionalProperty):
        domain = [_ChatMessage]; range = [_Guardrail]

    class chatRelatedMenu(ObjectProperty, FunctionalProperty):
        domain = [_ChatMessage]; range = [_Menu]

    class chatAttachedFile(ObjectProperty, FunctionalProperty):
        domain = [_ChatMessage]; range = [_FileGroup]

    class levelOwnedBy(ObjectProperty, FunctionalProperty):
        domain = [UserApprovalLevel]; range = [_User]

    class levelApprover(ObjectProperty):
        domain = [UserApprovalLevel]; range = [_User]

    class belongsToGroup(ObjectProperty, FunctionalProperty):
        domain = [_File]; range = [_FileGroup]

    class hasEmbedding(ObjectProperty):
        domain = [_File]; range = [FileEmbedding]

    class hasParentCode(ObjectProperty, FunctionalProperty):
        domain = [_CommonCode]; range = [_CommonCode]

    # ── Data Properties ──────────────────────────────

    # 공통 감사 속성
    class createdAt(DataProperty, FunctionalProperty):
        domain = [Thing]; range = [str]

    class createdBy(DataProperty, FunctionalProperty):
        domain = [Thing]; range = [str]

    class updatedAt(DataProperty, FunctionalProperty):
        domain = [Thing]; range = [str]

    class updatedBy(DataProperty, FunctionalProperty):
        domain = [Thing]; range = [str]

    class isActive(DataProperty, FunctionalProperty):
        domain = [Thing]; range = [bool]

    class remark(DataProperty):
        domain = [Thing]; range = [str]

    # Department
    class deptCode(DataProperty, FunctionalProperty):
        domain = [_Department]; range = [str]

    class deptName(DataProperty, FunctionalProperty):
        domain = [_Department]; range = [str]

    class deptLevel(DataProperty, FunctionalProperty):
        domain = [_Department]; range = [int]

    # JobGrade
    class jobGradeCode(DataProperty, FunctionalProperty):
        domain = [_JobGrade]; range = [str]

    class jobGradeName(DataProperty, FunctionalProperty):
        domain = [_JobGrade]; range = [str]

    class jobGradeOrder(DataProperty, FunctionalProperty):
        domain = [_JobGrade]; range = [int]

    # User
    class userId(DataProperty, FunctionalProperty):
        domain = [_User]; range = [str]

    class userName(DataProperty, FunctionalProperty):
        domain = [_User]; range = [str]

    class emailAddr(DataProperty, FunctionalProperty):
        domain = [_User]; range = [str]

    class mobile(DataProperty, FunctionalProperty):
        domain = [_User]; range = [str]

    class gender(DataProperty, FunctionalProperty):
        domain = [_User]; range = [str]

    class birthDate(DataProperty, FunctionalProperty):
        domain = [_User]; range = [str]

    class hireDate(DataProperty, FunctionalProperty):
        domain = [_User]; range = [str]

    class resignDate(DataProperty, FunctionalProperty):
        domain = [_User]; range = [str]

    class userType(DataProperty, FunctionalProperty):
        domain = [_User]; range = [str]

    # CommonCode
    class cdCode(DataProperty, FunctionalProperty):
        domain = [_CommonCode]; range = [str]

    class cdName(DataProperty, FunctionalProperty):
        domain = [_CommonCode]; range = [str]

    class cdLevel(DataProperty, FunctionalProperty):
        domain = [_CommonCode]; range = [int]

    # Menu
    class menuId(DataProperty, FunctionalProperty):
        domain = [_Menu]; range = [str]

    class menuName(DataProperty, FunctionalProperty):
        domain = [_Menu]; range = [str]

    class isAdminMenu(DataProperty, FunctionalProperty):
        domain = [_Menu]; range = [bool]

    # FileGroup / File / FileEmbedding
    class fileGroupId(DataProperty, FunctionalProperty):
        domain = [_FileGroup]; range = [str]

    class fileName(DataProperty, FunctionalProperty):
        domain = [_File]; range = [str]

    class originalFileName(DataProperty, FunctionalProperty):
        domain = [_File]; range = [str]

    class fileExtension(DataProperty, FunctionalProperty):
        domain = [_File]; range = [str]

    class fileSize(DataProperty, FunctionalProperty):
        domain = [_File]; range = [int]

    class filePath(DataProperty, FunctionalProperty):
        domain = [_File]; range = [str]

    class embeddingModel(DataProperty, FunctionalProperty):
        domain = [FileEmbedding]; range = [str]

    # ApprovalForm
    class formId(DataProperty, FunctionalProperty):
        domain = [_ApprovalForm]; range = [str]

    class formName(DataProperty, FunctionalProperty):
        domain = [_ApprovalForm]; range = [str]

    class hasFileAttach(DataProperty, FunctionalProperty):
        domain = [_ApprovalForm]; range = [bool]

    # ApprovalRequest
    class requestSeq(DataProperty, FunctionalProperty):
        domain = [_ApprovalRequest]; range = [int]

    class requestContent(DataProperty, FunctionalProperty):
        domain = [_ApprovalRequest]; range = [str]

    class approvalResult(DataProperty, FunctionalProperty):
        domain = [_ApprovalRequest]; range = [str]

    class requestDate(DataProperty, FunctionalProperty):
        domain = [_ApprovalRequest]; range = [str]

    class viewCount(DataProperty, FunctionalProperty):
        domain = [_ApprovalRequest]; range = [int]

    # ApprovalStep
    class approvalOrder(DataProperty, FunctionalProperty):
        domain = [_ApprovalStep]; range = [int]

    class approvalType(DataProperty, FunctionalProperty):
        domain = [_ApprovalStep]; range = [str]

    class approvalDate(DataProperty, FunctionalProperty):
        domain = [_ApprovalStep]; range = [str]

    # LeaveType
    class leaveCode(DataProperty, FunctionalProperty):
        domain = [_LeaveType]; range = [str]

    class leaveName(DataProperty, FunctionalProperty):
        domain = [_LeaveType]; range = [str]

    class isPaid(DataProperty, FunctionalProperty):
        domain = [_LeaveType]; range = [bool]

    # LeavePolicy
    class policyCode(DataProperty, FunctionalProperty):
        domain = [_LeavePolicy]; range = [str]

    class policyName(DataProperty, FunctionalProperty):
        domain = [_LeavePolicy]; range = [str]

    class maxDays(DataProperty, FunctionalProperty):
        domain = [_LeavePolicy]; range = [float]

    class leaveDays(DataProperty, FunctionalProperty):
        domain = [_LeavePolicy]; range = [float]

    # LeaveRequest
    class leaveReason(DataProperty, FunctionalProperty):
        domain = [_LeaveRequest]; range = [str]

    class usedDays(DataProperty, FunctionalProperty):
        domain = [_LeaveRequest]; range = [float]

    # LeaveDate
    class leaveDate(DataProperty, FunctionalProperty):
        domain = [_LeaveDate]; range = [str]

    class startTime(DataProperty, FunctionalProperty):
        domain = [_LeaveDate]; range = [str]

    class endTime(DataProperty, FunctionalProperty):
        domain = [_LeaveDate]; range = [str]

    # Board
    class boardId(DataProperty, FunctionalProperty):
        domain = [_Board]; range = [str]

    class boardName(DataProperty, FunctionalProperty):
        domain = [_Board]; range = [str]

    class boardType(DataProperty, FunctionalProperty):
        domain = [_Board]; range = [str]

    class allowFile(DataProperty, FunctionalProperty):
        domain = [_Board]; range = [bool]

    class allowComment(DataProperty, FunctionalProperty):
        domain = [_Board]; range = [bool]

    # Post
    class postSeq(DataProperty, FunctionalProperty):
        domain = [_Post]; range = [int]

    class postTitle(DataProperty, FunctionalProperty):
        domain = [_Post]; range = [str]

    class postContent(DataProperty, FunctionalProperty):
        domain = [_Post]; range = [str]

    class isNotice(DataProperty, FunctionalProperty):
        domain = [_Post]; range = [bool]

    class likeCount(DataProperty, FunctionalProperty):
        domain = [_Post]; range = [int]

    # Comment
    class commentLevel(DataProperty, FunctionalProperty):
        domain = [_Comment]; range = [int]

    class commentTitle(DataProperty, FunctionalProperty):
        domain = [_Comment]; range = [str]

    class commentContent(DataProperty, FunctionalProperty):
        domain = [_Comment]; range = [str]

    class commentLikeCount(DataProperty, FunctionalProperty):
        domain = [_Comment]; range = [int]

    # Schedule
    class scheduleName(DataProperty, FunctionalProperty):
        domain = [_Schedule]; range = [str]

    class scheduleStartDate(DataProperty, FunctionalProperty):
        domain = [_Schedule]; range = [str]

    class scheduleEndDate(DataProperty, FunctionalProperty):
        domain = [_Schedule]; range = [str]

    class scheduleStartTime(DataProperty, FunctionalProperty):
        domain = [_Schedule]; range = [str]

    class scheduleEndTime(DataProperty, FunctionalProperty):
        domain = [_Schedule]; range = [str]

    class isRecurring(DataProperty, FunctionalProperty):
        domain = [_Schedule]; range = [bool]

    class recurringType(DataProperty, FunctionalProperty):
        domain = [_Schedule]; range = [str]

    class exceptionDate(DataProperty, FunctionalProperty):
        domain = [_ScheduleException]; range = [str]

    # MeetingRoom
    class meetingRoomId(DataProperty, FunctionalProperty):
        domain = [_MeetingRoom]; range = [str]

    class meetingRoomName(DataProperty, FunctionalProperty):
        domain = [_MeetingRoom]; range = [str]

    class meetingRoomType(DataProperty, FunctionalProperty):
        domain = [_MeetingRoom]; range = [str]

    class location(DataProperty, FunctionalProperty):
        domain = [_MeetingRoom]; range = [str]

    class mtgrReservationStartDate(DataProperty, FunctionalProperty):
        domain = [_MettingRoomReservation]; range = [str]

    class mtgrReservationEndDate(DataProperty, FunctionalProperty):
        domain = [_MettingRoomReservation]; range = [str]

    class mtgrReservationStartTime(DataProperty, FunctionalProperty):
        domain = [_MettingRoomReservation]; range = [str]

    class mtgrReservationEndTime(DataProperty, FunctionalProperty):
        domain = [_MettingRoomReservation]; range = [str]

    class mtgrIsExtended(DataProperty, FunctionalProperty):
        domain = [_MettingRoomReservation]; range = [bool]

    # Vehicle
    class vehicleId(DataProperty, FunctionalProperty):
        domain = [_Vehicle]; range = [str]

    class vehicleName(DataProperty, FunctionalProperty):
        domain = [_Vehicle]; range = [str]

    class vehicleNumber(DataProperty, FunctionalProperty):
        domain = [_Vehicle]; range = [str]

    class vehicleType(DataProperty, FunctionalProperty):
        domain = [_Vehicle]; range = [str]

    class vehReservationStartDate(DataProperty, FunctionalProperty):
        domain = [_VehicleReservation]; range = [str]

    class vehReservationEndDate(DataProperty, FunctionalProperty):
        domain = [_VehicleReservation]; range = [str]

    class vehReservationStartTime(DataProperty, FunctionalProperty):
        domain = [_VehicleReservation]; range = [str]

    class vehReservationEndTime(DataProperty, FunctionalProperty):
        domain = [_VehicleReservation]; range = [str]

    class isReturned(DataProperty, FunctionalProperty):
        domain = [_VehicleReservation]; range = [bool]

    class vehIsExtended(DataProperty, FunctionalProperty):
        domain = [_VehicleReservation]; range = [bool]

    # Workplace
    class workplaceCode(DataProperty, FunctionalProperty):
        domain = [_WorkPlace]; range = [str]

    class workplaceName(DataProperty, FunctionalProperty):
        domain = [_WorkPlace]; range = [str]

    class workStandardStartTime(DataProperty, FunctionalProperty):
        domain = [_WorkPlace]; range = [str]

    class workStandardEndTime(DataProperty, FunctionalProperty):
        domain = [_WorkPlace]; range = [str]

    class useLocationCheck(DataProperty, FunctionalProperty):
        domain = [_WorkPlace]; range = [bool]

    # WorkLog
    class workDate(DataProperty, FunctionalProperty):
        domain = [_WorkLog]; range = [str]

    class checkedIn(DataProperty, FunctionalProperty):
        domain = [_WorkLog]; range = [bool]

    class checkedOut(DataProperty, FunctionalProperty):
        domain = [_WorkLog]; range = [bool]

    # WorkTimeChangeRequest
    class changeReason(DataProperty, FunctionalProperty):
        domain = [_WorkTimeChangeRequest]; range = [str]

    class changedStartTime(DataProperty, FunctionalProperty):
        domain = [_WorkTimeChangeRequest]; range = [str]

    class changedEndTime(DataProperty, FunctionalProperty):
        domain = [_WorkTimeChangeRequest]; range = [str]

    # ReportForm
    class reportFormId(DataProperty, FunctionalProperty):
        domain = [_ReportForm]; range = [str]

    class reportTitle(DataProperty, FunctionalProperty):
        domain = [_ReportForm]; range = [str]

    class reportPeriodType(DataProperty, FunctionalProperty):
        domain = [_ReportForm]; range = [str]

    class isPublic(DataProperty, FunctionalProperty):
        domain = [_ReportForm]; range = [bool]

    # ReportRound
    class roundName(DataProperty, FunctionalProperty):
        domain = [_ReportRound]; range = [str]

    class roundDate(DataProperty, FunctionalProperty):
        domain = [_ReportRound]; range = [str]

    # ReportEntry
    class execContent(DataProperty, FunctionalProperty):
        domain = [_ReportEntry]; range = [str]

    class planContent(DataProperty, FunctionalProperty):
        domain = [_ReportEntry]; range = [str]

    class isSubmitted(DataProperty, FunctionalProperty):
        domain = [_ReportEntry]; range = [bool]

    class submitDate(DataProperty, FunctionalProperty):
        domain = [_ReportEntry]; range = [str]

    # Guardrail
    class guardrailCode(DataProperty, FunctionalProperty):
        domain = [_Guardrail]; range = [str]

    class guardrailType(DataProperty, FunctionalProperty):
        domain = [_Guardrail]; range = [str]

    class guardrailKeyword(DataProperty, FunctionalProperty):
        domain = [_Guardrail]; range = [str]

    # ChatMessage
    class sessionId(DataProperty, FunctionalProperty):
        domain = [_ChatMessage]; range = [str]

    class messageSeq(DataProperty, FunctionalProperty):
        domain = [_ChatMessage]; range = [int]

    class messageRole(DataProperty, FunctionalProperty):
        domain = [_ChatMessage]; range = [str]

    class messageContent(DataProperty, FunctionalProperty):
        domain = [_ChatMessage]; range = [str]

    class isGuardrailTriggered(DataProperty, FunctionalProperty):
        domain = [_ChatMessage]; range = [bool]

    class tokenCount(DataProperty, FunctionalProperty):
        domain = [_ChatMessage]; range = [int]

    class chatDate(DataProperty, FunctionalProperty):
        domain = [_ChatMessage]; range = [str]

    # UserApprovalLevel
    class approvalLevelName(DataProperty, FunctionalProperty):
        domain = [UserApprovalLevel]; range = [str]


onto.save(file=FILE, format="rdfxml")

# 통계
classes    = list(onto.classes())
obj_props  = list(onto.object_properties())
data_props = list(onto.data_properties())
print(f"✅ 병합 완료: {FILE}")
print(f"   클래스 수:           {len(classes)}")
print(f"   Object Property 수: {len(obj_props)}")
print(f"   Data Property 수:   {len(data_props)}")
