CREATE TABLE Game_Sessions(
session_id INT AUTO_INCREMENT PRIMARY KEY,
Player1_id INT NULL,
player2_id INT NULL,
winner_id INT NULL,
STATUS ENUM('waiting', 'in_progress', 'finished') DEFAULT 'waiting',
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



CREATE TABLE Player_States(
state_id INT AUTO_INCREMENT PRIMARY KEY,
session_id INT NOT NULL,
user_id INT NOT NULL,
empire_hp INT DEFAULT 20,
coin INT DEFAULT 20,
board_position INT DEFAULT 0
);

SHOW TABLES;


CREATE TABLE Territories_Definition(
territory_id INT AUTO_INCREMENT PRIMARY KEY,
territory_NAME VARCHAR(50),
territory_price INT NULL,
territory_toll INT NULL,
territory_grade ENUM('약소국','강대국')
);

CREATE TABLE Weapons(
weapon_id INT AUTO_INCREMENT PRIMARY KEY,
weapon_name VARCHAR(50),
weapon_damage INT NULL,
weapon_desc TEXT);

CREATE TABLE Player_Inventories(
inventory_id INT AUTO_INCREMENT PRIMARY KEY,
session_id INT NOT NULL,
user_id INT NOT NULL,
weapon_id INT NOT NULL
);

CREATE TABLE Game_Territory_States(
states_id INT AUTO_INCREMENT PRIMARY KEY,
session_id INT NOT NULL,
territory_id INT NOT NULL,
owner_id INT,
has_building BOOLEAN );


CREATE TABLE Battles(
battle_id INT AUTO_INCREMENT PRIMARY KEY,
session_id INT,
attacker_id INT,
defender_id INT,
winner_id INT,
damage_log TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE Territories_Definition
ADD COLUMN tile_type ENUM('영토', '무기', '출발', '특수') DEFAULT '영토';

INSERT INTO Territories_Definition (territory_NAME, territory_price, territory_toll, territory_grade) VALUES
-- 강대국 4개
('미국', 5, 5, '강대국'),
('중국', 5, 5, '강대국'),
('러시아', 5, 5, '강대국'),
('한국', 5, 5, '강대국'),

-- 약소국 8개
('북한', 1, 1, '약소국'),
('몽골', 1, 1, '약소국'),
('소말리아', 1, 1, '약소국'),
('이라크', 1, 1, '약소국'),
('이란', 1, 1, '약소국'),
('쿠바', 1, 1, '약소국'),
('몰디브', 1, 1, '약소국'),
('아프가니스탄', 1, 1, '약소국');

SELECT * FROM territories_definition;

INSERT INTO Weapons (weapon_name, weapon_damage, weapon_desc)
VALUES
('검', 1, '기본 근접 무기'),
('활', 2, '중거리 공격 무기'),
('총', 3, '명중률 높은 원거리 무기'),
('수류탄', 5, '광범위 고폭발 무기');

TRUNCATE TABLE territories_definition;

	ALTER TABLE Territories_Definition
	MODIFY territory_price INT NOT NULL DEFAULT 0,
	MODIFY territory_toll  INT NOT NULL DEFAULT 0;

		ALTER TABLE Territories_Definition
		MODIFY territory_grade ENUM('약소국','강대국') NULL;
		
		ALTER TABLE Territories_Definition
MODIFY tile_type ENUM('영토','무기','특수','출발') NOT NULL;

INSERT INTO territories_definition 
(territory_NAME, territory_price, territory_toll, territory_grade, tile_type) VALUES
('출발', NULL, NULL, NULL, '출발'),
('약소국1', 1, 1, '약소국', '영토'),
('약소국2', 1, 1, '약소국', '영토'),
('무기', NULL, NULL, NULL, '무기'),
('강대국1', 5, 5, '강대국', '영토'),
('무인도', NULL, NULL, NULL, '특수'),
('약소국3', 1, 1, '약소국', '영토'),
('약소국4', 1, 1, '약소국', '영토'),
('무기', NULL, NULL, NULL, '무기'),
('강대국2', 5, 5, '강대국', '영토'),
('침묵', NULL, NULL, NULL, '특수'),
('약소국5', 1, 1, '약소국', '영토'),
('약소국6', 1, 1, '약소국', '영토'),
('무기', NULL, NULL, NULL, '무기'),
('강대국3', 5, 5, '강대국', '영토'),
('강탈', NULL, NULL, NULL, '특수'),
('약소국7', 1, 1, '약소국', '영토'),
('약소국8', 1, 1, '약소국', '영토'),
('무기', NULL, NULL, NULL, '무기'),
('강대국4', 5, 5, '강대국', '영토');
-- 12 약소국
('약소국', '약소국', 5, 1, '약소국'),
-- 13 약소국
('약소국', '약소국', 5, 1, '약소국'),
-- 14 무기카드
('무기카드', '무기카드', 0, 0, NULL),
-- 15 강대국
('강대국', '강대국', 10, 5, '강대국'),
-- 16 강탈
('강탈', 'special', 0, 0, NULL),
-- 17 약소국
('약소국', '약소국', 5, 1, '약소국'),
-- 18 약소국
('약소국', '약소국', 5, 1, '약소국'),
-- 19 무기카드
('무기카드', '무기카드', 0, 0, NULL),
-- 20 강대국
('강대국', '강대국', 10, 5, '강대국');


INSERT INTO Game_Territory_States (session_id, territory_id, owner_id, has_building)
SELECT 1, territory_id, NULL, 0
FROM territories_definition;

SELECT * FROM territories_definition;

SELECT * FROM Game_Territory_States WHERE session_id = 1


ALTER TABLE Territories_Definition
ADD COLUMN tile_subtype VARCHAR(20) NULL;

UPDATE Territories_Definition SET tile_subtype = '출발' WHERE territory_id = 1;
UPDATE Territories_Definition SET tile_subtype = '무인도' WHERE territory_id = 6;
UPDATE Territories_Definition SET tile_subtype = '침묵' WHERE territory_id = 11;
UPDATE Territories_Definition SET tile_subtype = '강탈' WHERE territory_id = 16;

INSERT INTO Game_Territory_States (session_id, territory_id, owner_id, has_building)
SELECT 1, territory_id, NULL, 0
FROM territories_definition;

SELECT * FROM Game_Territory_States WHERE session_id = 1;

DELETE FROM game_territory_states
WHERE session_id = 1;

INSERT INTO Player_States
(session_id, user_id, empire_hp, coin, board_position)
VALUES
(1, 1, 20, 20, 1),
(1, 2, 20, 20, 1);

SELECT * FROM Player_States WHERE session_id = 1;

DELETE FROM Player_States
WHERE session_id = 1;

INSERT INTO Player_Inventories (session_id, user_id, weapon_id)
VALUES (1, 1, 1);

SELECT * FROM player_inventories;

DELETE FROM Player_Inventories
WHERE session_id = 1;

UPDATE Player_States
SET board_position = 4
WHERE session_id = 1 AND user_id = 1;

SELECT tile_type, tile_subtype, territory_grade, territory_price, territory_toll
FROM Territories_Definition
WHERE territory_id = 4; 

SELECT territory_id, tile_type 
FROM Territories_Definition 
ORDER BY territory_id;

SELECT territory_id, tile_subtype 
FROM Territories_Definition
ORDER BY territory_id;

-- 출발
UPDATE Territories_Definition SET tile_subtype = '출발' WHERE territory_id = 1;

-- 약소국
UPDATE Territories_Definition SET tile_subtype = '약소국' WHERE territory_id IN (2, 3, 7, 8, 12, 13, 17, 18);

-- 무기
UPDATE Territories_Definition SET tile_subtype = '무기' WHERE territory_id IN (4, 9, 14, 19);

-- 강대국
UPDATE Territories_Definition SET tile_subtype = '강대국' WHERE territory_id IN (5, 10, 15, 20);

-- 특수칸
UPDATE Territories_Definition SET tile_subtype = '무인도' WHERE territory_id = 6;
UPDATE Territories_Definition SET tile_subtype = '침묵' WHERE territory_id = 11;
UPDATE Territories_Definition SET tile_subtype = '강탈' WHERE territory_id = 16;

SELECT territory_id, tile_subtype
FROM Territories_Definition
ORDER BY territory_id;