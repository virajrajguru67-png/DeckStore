-- MySQL Schema for Deck Store
-- Run this in your MySQL database to initialize the tables

CREATE DATABASE IF NOT EXISTS deck_store;
USE deck_store;

-- 1. Users Table (Replacement for auth.users)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    notification_email BOOLEAN DEFAULT TRUE,
    notification_push BOOLEAN DEFAULT TRUE,
    notification_weekly BOOLEAN DEFAULT TRUE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. User Roles
CREATE TABLE IF NOT EXISTS user_roles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    role ENUM('viewer', 'editor', 'admin', 'owner') NOT NULL DEFAULT 'viewer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Folders
CREATE TABLE IF NOT EXISTS folders (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    path TEXT NOT NULL,
    parent_folder_id VARCHAR(36),
    owner_id VARCHAR(36) NOT NULL,
    color VARCHAR(50),
    icon VARCHAR(50),
    is_root BOOLEAN NOT NULL DEFAULT FALSE,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_folder_id) REFERENCES folders(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Files
CREATE TABLE IF NOT EXISTS files (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    path TEXT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size BIGINT NOT NULL,
    file_hash TEXT,
    folder_id VARCHAR(36),
    owner_id VARCHAR(36) NOT NULL,
    parent_path TEXT,
    storage_key VARCHAR(255) NOT NULL UNIQUE,
    version_number INTEGER NOT NULL DEFAULT 1,
    current_version_id VARCHAR(36),
    metadata JSON,
    deleted_at DATETIME,
    is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Storage Quotas
CREATE TABLE IF NOT EXISTS storage_quotas (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    total_quota_bytes BIGINT NOT NULL DEFAULT 10737418240, -- 10GB
    used_bytes BIGINT NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    read_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Shares
CREATE TABLE IF NOT EXISTS shares (
    id VARCHAR(36) PRIMARY KEY,
    resource_type ENUM('file', 'folder') NOT NULL,
    resource_id VARCHAR(36) NOT NULL,
    share_type ENUM('internal', 'external_link') NOT NULL,
    shared_by VARCHAR(36) NOT NULL,
    shared_with VARCHAR(36), -- NULL for external links
    access_level ENUM('viewer', 'editor') NOT NULL DEFAULT 'viewer',
    link_token VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shared_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. Documents
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    content JSON,
    owner_id VARCHAR(36) NOT NULL,
    folder_id VARCHAR(36),
    tags JSON,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at DATETIME,
    ai_summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
);

-- 10. Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    action_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(36),
    metadata JSON,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_resource (resource_type, resource_id)
);
