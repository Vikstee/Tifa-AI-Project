-- ====================================================================
-- SCHEMA DATABASE MYSQL UNTUK APLIKASI TIFA AI
-- Database: tifa_db
-- ====================================================================

CREATE DATABASE IF NOT EXISTS `tifa_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `tifa_db`;

-- 1. TABEL UTAMA PO & CASH-IN (`data_po-cashin`)
CREATE TABLE IF NOT EXISTS `data_po-cashin` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `period` VARCHAR(255) NULL,
    `accrue_date` DATE NULL,
    `funnel` VARCHAR(255) NULL,
    `lop_group_name` TEXT NULL,
    `portfolio` VARCHAR(255) NULL,
    `segment` VARCHAR(255) NULL,
    `sid` TEXT NULL,
    `io_number` TEXT NULL,
    `project_name` TEXT NULL,
    `customer` TEXT NULL,
    `rkap` DOUBLE DEFAULT 0,
    `rkap_stg` DOUBLE DEFAULT 0,
    `po_amount` DOUBLE DEFAULT 0,
    `po_amount_co` DOUBLE DEFAULT 0,
    `bast_amount` DOUBLE DEFAULT 0,
    `po_open` DOUBLE DEFAULT 0,
    `outlook_amount` DOUBLE DEFAULT 0,
    `bast_amount_app1` DOUBLE DEFAULT 0,
    `bast_amount_app2` DOUBLE DEFAULT 0,
    `revenue` DOUBLE DEFAULT 0,
    `remaining_bast` DOUBLE DEFAULT 0,
    `invoice` DOUBLE DEFAULT 0,
    `clearing_number` TEXT NULL,
    `cash_in` DOUBLE DEFAULT 0,
    `pinalty` DOUBLE DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. TABEL USERS FOR AUTHENTICATION (`users`)
CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_uuid` VARCHAR(255) NOT NULL UNIQUE,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `wa_number` VARCHAR(255) NULL,
    `llm_model` VARCHAR(100) DEFAULT 'flash',
    `avatar_url` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. TABEL CHAT SESSIONS (`chat_sessions`)
CREATE TABLE IF NOT EXISTS `chat_sessions` (
    `id` VARCHAR(255) PRIMARY KEY,
    `user_id` VARCHAR(255) NOT NULL,
    `title` VARCHAR(255) NOT NULL DEFAULT 'Percakapan Baru',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_chat_sessions_user` (`user_id`, `updated_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. TABEL CHAT MESSAGES (`chat_messages`)
CREATE TABLE IF NOT EXISTS `chat_messages` (
    `id` VARCHAR(255) PRIMARY KEY,
    `session_id` VARCHAR(255) NOT NULL,
    `user_id` VARCHAR(255) NOT NULL,
    `role` VARCHAR(50) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `attachments` JSON NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_chat_messages_session` (`session_id`, `created_at` ASC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. TABEL USER MEMORIES (`user_memories`)
CREATE TABLE IF NOT EXISTS `user_memories` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` VARCHAR(255) NOT NULL UNIQUE,
    `memory_text` LONGTEXT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. TABEL AI KNOWLEDGE BANK (`ai_knowledge_bank`)
CREATE TABLE IF NOT EXISTS `ai_knowledge_bank` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `intent_key` VARCHAR(255) NOT NULL UNIQUE,
    `prompt_sample` TEXT NULL,
    `knowledge_output` LONGTEXT NULL,
    `use_count` INT DEFAULT 1,
    `is_active` TINYINT(1) DEFAULT 1,
    `last_used_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. TABEL WHATSAPP ALLOWED GROUPS (`whatsapp_allowed_groups`)
CREATE TABLE IF NOT EXISTS `whatsapp_allowed_groups` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `group_jid` VARCHAR(255) NOT NULL UNIQUE,
    `group_lid` VARCHAR(255) NULL,
    `group_name` VARCHAR(255) NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `allowed_senders` JSON NULL,
    `allowed_commands` JSON NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. TABEL WHATSAPP REQUEST AUDIT TRAIL (`whatsapp_tifa_requests`)
CREATE TABLE IF NOT EXISTS `whatsapp_tifa_requests` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `message_id` VARCHAR(255) NOT NULL UNIQUE,
    `group_jid` VARCHAR(255) NOT NULL,
    `group_lid` VARCHAR(255) NULL,
    `sender_id` VARCHAR(255) NOT NULL,
    `sender_lid` VARCHAR(255) NULL,
    `prompt` TEXT NOT NULL,
    `response_text` LONGTEXT NULL,
    `report_title` VARCHAR(255) NULL,
    `status` ENUM('received', 'processing', 'sent', 'ignored', 'failed') NOT NULL DEFAULT 'received',
    `error_message` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `completed_at` TIMESTAMP NULL,
    INDEX `idx_whatsapp_group_created` (`group_jid`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- SEED DATA GRUP WHATSAPP RESMI TIFA
INSERT INTO `whatsapp_allowed_groups` (`group_jid`, `group_name`, `is_active`)
VALUES 
  ('120363412012087280@g.us', 'Grup Utama TIFA', 1),
  ('120363427893930317@g.us', 'Grup Testing AI', 1)
ON DUPLICATE KEY UPDATE `is_active` = 1;
