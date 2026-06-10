package com.infomind.backend.domain.chat;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AssistantCardService {

    private final EntityManager em;

    @Transactional(readOnly = true)
    public AssistantCardResponse getAssistantCards(String userId, String intent) {
        List<AssistantCardDto> cards = new ArrayList<>();

        if ("vacation".equals(intent)) {
            cards.add(AssistantCardDto.builder()
                    .type("action")
                    .icon("FileText")
                    .title("휴가 신청")
                    .subtitle("전자결재")
                    .link("/approval/new?type=vacation")
                    .build());
            cards.add(AssistantCardDto.builder()
                    .type("action")
                    .icon("Briefcase")
                    .title("휴가 잔여일 확인")
                    .subtitle("인사시스템")
                    .link("/hr/vacation")
                    .build());
            cards.add(AssistantCardDto.builder()
                    .type("action")
                    .icon("MessageCircle")
                    .title("인사팀 문의")
                    .subtitle("인사팀")
                    .link("/chat/hr")
                    .build());
            cards.add(AssistantCardDto.builder()
                    .type("info")
                    .icon("BookOpen")
                    .title("휴가 사용 규정")
                    .tag("규정")
                    .tagColor("#0A2463")
                    .summaryItems(Arrays.asList(
                            "입사 1년 미만: 월 1일 발생",
                            "입사 1년 이상: 연 15일 기본",
                            "3년 이상 재직 시 1일 추가",
                            "최대 2년간 미사용 휴가 연차 이월 가능"
                    ))
                    .fullLink("/docs/vacation")
                    .build());

            try {
                Object totalObj = em.createNativeQuery("SELECT f_leave_calc(:userId)")
                        .setParameter("userId", userId)
                        .getSingleResult();

                Object usedObj = em.createNativeQuery(
                        "SELECT COALESCE(SUM(leave_use_dcnt), 0) FROM int_leave_req_mst " +
                        "WHERE req_user_id = :userId AND leave_cd = 'LEAVE_00001' " +
                        "AND aprv_rslt_se IN ('1','2','3')")
                        .setParameter("userId", userId)
                        .getSingleResult();

                double total = totalObj != null ? ((Number) totalObj).doubleValue() : 0.0;
                double used = usedObj != null ? ((Number) usedObj).doubleValue() : 0.0;
                double remain = total - used;

                String totalStr = formatDouble(total);
                String usedStr = formatDouble(used);
                String remainStr = formatDouble(remain);

                cards.add(AssistantCardDto.builder()
                        .type("status")
                        .icon("Activity")
                        .title("남은 휴가")
                        .value(remainStr + "일 (사용 " + usedStr + "일 / 총 " + totalStr + "일)")
                        .build());
            } catch (Exception e) {
                cards.add(AssistantCardDto.builder()
                        .type("status")
                        .icon("Activity")
                        .title("남은 휴가")
                        .value("정보를 불러올 수 없습니다.")
                        .build());
            }

        } else if ("vehicle".equals(intent)) {
            cards.add(AssistantCardDto.builder()
                    .type("action")
                    .icon("Car")
                    .title("차량 예약하기")
                    .subtitle("차량예약관리")
                    .link("/vehicle/reserve")
                    .build());
            cards.add(AssistantCardDto.builder()
                    .type("action")
                    .icon("MessageCircle")
                    .title("총무팀 문의")
                    .subtitle("총무팀")
                    .link("/chat/general")
                    .build());
            cards.add(AssistantCardDto.builder()
                    .type("info")
                    .icon("BookOpen")
                    .title("법인차량 이용 규정")
                    .tag("규정")
                    .tagColor("#0A2463")
                    .summaryItems(Arrays.asList(
                            "예약은 사용일 기준 최소 1일 전 필수",
                            "업무 목적 외 개인 사용 불가",
                            "반납 시 연료 확인 및 날짜 변경 필수",
                            "사고 발생 시 즉시 총무팀 보고 의무"
                    ))
                    .fullLink("/docs/vehicle")
                    .build());

            try {
                String todayStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));

                Object totalObj = em.createNativeQuery("SELECT COUNT(*) FROM int_veh WHERE use_yn = 'Y'")
                        .getSingleResult();

                Object reservedObj = em.createNativeQuery(
                        "SELECT COUNT(DISTINCT veh_id) FROM int_veh_rsv " +
                        "WHERE rsv_st_ymd <= :today AND rsv_end_ymd >= :today AND rtn_yn = 'N'")
                        .setParameter("today", todayStr)
                        .getSingleResult();

                int total = totalObj != null ? ((Number) totalObj).intValue() : 0;
                int reserved = reservedObj != null ? ((Number) reservedObj).intValue() : 0;
                int available = Math.max(0, total - reserved);

                cards.add(AssistantCardDto.builder()
                        .type("status")
                        .icon("Car")
                        .title("차량 예약 현황")
                        .value("법인 차량 " + available + "대 예약 가능 (총 " + total + "대 중)")
                        .build());
            } catch (Exception e) {
                cards.add(AssistantCardDto.builder()
                        .type("status")
                        .icon("Car")
                        .title("차량 예약 현황")
                        .value("정보를 불러올 수 없습니다.")
                        .build());
            }

        } else if ("meeting".equals(intent)) {
            cards.add(AssistantCardDto.builder()
                    .type("action")
                    .icon("CalendarDays")
                    .title("회의실 예약하기")
                    .subtitle("회의실예약")
                    .link("/meeting/reserve")
                    .build());
            cards.add(AssistantCardDto.builder()
                    .type("action")
                    .icon("MessageCircle")
                    .title("시설팀 문의")
                    .subtitle("시설팀")
                    .link("/chat/facility")
                    .build());
            cards.add(AssistantCardDto.builder()
                    .type("info")
                    .icon("BookOpen")
                    .title("회의실 이용 안내")
                    .tag("안내")
                    .tagColor("#1E88E5")
                    .summaryItems(Arrays.asList(
                            "최대 2시간 단위로 예약 가능",
                            "30인실 이상 사용 시 사전 신청 필요",
                            "사용 후 정리 정돈 필수",
                            "예약 취소는 사용 1시간 전까지"
                    ))
                    .fullLink("/docs/meeting")
                    .build());

            try {
                String todayStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));

                Object totalObj = em.createNativeQuery("SELECT COUNT(*) FROM int_mtgr WHERE use_yn = 'Y'")
                        .getSingleResult();

                Object reservedObj = em.createNativeQuery(
                        "SELECT COUNT(DISTINCT mtgr_id) FROM int_mtgr_rsv " +
                        "WHERE rsv_st_ymd <= :today AND rsv_end_ymd >= :today")
                        .setParameter("today", todayStr)
                        .getSingleResult();

                int total = totalObj != null ? ((Number) totalObj).intValue() : 0;
                int reserved = reservedObj != null ? ((Number) reservedObj).intValue() : 0;
                int available = Math.max(0, total - reserved);

                cards.add(AssistantCardDto.builder()
                        .type("status")
                        .icon("CalendarDays")
                        .title("오늘 회의실 현황")
                        .value("회의실 " + available + "개 예약 가능 (총 " + total + "개 중)")
                        .build());
            } catch (Exception e) {
                cards.add(AssistantCardDto.builder()
                        .type("status")
                        .icon("CalendarDays")
                        .title("오늘 회의실 현황")
                        .value("정보를 불러올 수 없습니다.")
                        .build());
            }

        } else if ("approval".equals(intent)) {
            cards.add(AssistantCardDto.builder()
                    .type("action")
                    .icon("FileText")
                    .title("전자결재 작성")
                    .subtitle("전자결재")
                    .link("/approval/new")
                    .build());
            cards.add(AssistantCardDto.builder()
                    .type("action")
                    .icon("ClipboardList")
                    .title("결재 현황 확인")
                    .subtitle("전자결재")
                    .link("/approval")
                    .build());
            cards.add(AssistantCardDto.builder()
                    .type("action")
                    .icon("MessageCircle")
                    .title("총무팀 문의")
                    .subtitle("총무팀")
                    .link("/chat/general")
                    .build());
            cards.add(AssistantCardDto.builder()
                    .type("info")
                    .icon("BookOpen")
                    .title("전자결재 매뉴얼")
                    .tag("매뉴얼")
                    .tagColor("#43A047")
                    .summaryItems(Arrays.asList(
                            "10만원 이하: 팀장 승인",
                            "10~100만원: 부서장 승인",
                            "100만원 이상: 임원 승인 필요",
                            "품의서 제출 후 2영업일 내 처리"
                    ))
                    .fullLink("/docs/approval")
                    .build());

            try {
                Object cntObj = em.createNativeQuery(
                        "SELECT " +
                        "(SELECT COUNT(*) FROM int_aprv_req_aprv WHERE aprv_user_id = :userId AND aprv_se IS NULL) " +
                        "+ (SELECT COUNT(*) FROM int_leave_req_aprv WHERE aprv_user_id = :userId AND aprv_se IS NULL)")
                        .setParameter("userId", userId)
                        .getSingleResult();

                int cnt = cntObj != null ? ((Number) cntObj).intValue() : 0;

                cards.add(AssistantCardDto.builder()
                        .type("status")
                        .icon("Clock")
                        .title("대기 중인 결재")
                        .value(cnt + "건 (내가 결재해야 할 문서)")
                        .build());
            } catch (Exception e) {
                cards.add(AssistantCardDto.builder()
                        .type("status")
                        .icon("Clock")
                        .title("대기 중인 결재")
                        .value("정보를 불러올 수 없습니다.")
                        .build());
            }

        } else if ("report".equals(intent)) {
            cards.add(AssistantCardDto.builder()
                    .type("action")
                    .icon("FileText")
                    .title("주간보고 작성")
                    .subtitle("주간보고")
                    .link("/report/new")
                    .build());
            cards.add(AssistantCardDto.builder()
                    .type("action")
                    .icon("ClipboardList")
                    .title("주간보고 현황")
                    .subtitle("주간보고")
                    .link("/report")
                    .build());
            cards.add(AssistantCardDto.builder()
                    .type("info")
                    .icon("BookOpen")
                    .title("주간보고 작성 가이드")
                    .tag("가이드")
                    .tagColor("#43A047")
                    .summaryItems(Arrays.asList(
                            "매주 금요일 17:00까지 제출",
                            "주요 업무, 진행 현황, 차주 계획 포함",
                            "팀장 승인 후 최종 제출",
                            "미제출 시 자동 알림 발송"
                    ))
                    .fullLink("/docs/report")
                    .build());

            try {
                List<?> rows = em.createNativeQuery(
                        "SELECT r.round_nm, d.sbmt_yn, d.sbmt_ymd FROM int_rpt_round r " +
                        "LEFT JOIN int_rpt_desc d ON r.rpt_form_id = d.rpt_form_id AND r.round_sn = d.round_sn AND d.user_id = :userId " +
                        "WHERE r.rpt_form_id = 'RPT_001' " +
                        "ORDER BY r.round_ymd DESC LIMIT 1")
                        .setParameter("userId", userId)
                        .getResultList();

                if (!rows.isEmpty()) {
                    Object[] row = (Object[]) rows.get(0);
                    String roundNm = row[0] != null ? (String) row[0] : "최신 회차";
                    String sbmtYn = (String) row[1];
                    String sbmtYmd = (String) row[2];

                    String val;
                    if ("Y".equals(sbmtYn)) {
                        String fmtDate = "";
                        if (sbmtYmd != null && sbmtYmd.length() == 8) {
                            fmtDate = sbmtYmd.substring(0, 4) + "-" + sbmtYmd.substring(4, 6) + "-" + sbmtYmd.substring(6);
                        }
                        String dateSuffix = !fmtDate.isEmpty() ? " (" + fmtDate + ")" : "";
                        val = "제출 완료" + dateSuffix + " — " + roundNm;
                    } else {
                        val = "미제출 (금요일 17:00 마감) — " + roundNm;
                    }

                    cards.add(AssistantCardDto.builder()
                            .type("status")
                            .icon("AlertCircle")
                            .title("이번 주 제출 현황")
                            .value(val)
                            .build());
                } else {
                    cards.add(AssistantCardDto.builder()
                            .type("status")
                            .icon("AlertCircle")
                            .title("이번 주 제출 현황")
                            .value("미제출 (금요일 17:00 마감)")
                            .build());
                }
            } catch (Exception e) {
                cards.add(AssistantCardDto.builder()
                        .type("status")
                        .icon("AlertCircle")
                        .title("이번 주 제출 현황")
                        .value("정보를 불러올 수 없습니다.")
                        .build());
            }

        } else if ("certificate".equals(intent)) {
            cards.add(AssistantCardDto.builder()
                    .type("action")
                    .icon("FileText")
                    .title("증명서 발급 신청")
                    .subtitle("증명서출력")
                    .link("/certificate/new")
                    .build());
            cards.add(AssistantCardDto.builder()
                    .type("action")
                    .icon("MessageCircle")
                    .title("인사팀 문의")
                    .subtitle("인사팀")
                    .link("/chat/hr")
                    .build());
            cards.add(AssistantCardDto.builder()
                    .type("info")
                    .icon("BookOpen")
                    .title("증명서 발급 안내")
                    .tag("안내")
                    .tagColor("#1E88E5")
                    .summaryItems(Arrays.asList(
                            "재직증명서, 경력증명서: 즉시 발급",
                            "급여증명서: 1영업일 소요",
                            "원천징수영수증: 2영업일 소요",
                            "월 최대 5건까지 발급 가능"
                    ))
                    .fullLink("/docs/certificate")
                    .build());

        } else if ("education".equals(intent)) {
            cards.add(AssistantCardDto.builder()
                    .type("action")
                    .icon("GraduationCap")
                    .title("교육 신청")
                    .subtitle("인사시스템")
                    .link("/education/new")
                    .build());
            cards.add(AssistantCardDto.builder()
                    .type("action")
                    .icon("CreditCard")
                    .title("교육비 정산")
                    .subtitle("경비 정산")
                    .link("/expense/education")
                    .build());
            cards.add(AssistantCardDto.builder()
                    .type("action")
                    .icon("MessageCircle")
                    .title("인사팀 문의")
                    .subtitle("인사팀")
                    .link("/chat/hr")
                    .build());
            cards.add(AssistantCardDto.builder()
                    .type("info")
                    .icon("BookOpen")
                    .title("사내 교육 지원 규정")
                    .tag("규정")
                    .tagColor("#0A2463")
                    .summaryItems(Arrays.asList(
                            "연간 100만원 한도 내외부 교육 지원",
                            "교육 신청은 2주 전 부서장 승인 필요",
                            "교육 수료 후 보고서 1주일 내 제출",
                            "동일 과정 재수강은 2년 경과 후 가능"
                    ))
                    .fullLink("/docs/education")
                    .build());

        } else if ("purchase".equals(intent)) {
            cards.add(AssistantCardDto.builder()
                    .type("action")
                    .icon("FileText")
                    .title("품의서 작성")
                    .subtitle("전자결재")
                    .link("/approval/new?type=purchase")
                    .build());
            cards.add(AssistantCardDto.builder()
                    .type("action")
                    .icon("Briefcase")
                    .title("자산 등록")
                    .subtitle("총무시스템")
                    .link("/asset/new")
                    .build());
            cards.add(AssistantCardDto.builder()
                    .type("action")
                    .icon("MessageCircle")
                    .title("구매팀 문의")
                    .subtitle("구매팀")
                    .link("/chat/purchase")
                    .build());
            cards.add(AssistantCardDto.builder()
                    .type("info")
                    .icon("BookOpen")
                    .title("비품 구매 절차")
                    .tag("절차")
                    .tagColor("#FB8C00")
                    .summaryItems(Arrays.asList(
                            "50만원 이하: 팀장 승인 후 구매",
                            "50~200만원: 부서장 승인 + 견적 2건 첨부",
                            "200만원 이상: 구매심의위원회 심의",
                            "구매 후 자산 등록 필수"
                    ))
                    .fullLink("/docs/purchase")
                    .build());

        } else if ("trip".equals(intent)) {
            cards.add(AssistantCardDto.builder()
                    .type("action")
                    .icon("FileText")
                    .title("출장 신청서 작성")
                    .subtitle("전자결재")
                    .link("/approval/new?type=trip")
                    .build());
            cards.add(AssistantCardDto.builder()
                    .type("action")
                    .icon("CreditCard")
                    .title("교통비 정산 신청")
                    .subtitle("경비 정산")
                    .link("/expense/trip")
                    .build());
            cards.add(AssistantCardDto.builder()
                    .type("action")
                    .icon("MessageCircle")
                    .title("담당 부서 문의")
                    .subtitle("총무팀")
                    .link("/chat/general")
                    .build());
            cards.add(AssistantCardDto.builder()
                    .type("info")
                    .icon("BookOpen")
                    .title("출장 관련 규정")
                    .tag("규정")
                    .tagColor("#0A2463")
                    .summaryItems(Arrays.asList(
                            "교통비는 실비 기준으로 지급",
                            "항공료는 이코노미 기준",
                            "숙박비는 1일 상한 20만원",
                            "렌터카는 사전 승인 필요"
                    ))
                    .fullLink("/docs/trip")
                    .build());
        }

        return AssistantCardResponse.builder()
                .intent(intent)
                .cards(cards)
                .build();
    }

    private String formatDouble(double val) {
        if (val == (long) val) {
            return String.format("%d", (long) val);
        } else {
            return String.format("%s", val);
        }
    }
}
