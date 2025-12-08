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

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 empiredice.country 구조 내보내기
CREATE TABLE IF NOT EXISTS `country` (
  `id` int NOT NULL AUTO_INCREMENT,
  `country_name` varchar(50) NOT NULL,
  `country_grade` varchar(10) NOT NULL,
  `country_flag_image` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 empiredice.game_sessions 구조 내보내기
CREATE TABLE IF NOT EXISTS `game_sessions` (
  `session_id` int NOT NULL AUTO_INCREMENT,
  `player1_id` int DEFAULT NULL,
  `player2_id` int DEFAULT NULL,
  `winner_id` int DEFAULT NULL,
  `status` enum('waiting','in_progress','finished') NOT NULL DEFAULT 'waiting',
  `current_turn` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`session_id`),
  KEY `fk_game_sessions_player1` (`player1_id`),
  KEY `fk_game_sessions_player2` (`player2_id`),
  KEY `fk_game_sessions_winner` (`winner_id`),
  CONSTRAINT `fk_game_sessions_player1` FOREIGN KEY (`player1_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `fk_game_sessions_player2` FOREIGN KEY (`player2_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `fk_game_sessions_winner` FOREIGN KEY (`winner_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

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
  KEY `idx_user` (`user_id`),
  KEY `idx_session` (`session_id`),
  CONSTRAINT `fk_player_states_session` FOREIGN KEY (`session_id`) REFERENCES `game_sessions` (`session_id`),
  CONSTRAINT `fk_player_states_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 empiredice.player_weapons 구조 내보내기
CREATE TABLE IF NOT EXISTS `player_weapons` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `user_id` int NOT NULL,
  `weapon_id` int NOT NULL,
  `count` int DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `weapon_id` (`weapon_id`),
  KEY `user_id` (`user_id`),
  KEY `session_id` (`session_id`),
  CONSTRAINT `fk_player_weapons_session` FOREIGN KEY (`session_id`) REFERENCES `game_sessions` (`session_id`),
  CONSTRAINT `fk_player_weapons_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `fk_player_weapons_weapon` FOREIGN KEY (`weapon_id`) REFERENCES `weapons` (`weapon_id`),
  CONSTRAINT `player_weapons_ibfk_1` FOREIGN KEY (`weapon_id`) REFERENCES `weapons` (`weapon_id`),
  CONSTRAINT `player_weapons_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `player_states` (`user_id`),
  CONSTRAINT `player_weapons_ibfk_3` FOREIGN KEY (`session_id`) REFERENCES `player_states` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

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

-- 내보낼 데이터가 선택되어 있지 않습니다.

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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 empiredice.weapons 구조 내보내기
CREATE TABLE IF NOT EXISTS `weapons` (
  `weapon_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `effect_type` varchar(50) NOT NULL,
  `value` int NOT NULL,
  PRIMARY KEY (`weapon_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
