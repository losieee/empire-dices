-- --------------------------------------------------------
-- 호스트:                          127.0.0.1
-- 서버 버전:                        8.0.42 - MySQL Community Server - GPL
-- 서버 OS:                        Win64
-- HeidiSQL 버전:                  12.14.0.7165
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- empiredice 데이터베이스 구조 내보내기
CREATE DATABASE IF NOT EXISTS `empiredice` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `empiredice`;

-- 테이블 empiredice.board_tiles 구조 내보내기
CREATE TABLE IF NOT EXISTS `board_tiles` (
  `tile_id` int NOT NULL AUTO_INCREMENT,
  `index_pos` int NOT NULL,
  `tile_type` varchar(50) NOT NULL,
  `value` int DEFAULT '0',
  PRIMARY KEY (`tile_id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 empiredice.board_tiles:~0 rows (대략적) 내보내기

-- 테이블 empiredice.country 구조 내보내기
CREATE TABLE IF NOT EXISTS `country` (
  `id` int NOT NULL AUTO_INCREMENT,
  `country_name` varchar(50) NOT NULL,
  `country_grade` varchar(10) NOT NULL,
  `country_flag_image` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 empiredice.country:~12 rows (대략적) 내보내기
INSERT IGNORE INTO `country` (`id`, `country_name`, `country_grade`, `country_flag_image`) VALUES
	(13, '미국', '강', 'US.png'),
	(14, '중국', '강', 'CN.png'),
	(15, '러시아', '강', 'RU.png'),
	(16, '한국', '강', 'KR.png'),
	(17, '북한', '약', 'KP.png'),
	(18, '몽골', '약', 'MN.png'),
	(19, '소말리아', '약', 'SO.png'),
	(20, '이라크', '약', 'IQ.png'),
	(21, '이란', '약', 'IR.png'),
	(22, '쿠바', '약', 'CU.png'),
	(23, '몰디브', '약', 'MV.png'),
	(24, '아프가니스탄', '약', 'AF.png');

-- 테이블 empiredice.game_sessions 구조 내보내기
CREATE TABLE IF NOT EXISTS `game_sessions` (
  `session_id` int NOT NULL AUTO_INCREMENT,
  `player1_id` int DEFAULT NULL,
  `player2_id` int DEFAULT NULL,
  `winner_id` int DEFAULT NULL,
  `status` enum('waiting','in_progress','finished') NOT NULL DEFAULT 'waiting',
  `current_turn` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `player1_weapon` int DEFAULT '0',
  `player2_weapon` int DEFAULT '0',
  `player1_hp` int DEFAULT '5',
  `player2_hp` int DEFAULT '5',
  PRIMARY KEY (`session_id`),
  KEY `fk_game_sessions_player1` (`player1_id`),
  KEY `fk_game_sessions_player2` (`player2_id`),
  KEY `fk_game_sessions_winner` (`winner_id`),
  CONSTRAINT `fk_game_sessions_player1` FOREIGN KEY (`player1_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `fk_game_sessions_player2` FOREIGN KEY (`player2_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `fk_game_sessions_winner` FOREIGN KEY (`winner_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=62 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 empiredice.game_sessions:~37 rows (대략적) 내보내기
INSERT IGNORE INTO `game_sessions` (`session_id`, `player1_id`, `player2_id`, `winner_id`, `status`, `current_turn`, `created_at`, `player1_weapon`, `player2_weapon`, `player1_hp`, `player2_hp`) VALUES
	(22, 5, 6, NULL, 'in_progress', NULL, '2025-12-14 18:23:54', 0, 0, 5, 5),
	(23, 6, 5, NULL, 'in_progress', NULL, '2025-12-14 18:29:06', 0, 0, 5, 5),
	(24, 5, 6, NULL, 'in_progress', NULL, '2025-12-14 18:55:01', 0, 0, 5, 5),
	(25, 5, 6, NULL, 'in_progress', NULL, '2025-12-14 19:36:51', 0, 0, 5, 5),
	(26, 5, 6, NULL, 'in_progress', NULL, '2025-12-14 19:43:33', 0, 0, 2, 1),
	(27, 5, 6, NULL, 'in_progress', NULL, '2025-12-14 19:49:20', 0, 0, 4, 4),
	(28, 6, 5, NULL, 'in_progress', NULL, '2025-12-14 20:01:20', 0, 1, 5, 4),
	(29, 5, 6, 6, 'finished', NULL, '2025-12-14 20:42:50', 2, 1, 0, 1),
	(30, 5, 6, NULL, 'in_progress', NULL, '2025-12-14 22:58:17', 1, 0, 5, 5),
	(31, 5, 6, NULL, 'in_progress', NULL, '2025-12-14 23:01:06', 0, 0, 5, 5),
	(32, 5, 6, NULL, 'in_progress', NULL, '2025-12-14 23:07:26', 0, 0, 5, 5),
	(34, 5, 6, NULL, 'in_progress', NULL, '2025-12-14 23:10:52', 0, 0, 5, 5),
	(36, 5, 6, NULL, 'in_progress', NULL, '2025-12-14 23:15:38', 0, 0, 5, 5),
	(37, 5, 6, NULL, 'in_progress', NULL, '2025-12-14 23:22:23', 0, 0, 5, 5),
	(38, 5, 6, NULL, 'in_progress', NULL, '2025-12-14 23:25:12', 0, 1, 5, 5),
	(39, 5, 6, NULL, 'in_progress', NULL, '2025-12-14 23:31:01', 0, 0, 5, 5),
	(40, 5, 6, 6, 'finished', NULL, '2025-12-14 23:46:02', 0, 0, 0, 3),
	(41, 5, 6, NULL, 'in_progress', NULL, '2025-12-15 00:15:14', 0, 0, 5, 5),
	(42, 5, 6, NULL, 'in_progress', NULL, '2025-12-15 00:23:02', 0, 0, 5, 5),
	(43, 5, 6, NULL, 'in_progress', NULL, '2025-12-15 00:32:00', 0, 0, 5, 5),
	(44, 5, 6, NULL, 'in_progress', NULL, '2025-12-15 00:37:27', 0, 0, 5, 5),
	(45, 5, 6, NULL, 'in_progress', NULL, '2025-12-15 00:46:39', 1, 0, 4, 1),
	(46, 5, 6, NULL, 'in_progress', NULL, '2025-12-15 00:52:22', 1, 2, 5, 5),
	(47, 5, 6, 5, 'finished', NULL, '2025-12-15 00:56:21', 1, 1, 1, 0),
	(48, 5, 6, 5, 'finished', NULL, '2025-12-15 01:09:31', 1, 0, 5, 0),
	(49, 6, 5, 5, 'finished', NULL, '2025-12-15 01:20:38', 0, 1, 0, 5),
	(50, 5, 6, NULL, 'in_progress', NULL, '2025-12-15 01:34:31', 0, 0, 5, 5),
	(51, 5, 6, 6, 'finished', NULL, '2025-12-15 01:39:25', 2, 0, 0, 2),
	(52, 5, 6, 5, 'finished', NULL, '2025-12-15 01:53:09', 1, 0, 2, 0),
	(54, 5, 6, NULL, 'in_progress', NULL, '2025-12-15 02:12:35', 2, 1, 2, 4),
	(55, 5, 6, 6, 'finished', NULL, '2025-12-15 02:25:15', 0, 0, 0, 3),
	(56, 5, 6, NULL, 'in_progress', NULL, '2025-12-15 02:45:06', 0, 0, 2, 4),
	(57, 5, 6, NULL, 'in_progress', NULL, '2025-12-15 02:53:39', 0, 0, 5, 5),
	(58, 5, 6, NULL, 'in_progress', NULL, '2025-12-15 03:03:16', 0, 0, 5, 5),
	(59, 5, 6, 5, 'finished', NULL, '2025-12-15 03:09:02', 0, 0, 5, 0),
	(60, 5, 6, 5, 'finished', NULL, '2025-12-15 03:16:26', 0, 0, 3, 0),
	(61, 5, 6, NULL, 'in_progress', NULL, '2025-12-15 03:18:11', 0, 0, 5, 5);

-- 테이블 empiredice.player_states 구조 내보내기
CREATE TABLE IF NOT EXISTS `player_states` (
  `state_id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `user_id` int NOT NULL,
  `empire_hp` int NOT NULL DEFAULT '20',
  `coin` int NOT NULL DEFAULT '20',
  `board_position` int NOT NULL DEFAULT '0',
  `freeze_turns` int DEFAULT '0',
  `silence_turns` int DEFAULT '0',
  `turn_skip_count` int DEFAULT '0',
  `silence_count` int DEFAULT '0',
  `shield_count` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`state_id`),
  UNIQUE KEY `uq_player_states_session_user` (`session_id`,`user_id`),
  UNIQUE KEY `uq_player_state` (`session_id`,`user_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_session` (`session_id`),
  CONSTRAINT `fk_player_states_session` FOREIGN KEY (`session_id`) REFERENCES `game_sessions` (`session_id`),
  CONSTRAINT `fk_player_states_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=81 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 empiredice.player_states:~66 rows (대략적) 내보내기
INSERT IGNORE INTO `player_states` (`state_id`, `session_id`, `user_id`, `empire_hp`, `coin`, `board_position`, `freeze_turns`, `silence_turns`, `turn_skip_count`, `silence_count`, `shield_count`) VALUES
	(3, 22, 5, 20, 20, 0, 0, 0, 0, 0, 0),
	(4, 22, 6, 20, 20, 0, 0, 0, 0, 0, 0),
	(5, 23, 6, 20, 20, 0, 0, 0, 0, 0, 0),
	(6, 23, 5, 20, 20, 0, 0, 0, 0, 0, 0),
	(7, 24, 5, 20, 20, 0, 0, 0, 0, 0, 0),
	(8, 24, 6, 20, 20, 0, 0, 0, 0, 0, 0),
	(9, 25, 5, 20, 20, 0, 0, 0, 0, 0, 0),
	(10, 25, 6, 20, 20, 0, 0, 0, 0, 0, 0),
	(11, 26, 5, 20, 20, 0, 0, 0, 0, 0, 0),
	(12, 26, 6, 20, 20, 0, 0, 0, 0, 0, 0),
	(13, 27, 5, 20, 20, 0, 0, 0, 0, 0, 0),
	(14, 27, 6, 20, 20, 0, 0, 0, 0, 0, 0),
	(15, 28, 6, 20, 20, 0, 0, 0, 0, 0, 0),
	(16, 28, 5, 20, 20, 0, 0, 0, 0, 0, 0),
	(17, 29, 5, 20, 20, 0, 0, 0, 0, 0, 0),
	(18, 29, 6, 20, 20, 0, 0, 0, 0, 0, 0),
	(19, 30, 5, 20, 20, 0, 0, 0, 0, 0, 0),
	(20, 30, 6, 20, 20, 0, 0, 0, 0, 0, 0),
	(21, 31, 5, 20, 20, 0, 0, 0, 0, 0, 0),
	(22, 31, 6, 20, 20, 0, 0, 0, 0, 0, 0),
	(23, 32, 5, 20, 20, 0, 0, 0, 0, 0, 0),
	(24, 32, 6, 20, 20, 0, 0, 0, 0, 0, 0),
	(25, 34, 5, 20, 20, 0, 0, 0, 0, 0, 0),
	(26, 34, 6, 20, 20, 0, 0, 0, 0, 0, 0),
	(27, 36, 5, 20, 20, 0, 0, 0, 0, 0, 0),
	(28, 36, 6, 20, 20, 0, 0, 0, 0, 0, 0),
	(29, 37, 5, 20, 20, 0, 0, 0, 0, 0, 0),
	(30, 37, 6, 20, 20, 0, 0, 0, 0, 0, 0),
	(31, 38, 5, 20, 20, 0, 0, 0, 0, 0, 0),
	(32, 38, 6, 20, 20, 0, 0, 0, 0, 0, 0),
	(33, 39, 5, 20, 20, 0, 0, 0, 0, 0, 0),
	(34, 39, 6, 20, 20, 0, 0, 0, 0, 0, 0),
	(35, 40, 5, 20, 20, 0, 0, 0, 0, 0, 0),
	(36, 40, 6, 20, 20, 0, 0, 0, 0, 0, 0),
	(37, 41, 5, 20, 20, 0, 0, 0, 0, 0, 0),
	(38, 41, 6, 20, 20, 0, 0, 0, 0, 0, 0),
	(39, 42, 5, 20, 20, 0, 0, 0, 0, 0, 0),
	(40, 42, 6, 20, 20, 0, 0, 0, 0, 0, 0),
	(41, 43, 5, 20, 20, 0, 0, 0, 0, 0, 0),
	(42, 43, 6, 20, 20, 0, 0, 0, 0, 0, 0),
	(43, 44, 5, 20, 20, 0, 0, 0, 0, 0, 0),
	(44, 44, 6, 20, 20, 0, 0, 0, 0, 0, 0),
	(45, 45, 5, 20, 20, 0, 0, 0, 2, 0, 0),
	(46, 45, 6, 20, 20, 0, 0, 0, 2, 0, 0),
	(47, 46, 5, 20, 20, 0, 0, 0, 1, 0, 0),
	(48, 46, 6, 20, 20, 0, 0, 0, 1, 0, 0),
	(49, 47, 5, 20, 20, 0, 0, 0, 3, 0, 0),
	(50, 47, 6, 20, 20, 0, 0, 0, 2, 0, 0),
	(51, 48, 5, 20, 20, 0, 0, 0, 3, 0, 0),
	(52, 48, 6, 20, 20, 0, 0, 0, 0, 0, 0),
	(55, 49, 6, 20, 20, 0, 0, 0, 0, 0, 0),
	(56, 49, 5, 20, 20, 0, 0, 0, 2, 0, 0),
	(59, 50, 5, 20, 20, 0, 0, 0, 1, 0, 0),
	(60, 50, 6, 20, 20, 0, 0, 0, 0, 0, 0),
	(61, 51, 5, 20, 20, 0, 0, 0, 4, 0, 0),
	(62, 51, 6, 20, 20, 0, 0, 0, 1, 0, 0),
	(65, 52, 5, 20, 20, 0, 0, 0, 1, 0, 0),
	(66, 52, 6, 20, 20, 0, 0, 0, 3, 0, 0),
	(67, 54, 5, 20, 20, 0, 0, 0, 0, 0, 0),
	(68, 54, 6, 20, 20, 0, 0, 0, 0, 0, 0),
	(71, 59, 5, 5, 0, 0, 0, 0, 0, 0, 0),
	(72, 59, 6, 5, 0, 0, 0, 0, 0, 0, 0),
	(75, 60, 5, 5, 0, 0, 0, 0, 0, 0, 0),
	(76, 60, 6, 5, 0, 0, 0, 0, 0, 0, 0),
	(77, 61, 5, 5, 0, 0, 0, 0, 0, 0, 0),
	(78, 61, 6, 5, 0, 0, 0, 0, 0, 0, 0);

-- 테이블 empiredice.player_weapons 구조 내보내기
CREATE TABLE IF NOT EXISTS `player_weapons` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `user_id` int NOT NULL,
  `weapon_id` int NOT NULL,
  `count` int DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_player_weapon` (`session_id`,`user_id`,`weapon_id`),
  KEY `weapon_id` (`weapon_id`),
  KEY `user_id` (`user_id`),
  KEY `session_id` (`session_id`),
  CONSTRAINT `fk_player_weapons_session` FOREIGN KEY (`session_id`) REFERENCES `game_sessions` (`session_id`),
  CONSTRAINT `fk_player_weapons_state` FOREIGN KEY (`session_id`, `user_id`) REFERENCES `player_states` (`session_id`, `user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_player_weapons_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `fk_player_weapons_weapon` FOREIGN KEY (`weapon_id`) REFERENCES `weapons` (`weapon_id`)
) ENGINE=InnoDB AUTO_INCREMENT=157 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 empiredice.player_weapons:~21 rows (대략적) 내보내기
INSERT IGNORE INTO `player_weapons` (`id`, `session_id`, `user_id`, `weapon_id`, `count`, `created_at`) VALUES
	(9, 23, 5, 1, 2, '2025-12-14 18:30:00'),
	(11, 23, 6, 1, 1, '2025-12-14 18:30:39'),
	(17, 27, 5, 1, 1, '2025-12-14 19:51:05'),
	(18, 28, 5, 1, 1, '2025-12-14 20:02:31'),
	(19, 29, 6, 1, 1, '2025-12-14 20:45:22'),
	(30, 29, 5, 1, 2, '2025-12-14 20:48:33'),
	(38, 30, 5, 1, 1, '2025-12-14 22:58:41'),
	(39, 38, 6, 1, 1, '2025-12-14 23:25:31'),
	(54, 45, 5, 1, 1, '2025-12-15 00:49:39'),
	(55, 46, 6, 1, 2, '2025-12-15 00:52:43'),
	(57, 46, 5, 1, 1, '2025-12-15 00:53:27'),
	(59, 47, 6, 1, 1, '2025-12-15 00:56:35'),
	(78, 47, 5, 1, 1, '2025-12-15 01:00:39'),
	(82, 48, 5, 1, 1, '2025-12-15 01:09:59'),
	(85, 49, 5, 1, 1, '2025-12-15 01:21:13'),
	(103, 51, 5, 1, 2, '2025-12-15 01:41:21'),
	(110, 52, 5, 1, 1, '2025-12-15 01:54:22'),
	(118, 54, 5, 1, 2, '2025-12-15 02:12:55'),
	(121, 54, 6, 1, 1, '2025-12-15 02:13:35'),
	(136, 59, 6, 1, 2, '2025-12-15 03:09:13'),
	(154, 60, 5, 1, 1, '2025-12-15 03:17:51');

-- 테이블 empiredice.territories_definition 구조 내보내기
CREATE TABLE IF NOT EXISTS `territories_definition` (
  `territory_id` int NOT NULL AUTO_INCREMENT,
  `territory_name` varchar(50) NOT NULL,
  `territory_price` int DEFAULT NULL,
  `territory_toll` int DEFAULT NULL,
  `territory_grade` enum('약소국','강대국') DEFAULT NULL,
  `tile_type` enum('출발','영토','무기','무인도','침묵','강탈') NOT NULL,
  `tile_subtype` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`territory_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 empiredice.territories_definition:~7 rows (대략적) 내보내기
INSERT IGNORE INTO `territories_definition` (`territory_id`, `territory_name`, `territory_price`, `territory_toll`, `territory_grade`, `tile_type`, `tile_subtype`) VALUES
	(1, '출발', NULL, NULL, NULL, '출발', 'start'),
	(2, '약소국 영토', 5, 1, '약소국', '영토', 'normal_weak'),
	(3, '강대국 영토', 10, 5, '강대국', '영토', 'normal_strong'),
	(4, '무기 카드', NULL, NULL, NULL, '무기', 'weapon_box'),
	(5, '강탈', NULL, NULL, NULL, '강탈', 'special'),
	(6, '침묵', NULL, NULL, NULL, '침묵', 'special'),
	(7, '무인도', NULL, NULL, NULL, '무인도', 'special');

-- 테이블 empiredice.users 구조 내보내기
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `total_wins` int DEFAULT '0',
  `total_losses` int DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 empiredice.users:~2 rows (대략적) 내보내기
INSERT IGNORE INTO `users` (`user_id`, `username`, `password_hash`, `total_wins`, `total_losses`, `created_at`) VALUES
	(5, '123', '$2b$10$YQGvqoWd28d9MWP/Gg88VOBpldU5qMWiCnybbpPQABP11o889GaxK', 0, 0, '2025-12-14 18:23:51'),
	(6, '321', '$2b$10$FwaTeAGMh3e5CuyCyYZul.2rIYHQKkUZmgNhR6Csw5yY/93vNUmDC', 0, 0, '2025-12-14 18:24:00');

-- 테이블 empiredice.weapons 구조 내보내기
CREATE TABLE IF NOT EXISTS `weapons` (
  `weapon_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `effect_type` varchar(50) NOT NULL,
  `value` int NOT NULL,
  PRIMARY KEY (`weapon_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 empiredice.weapons:~4 rows (대략적) 내보내기
INSERT IGNORE INTO `weapons` (`weapon_id`, `name`, `effect_type`, `value`) VALUES
	(1, 'sword', 'sword', 1),
	(2, 'bow', 'bow', 3),
	(3, 'bomb', 'bomb', 5),
	(4, 'shield', 'shield', 0);

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
