#Creacion base de datos Downzon
CREATE DATABASE scrument;
USE scrument;
CREATE USER 'userScrument'@'localhost' IDENTIFIED BY 'scrument123';
GRANT ALL PRIVILEGES ON scrument.* TO 'userScrument'@'localhost';
FLUSH PRIVILEGES;

#Script de la base de datos
#---Semana 1---
USE scrument;

CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol ENUM('Scrum Master', 'Product Owner', 'Desarrollador') NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO usuarios (nombre, username, password, rol) VALUES
('Scrum Master de prueba', 'scrummaster', '1234', 'Scrum Master'),
('Product Owner de prueba', 'productowner', '1234', 'Product Owner'),
('Desarrollador de prueba', 'desarrollador', '1234', 'Desarrollador');

SELECT * FROM usuarios;