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
