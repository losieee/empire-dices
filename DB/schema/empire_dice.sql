-- --------------------------------------------------------
-- 호스트:                          127.0.0.1
-- 서버 버전:                        8.0.43 - MySQL Community Server - GPL
-- 서버 OS:                        Win64
-- HeidiSQL 버전:                  12.12.0.7122
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- empire_dice 데이터베이스 구조 내보내기
CREATE DATABASE IF NOT EXISTS `empire_dice` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `empire_dice`;

-- 테이블 empire_dice.battles 구조 내보내기
CREATE TABLE IF NOT EXISTS `battles` (
  `battle_id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `attacker_id` int NOT NULL,
  `defender_id` int NOT NULL,
  `winner_id` int DEFAULT NULL,
  `damage_log` text,
  `created_at` datetime NOT NULL DEFAULT (now()),
  PRIMARY KEY (`battle_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 empire_dice.battles:~0 rows (대략적) 내보내기

-- 테이블 empire_dice.game_sessions 구조 내보내기
CREATE TABLE IF NOT EXISTS `game_sessions` (
  `session_id` int NOT NULL AUTO_INCREMENT,
  `Player1_id` int DEFAULT NULL,
  `player2_id` int DEFAULT NULL,
  `winner_id` int NOT NULL,
  `STATUS` enum('waiting','in_progress','finished') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'waiting',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 empire_dice.game_sessions:~0 rows (대략적) 내보내기

-- 테이블 empire_dice.game_territory_states 구조 내보내기
CREATE TABLE IF NOT EXISTS `game_territory_states` (
  `states_id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `territory_id` int NOT NULL,
  `owner_id` int DEFAULT NULL,
  `has_building` tinyint(1) NOT NULL,
  PRIMARY KEY (`states_id`)
) ENGINE=InnoDB AUTO_INCREMENT=63 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 empire_dice.game_territory_states:~40 rows (대략적) 내보내기

-- 테이블 empire_dice.player_inventories 구조 내보내기
CREATE TABLE IF NOT EXISTS `player_inventories` (
  `inventory_id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `user_id` int NOT NULL,
  `weapon_id` int NOT NULL,
  PRIMARY KEY (`inventory_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 empire_dice.player_inventories:~0 rows (대략적) 내보내기

-- 테이블 empire_dice.player_states 구조 내보내기
CREATE TABLE IF NOT EXISTS `player_states` (
  `state_id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `user_id` int NOT NULL,
  `empire_hp` int NOT NULL DEFAULT '20',
  `coin` int NOT NULL DEFAULT '20',
  `board_position` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`state_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 empire_dice.player_states:~0 rows (대략적) 내보내기

-- 테이블 empire_dice.territories_definition 구조 내보내기
CREATE TABLE IF NOT EXISTS `territories_definition` (
  `territory_id` int NOT NULL AUTO_INCREMENT,
  `territory_NAME` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `territory_price` int DEFAULT NULL,
  `territory_toll` int DEFAULT NULL,
  `territory_grade` enum('약소국','강대국') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `tile_type` enum('영토','무기','특수','출발') NOT NULL,
  `tile_subtype` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`territory_id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 empire_dice.territories_definition:~20 rows (대략적) 내보내기
INSERT INTO `territories_definition` (`territory_id`, `territory_NAME`, `territory_price`, `territory_toll`, `territory_grade`, `tile_type`, `tile_subtype`) VALUES
	(1, '출발', NULL, NULL, NULL, '출발', '출발'),
	(2, '약소국1', 1, 1, '약소국', '영토', '약소국'),
	(3, '약소국2', 1, 1, '약소국', '영토', '약소국'),
	(4, '무기', NULL, NULL, NULL, '무기', '무기'),
	(5, '강대국1', 5, 5, '강대국', '영토', '강대국'),
	(6, '무인도', NULL, NULL, NULL, '특수', '무인도'),
	(7, '약소국3', 1, 1, '약소국', '영토', '약소국'),
	(8, '약소국4', 1, 1, '약소국', '영토', '약소국'),
	(9, '무기', NULL, NULL, NULL, '무기', '무기'),
	(10, '강대국2', 5, 5, '강대국', '영토', '강대국'),
	(11, '침묵', NULL, NULL, NULL, '특수', '침묵'),
	(12, '약소국5', 1, 1, '약소국', '영토', '약소국'),
	(13, '약소국6', 1, 1, '약소국', '영토', '약소국'),
	(14, '무기', NULL, NULL, NULL, '무기', '무기'),
	(15, '강대국3', 5, 5, '강대국', '영토', '강대국'),
	(16, '강탈', NULL, NULL, NULL, '특수', '강탈'),
	(17, '약소국7', 1, 1, '약소국', '영토', '약소국'),
	(18, '약소국8', 1, 1, '약소국', '영토', '약소국'),
	(19, '무기', NULL, NULL, NULL, '무기', '무기'),
	(20, '강대국4', 5, 5, '강대국', '영토', '강대국');

-- 테이블 empire_dice.users 구조 내보내기
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `total_wins` int unsigned NOT NULL DEFAULT '0',
  `total_losses` int unsigned NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 empire_dice.users:~0 rows (대략적) 내보내기

-- 테이블 empire_dice.weapons 구조 내보내기
CREATE TABLE IF NOT EXISTS `weapons` (
  `weapon_id` int NOT NULL AUTO_INCREMENT,
  `weapon_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `weapon_damage` int NOT NULL,
  `weapon_desc` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  PRIMARY KEY (`weapon_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 empire_dice.weapons:~0 rows (대략적) 내보내기
INSERT INTO `weapons` (`weapon_id`, `weapon_name`, `weapon_damage`, `weapon_desc`) VALUES
	(1, '검', 1, '기본 근접 무기'),
	(2, '활', 2, '중거리 공격 무기'),
	(3, '총', 3, '명중률 높은 원거리 무기'),
	(4, '수류탄', 5, '광범위 고폭발 무기');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
