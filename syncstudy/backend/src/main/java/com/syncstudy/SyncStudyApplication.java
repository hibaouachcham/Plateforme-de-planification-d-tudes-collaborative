package com.syncstudy;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SyncStudyApplication {
    public static void main(String[] args) {
        SpringApplication.run(SyncStudyApplication.class, args);
    }
}