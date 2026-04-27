package com.infomind.backend.config;

import com.infomind.backend.domain.user.Role;
import com.infomind.backend.domain.user.User;
import com.infomind.backend.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (!userRepository.existsByUsername("admin")) {
            userRepository.save(User.builder()
                    .username("admin")
                    .password(passwordEncoder.encode("admin1234"))
                    .name("관리자")
                    .email("admin@infomind.com")
                    .department("IT")
                    .position("관리자")
                    .role(Role.ADMIN)
                    .build());
            log.info("초기 admin 계정 생성 완료");
        }
        if (!userRepository.existsByUsername("user1")) {
            userRepository.save(User.builder()
                    .username("user1")
                    .password(passwordEncoder.encode("user1234"))
                    .name("일반사용자")
                    .email("user1@infomind.com")
                    .department("개발팀")
                    .position("사원")
                    .role(Role.USER)
                    .build());
            log.info("초기 user1 계정 생성 완료");
        }
    }
}
