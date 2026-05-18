package com.infomind.backend.domain.aprvltmpl;

import com.infomind.backend.domain.user.User;
import com.infomind.backend.domain.user.UserRepository;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserAprvlTmplService {

    private final UserAprvlTmplRepository     tmplRepo;
    private final UserAprvlTmplAprvRepository aprvRepo;
    private final UserAprvlTmplRefRepository  refRepo;
    private final UserRepository              userRepo;

    // ─── 조회 ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<TmplDetailDto> getMyTemplates(String userId) {
        return tmplRepo.findByIdUserIdOrderByIdAprvlIdAsc(userId)
                .stream()
                .map(t -> toDetail(t,
                        aprvRepo.findByIdAprvlIdAndIdUserIdOrderByAprvOrdAsc(t.getId().getAprvlId(), userId),
                        refRepo.findByIdAprvlIdAndIdUserId(t.getId().getAprvlId(), userId)))
                .collect(Collectors.toList());
    }

    // ─── 생성 ──────────────────────────────────────────────────────────────────

    @Transactional
    public TmplDetailDto create(String userId, TmplCreateRequest req) {
        String aprvlId = UUID.randomUUID().toString().replace("-", "");

        UserAprvlTmpl tmpl = tmplRepo.save(
                UserAprvlTmpl.builder()
                        .id(new UserAprvlTmplId(aprvlId, userId))
                        .aprvlNm(req.getAprvlNm())
                        .build());

        saveAprvList(aprvlId, userId, req.getAprvList());
        saveRefList(aprvlId, userId, req.getRefList());

        return toDetail(tmpl,
                aprvRepo.findByIdAprvlIdAndIdUserIdOrderByAprvOrdAsc(aprvlId, userId),
                refRepo.findByIdAprvlIdAndIdUserId(aprvlId, userId));
    }

    // ─── 수정 ──────────────────────────────────────────────────────────────────

    @Transactional
    public TmplDetailDto update(String userId, String aprvlId, TmplCreateRequest req) {
        UserAprvlTmpl tmpl = tmplRepo.findById(new UserAprvlTmplId(aprvlId, userId))
                .orElseThrow(() -> new IllegalArgumentException("템플릿을 찾을 수 없습니다."));

        tmpl.update(req.getAprvlNm());

        aprvRepo.deleteByIdAprvlIdAndIdUserId(aprvlId, userId);
        refRepo.deleteByIdAprvlIdAndIdUserId(aprvlId, userId);

        saveAprvList(aprvlId, userId, req.getAprvList());
        saveRefList(aprvlId, userId, req.getRefList());

        return toDetail(tmpl,
                aprvRepo.findByIdAprvlIdAndIdUserIdOrderByAprvOrdAsc(aprvlId, userId),
                refRepo.findByIdAprvlIdAndIdUserId(aprvlId, userId));
    }

    // ─── 삭제 ──────────────────────────────────────────────────────────────────

    @Transactional
    public void delete(String userId, String aprvlId) {
        UserAprvlTmpl tmpl = tmplRepo.findById(new UserAprvlTmplId(aprvlId, userId))
                .orElseThrow(() -> new IllegalArgumentException("템플릿을 찾을 수 없습니다."));

        aprvRepo.deleteByIdAprvlIdAndIdUserId(aprvlId, userId);
        refRepo.deleteByIdAprvlIdAndIdUserId(aprvlId, userId);
        tmplRepo.delete(tmpl);
    }

    // ─── helpers ───────────────────────────────────────────────────────────────

    private void saveAprvList(String aprvlId, String userId, List<AprvEntryRequest> list) {
        if (list == null) return;
        for (int i = 0; i < list.size(); i++) {
            aprvRepo.save(UserAprvlTmplAprv.builder()
                    .id(new UserAprvlTmplAprvId(aprvlId, userId, list.get(i).getAprvUserId()))
                    .aprvOrd(i + 1)
                    .build());
        }
    }

    private void saveRefList(String aprvlId, String userId, List<String> refUserIds) {
        if (refUserIds == null) return;
        for (String refUserId : refUserIds) {
            refRepo.save(UserAprvlTmplRef.builder()
                    .id(new UserAprvlTmplRefId(aprvlId, userId, refUserId))
                    .build());
        }
    }

    private TmplDetailDto toDetail(UserAprvlTmpl tmpl,
                                   List<UserAprvlTmplAprv> aprvs,
                                   List<UserAprvlTmplRef> refs) {
        List<AprvEntryDto> aprvDtos = aprvs.stream().map(a -> {
            String nm = userRepo.findById(a.getId().getAprvUserId())
                    .map(User::getUserNm).orElse(a.getId().getAprvUserId());
            return AprvEntryDto.builder()
                    .aprvUserId(a.getId().getAprvUserId())
                    .aprvUserNm(nm)
                    .aprvOrd(a.getAprvOrd())
                    .build();
        }).collect(Collectors.toList());

        List<RefEntryDto> refDtos = refs.stream().map(r -> {
            String nm = userRepo.findById(r.getId().getRefUserId())
                    .map(User::getUserNm).orElse(r.getId().getRefUserId());
            return RefEntryDto.builder()
                    .refUserId(r.getId().getRefUserId())
                    .refUserNm(nm)
                    .build();
        }).collect(Collectors.toList());

        return TmplDetailDto.builder()
                .aprvlId(tmpl.getId().getAprvlId())
                .userId(tmpl.getId().getUserId())
                .aprvlNm(tmpl.getAprvlNm())
                .aprvList(aprvDtos)
                .refList(refDtos)
                .build();
    }

    // ─── DTOs ──────────────────────────────────────────────────────────────────

    @Getter @Builder
    public static class TmplDetailDto {
        private String aprvlId;
        private String userId;
        private String aprvlNm;
        private List<AprvEntryDto> aprvList;
        private List<RefEntryDto>  refList;
    }

    @Getter @Builder
    public static class AprvEntryDto {
        private String aprvUserId, aprvUserNm;
        private Integer aprvOrd;
    }

    @Getter @Builder
    public static class RefEntryDto {
        private String refUserId, refUserNm;
    }

    @Getter
    public static class TmplCreateRequest {
        @NotBlank private String aprvlNm;
        private List<AprvEntryRequest> aprvList;
        private List<String>           refList;
    }

    @Getter
    public static class AprvEntryRequest {
        @NotBlank private String aprvUserId;
    }
}
