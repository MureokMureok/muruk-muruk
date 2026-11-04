CREATE TABLE users (
                       id             BIGINT       NOT NULL AUTO_INCREMENT,
                       google_sub     VARCHAR(255) NOT NULL,
                       name           VARCHAR(50)  NOT NULL,
                       wallet_address CHAR(42)     NOT NULL,
                       status         VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
                       created_at     DATETIME(6)  NOT NULL,
                       updated_at     DATETIME(6)  NOT NULL,
                       PRIMARY KEY (id),
                       UNIQUE KEY uk_users_google_sub (google_sub),
                       UNIQUE KEY uk_users_wallet_address (wallet_address)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;