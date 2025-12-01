DROP DATABASE IF EXISTS empire_dice;
CREATE DATABASE empire_dice;
USE empire_dice;

CREATE TABLE users (
  user_id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  total_wins INT DEFAULT 0,
  total_losses INT DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY username (username)
);

CREATE TABLE game_sessions (
  session_id INT NOT NULL AUTO_INCREMENT,
  player1_id INT DEFAULT NULL,
  player2_id INT DEFAULT NULL,
  winner_id INT DEFAULT NULL,
  status ENUM('waiting','in_progress','finished') NOT NULL DEFAULT 'waiting',
  current_turn INT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (session_id)
);

CREATE TABLE player_states (
  state_id INT NOT NULL AUTO_INCREMENT,
  session_id INT NOT NULL,
  user_id INT NOT NULL,
  empire_hp INT NOT NULL DEFAULT 20,
  coin INT NOT NULL DEFAULT 20,
  board_position INT NOT NULL DEFAULT 0,
  PRIMARY KEY (state_id)
);

CREATE TABLE territories_definition (
  territory_id INT NOT NULL AUTO_INCREMENT,
  territory_name VARCHAR(50) NOT NULL,
  territory_price INT DEFAULT NULL,
  territory_toll INT DEFAULT NULL,
  territory_grade ENUM('약소국','강대국') DEFAULT NULL,
  tile_type ENUM('영토','무기','특수','출발') NOT NULL,
  tile_subtype VARCHAR(20) DEFAULT NULL,
  PRIMARY KEY (territory_id)
);

CREATE TABLE board_tiles (
    tile_id INT AUTO_INCREMENT PRIMARY KEY,
    index_pos INT NOT NULL,
    tile_type VARCHAR(50) NOT NULL,
    value INT DEFAULT 0
);


INSERT INTO territories_definition (territory_name, territory_price, territory_toll, territory_grade, tile_type, tile_subtype) VALUES
('출발',NULL,NULL,NULL,'출발','출발'),
('약소국1',1,1,'약소국','영토','약소국'),
('약소국2',1,1,'약소국','영토','약소국'),
('무기',NULL,NULL,NULL,'무기','무기'),
('강대국1',5,5,'강대국','영토','강대국'),
('무인도',NULL,NULL,NULL,'특수','무인도'),
('약소국3',1,1,'약소국','영토','약소국'),
('약소국4',1,1,'약소국','영토','약소국'),
('무기',NULL,NULL,NULL,'무기','무기'),
('강대국2',5,5,'강대국','영토','강대국'),
('침묵',NULL,NULL,NULL,'특수','침묵'),
('약소국5',1,1,'약소국','영토','약소국'),
('약소국6',1,1,'약소국','영토','약소국'),
('무기',NULL,NULL,NULL,'무기','무기'),
('강대국3',5,5,'강대국','영토','강대국'),
('강탈',NULL,NULL,NULL,'특수','강탈'),
('약소국7',1,1,'약소국','영토','약소국'),
('약소국8',1,1,'약소국','영토','약소국'),
('무기',NULL,NULL,NULL,'무기','무기'),
('강대국4',5,5,'강대국','영토','강대국');

INSERT INTO users (username, password_hash, created_at) VALUES
('test1', '$2b$10$COSvyWNxJfYCEJLQoRA4q.wgl0jDfws9ViZ0Rj2y07G9FmNtjdKkC', NOW()),
('test2', '$2b$10$COSvyWNxJfYCEJLQoRA4q.wgl0jDfws9ViZ0Rj2y07G9FmNtjdKkC', NOW());
empire_dice
