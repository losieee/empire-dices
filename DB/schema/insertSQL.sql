
-- 1) 무기 테이블 초기 데이터
INSERT INTO weapons (weapon_id, name, effect_type, VALUE) VALUES
(1, 'sword', 'sword', 1),     -- 상대 empire_hp 1 감소
(2, 'bow', 'bow', 3),         -- 상대 empire_hp 3 감소 
(3, 'bomb', 'bomb', 5),       -- 상대 empire_hp 5 감소
(4, 'shield', 'shield', 0);   -- 다음 공격 무효, shield_count +1

-- 2) territories_definition 초기 데이터
INSERT INTO territories_definition
(territory_id, territory_name, territory_price, territory_toll, territory_grade, tile_type, tile_subtype)
VALUES
(1, '출발',          NULL, NULL, NULL,       '출발', 'start'),
(2, '약소국 영토',      5,    1,   '약소국',   '영토',  'normal_weak'),
(3, '강대국 영토',     10,    5,   '강대국',   '영토',  'normal_strong'),
(4, '무기 카드',       NULL, NULL, NULL,     '무기',  'weapon_box'),
(5, '강탈',           NULL, NULL, NULL,     '강탈',  'special'),
(6, '침묵',           NULL, NULL, NULL,     '침묵',  'special'),
(7, '무인도',         NULL, NULL, NULL,     '무인도','special');

-- 3) country 테이블 초기 데이터
INSERT INTO country (id, country_name, country_grade, country_flag_image) VALUES
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
DELETE FROM player_states;
DELETE FROM game_sessions;

ALTER TABLE game_sessions AUTO_INCREMENT = 1;

ALTER TABLE game_sessions
MODIFY status ENUM('waiting', 'ready', 'playing') NOT NULL;

ALTER TABLE game_sessions
ADD COLUMN player1_weapon INT DEFAULT 0,
ADD COLUMN player2_weapon INT DEFAULT 0;

ALTER TABLE game_sessions
ADD COLUMN player1_hp INT DEFAULT 5;
ADD COLUMN player2_hp INT DEFAULT 5;

ALTER TABLE player_weapons
  ADD UNIQUE KEY uq_player_weapon (session_id, user_id, weapon_id);
  
INSERT INTO weapons (weapon_id, name, effect_type, value)
VALUES (1,'WeaponCard','card',1)
ON DUPLICATE KEY UPDATE name=VALUES(NAME);

SHOW INDEX FROM player_weapons;

ALTER TABLE player_states
  ADD UNIQUE KEY uq_player_states_session_user (session_id, user_id);
  
  ALTER TABLE player_weapons
  ADD CONSTRAINT fk_player_weapons_state
  FOREIGN KEY (session_id, user_id)
  REFERENCES player_states (session_id, user_id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;
  
  SHOW CREATE TABLE player_weapons;
  
  ALTER TABLE player_weapons
  DROP FOREIGN KEY player_weapons_ibfk_1,
  DROP FOREIGN KEY player_weapons_ibfk_2,
  DROP FOREIGN KEY player_weapons_ibfk_3;
  
  SHOW INDEX FROM player_weapons;