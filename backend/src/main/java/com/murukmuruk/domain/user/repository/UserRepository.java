package com.murukmuruk.domain.user.repository;

import com.murukmuruk.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    // 로그인 때 "이미 가입한 사람인지" 찾는다
    Optional<User> findByGoogleSub(String googleSub);
}