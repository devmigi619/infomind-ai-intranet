package com.infomind.backend.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.io.FileInputStream;

@Configuration
@Slf4j
public class FcmConfig {

    @Value("${FCM_SERVICE_ACCOUNT_KEY:}")
    private String serviceAccountKeyPath;

    @PostConstruct
    public void initialize() {
        if (serviceAccountKeyPath == null || serviceAccountKeyPath.isBlank()) {
            log.warn("FCM_SERVICE_ACCOUNT_KEY not set. FCM notifications disabled.");
            return;
        }
        try {
            FileInputStream serviceAccount = new FileInputStream(serviceAccountKeyPath);
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();
            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(options);
            }
        } catch (Exception e) {
            log.error("Failed to initialize FCM: {}", e.getMessage());
        }
    }
}
