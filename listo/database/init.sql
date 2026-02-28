-- Listo Database Initialization Script
-- Version: 1.0.0
-- Generated: 2026-02-28

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    sys_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    mfa_enabled TINYINT(1) NOT NULL DEFAULT 0,
    mfa_secret VARCHAR(255),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    last_login_at DATETIME,
    create_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modify_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    create_user BIGINT,
    modify_user BIGINT,
    FOREIGN KEY (create_user) REFERENCES users(sys_id),
    FOREIGN KEY (modify_user) REFERENCES users(sys_id),
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    sys_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    users_sys_id BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    revoked TINYINT(1) NOT NULL DEFAULT 0,
    create_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modify_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    create_user BIGINT,
    modify_user BIGINT,
    FOREIGN KEY (users_sys_id) REFERENCES users(sys_id) ON DELETE CASCADE,
    FOREIGN KEY (create_user) REFERENCES users(sys_id),
    FOREIGN KEY (modify_user) REFERENCES users(sys_id),
    INDEX idx_refresh_tokens_token (token),
    INDEX idx_refresh_tokens_user (users_sys_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed initial admin user (password will be set during first setup)
-- Password: To be configured in appsettings.json and hashed on first run
