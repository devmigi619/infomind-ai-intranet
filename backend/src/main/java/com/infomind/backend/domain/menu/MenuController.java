package com.infomind.backend.domain.menu;

import com.infomind.backend.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/menus")
@RequiredArgsConstructor
public class MenuController {

    private final MenuRepository menuRepository;

    public record MenuDto(String menuId, String menuNm, Integer menuSn, String admYn) {}

    /** GET /api/menus — 활성 메뉴 전체 (인증 사용자 전체 접근) */
    @GetMapping
    public ResponseEntity<ApiResponse<List<MenuDto>>> getMenus() {
        List<MenuDto> menus = menuRepository.findByUseYnOrderByAdmYnAscMenuSnAsc("Y")
                .stream()
                .map(m -> new MenuDto(m.getMenuId(), m.getMenuNm(), m.getMenuSn(), m.getAdmYn()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(menus));
    }
}
