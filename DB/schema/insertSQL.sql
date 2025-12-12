
-- 1) 무기 테이블 초기 데이터
INSERT INTO weapons (weapon_id, name, effect_type, value) VALUES
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