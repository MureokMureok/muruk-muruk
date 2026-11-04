package com.murukmuruk.domain.user.entity;

import com.murukmuruk.domain.user.enums.UserStatus;
import com.murukmuruk.domain.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Locale;

@Getter
@Entity
@Table(name = "users")
@NoArgsConstructor(access = AccessLevel.PROTECTED) // JPA용 기본 생성자. 밖에서는 create()만 쓰게 막음
public class User extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 구글 계정 고유 ID(sub). 이메일은 바뀔 수 있어서 이걸로 사용자를 식별한다
    @Column(name = "google_sub", nullable = false, unique = true)
    private String googleSub;

    @Column(nullable = false, length = 50)
    private String name;

    // 0x로 시작하는 42자리 주소. 소문자로 통일해서 저장
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "wallet_address", nullable = false, unique = true, length = 42)
    private String walletAddress;

    // MySQL에서 Hibernate가 enum 타입을 기대하지 않도록 VARCHAR로 고정
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserStatus status;

    private User(String googleSub, String name, String walletAddress) {
        this.googleSub = googleSub;
        this.name = name;
        this.walletAddress = walletAddress.toLowerCase(Locale.ROOT);
        this.status = UserStatus.ACTIVE;
    }

    /** 첫 로그인 때 가입시키는 팩토리 메서드 */
    public static User create(String googleSub, String name, String walletAddress) {
        return new User(googleSub, name, walletAddress);
    }

    public boolean isActive() {
        return status == UserStatus.ACTIVE;
    }
}