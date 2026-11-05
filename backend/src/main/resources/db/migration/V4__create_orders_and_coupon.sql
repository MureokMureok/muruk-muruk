-- 주문 (쿠폰 사용 시 생성). campaign_id는 기획전 테이블이 생길 때 추가한다.
CREATE TABLE orders (
                        id              BIGINT       NOT NULL AUTO_INCREMENT,
                        user_id         BIGINT       NOT NULL,
                        merchant_id     BIGINT       NOT NULL,
                        item_name       VARCHAR(100) NOT NULL,
                        total_amount    BIGINT       NOT NULL,                              -- 할인 전 주문 금액
                        discount_amount BIGINT       NOT NULL DEFAULT 0,                    -- 결제 금액 = 주문 금액 - 할인 금액
                        status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
                        created_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                        updated_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                        PRIMARY KEY (id),
                        KEY idx_orders_user_id (user_id),
                        KEY idx_orders_merchant_id (merchant_id),
                        CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id),
                        CONSTRAINT fk_orders_merchant FOREIGN KEY (merchant_id) REFERENCES merchant (id),
                        CONSTRAINT ck_orders_status CHECK (status IN ('PENDING','PAID','FAILED')),
                        CONSTRAINT ck_orders_amount CHECK (total_amount > 0 AND discount_amount >= 0 AND discount_amount <= total_amount)
);

-- 쿠폰: 사용자가 받은 쿠폰 1장 = 체인 NFT 1개
CREATE TABLE coupon (
                        id               BIGINT      NOT NULL AUTO_INCREMENT,
                        coupon_policy_id BIGINT      NOT NULL,
                        user_id          BIGINT      NOT NULL,
                        token_id         BIGINT      NOT NULL,                              -- 체인 NFT 번호
                        status           VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',             -- ACTIVE 사용 가능 / USED 사용 완료 (만료는 expires_at으로 계산)
                        expires_at       DATETIME(6) NOT NULL,                              -- 발급할 때 계산해서 저장
                        issued_order_id  BIGINT      NULL,                                  -- 기획전 쿠폰만
                        used_order_id    BIGINT      NULL,
                        used_at          DATETIME(6) NULL,
                        created_at       DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                        PRIMARY KEY (id),
                        UNIQUE KEY uk_coupon_token_id (token_id),
                        UNIQUE KEY uk_coupon_used_order_id (used_order_id),                 -- 한 주문에 쿠폰 1장, 한 쿠폰은 한 주문에만
                        UNIQUE KEY uk_coupon_user_policy (user_id, coupon_policy_id),       -- 같은 정책 쿠폰은 사용자당 1장 (기획전 구현 시 재검토)
                        KEY idx_coupon_user_id (user_id),
                        CONSTRAINT fk_coupon_policy FOREIGN KEY (coupon_policy_id) REFERENCES coupon_policy (id),
                        CONSTRAINT fk_coupon_user FOREIGN KEY (user_id) REFERENCES users (id),
                        CONSTRAINT fk_coupon_issued_order FOREIGN KEY (issued_order_id) REFERENCES orders (id),
                        CONSTRAINT fk_coupon_used_order FOREIGN KEY (used_order_id) REFERENCES orders (id),
                        CONSTRAINT ck_coupon_status CHECK (status IN ('ACTIVE','USED')),
    -- 상태와 사용 정보가 어긋나지 않게: 사용 완료일 때만 사용 주문과 사용 시각이 있다
                        CONSTRAINT ck_coupon_used CHECK (
                            (status = 'ACTIVE' AND used_order_id IS NULL AND used_at IS NULL)
                                OR (status = 'USED' AND used_order_id IS NOT NULL AND used_at IS NOT NULL)
                            )
);