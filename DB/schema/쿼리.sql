CREATE TABLE country (
    id INT AUTO_INCREMENT PRIMARY KEY,
    country_name VARCHAR(50) NOT NULL,
    country_grade VARCHAR(10) NOT NULL,
    country_flag_image VARCHAR(100) NOT NULL
);

INSERT INTO country (country_name, country_grade, country_flag_image) VALUES
('미국', '강', 'US.png'),
('중국', '강', 'CN.png'),
('러시아', '강', 'RU.png'),
('한국', '강', 'KR.png'),

('북한', '약', 'KP.png'),
('몽골', '약', 'MN.png'),
('소말리아', '약', 'SO.png'),
('이라크', '약', 'IQ.png'),
('이란', '약', 'IR.png'),
('쿠바', '약', 'CU.png'),
('몰디브', '약', 'MV.png'),
('아프가니스탄', '약', 'AF.png');