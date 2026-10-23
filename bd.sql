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
('Scrum Master', 'scrummaster', '1234', 'Scrum Master'),
('Product Owner', 'productowner', '1234', 'Product Owner'),
('Desarrollador', 'desarrollador', '1234', 'Desarrollador');

SELECT * FROM usuarios;

CREATE TABLE IF NOT EXISTS proyectos (
    id_proyecto INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    objetivo TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS proyecto_usuarios (
    id_proyecto INT NOT NULL,
    id_usuario INT NOT NULL,
    rol ENUM('Scrum Master', 'Product Owner', 'Desarrollador') NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id_proyecto, id_usuario),
    CONSTRAINT fk_proyecto_usuarios_proyecto
        FOREIGN KEY (id_proyecto) REFERENCES proyectos(id_proyecto)
        ON DELETE CASCADE,
    CONSTRAINT fk_proyecto_usuarios_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
);

#---Semana 1: PB-13-César: Configuración del Sprint---

CREATE TABLE IF NOT EXISTS sprints (
    id_sprint INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto INT NOT NULL,
    numero INT NOT NULL,
    objetivo TEXT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    duracion_dias INT NOT NULL,
    estado ENUM('Planificado', 'En curso', 'Finalizado') NOT NULL DEFAULT 'Planificado',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_sprint_numero (id_proyecto, numero),
    CONSTRAINT chk_sprint_fechas CHECK (fecha_fin >= fecha_inicio),
    CONSTRAINT fk_sprints_proyecto
        FOREIGN KEY (id_proyecto) REFERENCES proyectos(id_proyecto)
        ON DELETE CASCADE
);

#---Semana 2: PB- 06 Y 07: Invitaciones a proyectos---

CREATE TABLE IF NOT EXISTS invitaciones_proyecto (
    id_invitacion INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto INT NOT NULL,
    id_invitado INT NOT NULL,
    id_invitador INT NOT NULL,
    rol ENUM('Product Owner', 'Desarrollador') NOT NULL,
    estado ENUM('Pendiente', 'Aceptada')
        NOT NULL DEFAULT 'Pendiente',
    fecha_creacion TIMESTAMP
        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_respuesta TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY uq_invitacion_por_proyecto (
        id_proyecto,
        id_invitado
    ),

    INDEX idx_invitaciones_bandeja (
        id_invitado,
        estado
    ),

    CONSTRAINT fk_invitaciones_proyecto
        FOREIGN KEY (id_proyecto)
        REFERENCES proyectos(id_proyecto)
        ON DELETE CASCADE,

    CONSTRAINT fk_invitaciones_invitado
        FOREIGN KEY (id_invitado)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT fk_invitaciones_invitador
        FOREIGN KEY (id_invitador)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
);
SELECT * FROM invitaciones_proyecto;

#---Semana 1: PB-09 a PB-12 (Osmar): Product Backlog e Historias---

CREATE TABLE IF NOT EXISTS product_backlog (
    id_historia INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto INT NOT NULL,
    id_sprint INT NULL,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    prioridad ENUM('Alta', 'Media', 'Baja') DEFAULT 'Media',
    orden INT NOT NULL DEFAULT 0,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pb_proyecto
        FOREIGN KEY (id_proyecto) REFERENCES proyectos(id_proyecto)
        ON DELETE CASCADE,
    CONSTRAINT fk_pb_sprint
        FOREIGN KEY (id_sprint) REFERENCES sprints(id_sprint)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS criterios_aceptacion (
    id_criterio INT AUTO_INCREMENT PRIMARY KEY,
    id_historia INT NOT NULL,
    descripcion TEXT NOT NULL,
    completado BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_criterios_historia
        FOREIGN KEY (id_historia) REFERENCES product_backlog(id_historia)
        ON DELETE CASCADE
);

ALTER TABLE product_backlog 
ADD COLUMN puntos INT NULL AFTER descripcion;



#--yisus--
ALTER TABLE product_backlog
    ADD COLUMN estado_historia
        ENUM('Pendiente', 'En curso', 'Terminada')
        NOT NULL DEFAULT 'Pendiente',

    ADD COLUMN id_responsable INT NULL,

    ADD CONSTRAINT fk_pb_responsable
        FOREIGN KEY (id_responsable)
        REFERENCES usuarios(id_usuario)
        ON DELETE SET NULL;
        
        
#--Franks spring 2--
CREATE TABLE IF NOT EXISTS mensajes_product_owner (
    id_mensaje INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto INT NOT NULL,
    id_autor INT NULL,
    titulo VARCHAR(150) NOT NULL,
    contenido TEXT NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_mensajes_po_proyecto_fecha (id_proyecto, fecha_creacion, id_mensaje),
    CONSTRAINT fk_mensajes_po_proyecto
        FOREIGN KEY (id_proyecto) REFERENCES proyectos(id_proyecto)
        ON DELETE CASCADE,
    CONSTRAINT fk_mensajes_po_autor
        FOREIGN KEY (id_autor) REFERENCES usuarios(id_usuario)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lecturas_mensajes_product_owner (
    id_mensaje INT NOT NULL,
    id_usuario INT NOT NULL,
    fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_mensaje, id_usuario),
    CONSTRAINT fk_lecturas_po_mensaje
        FOREIGN KEY (id_mensaje) REFERENCES mensajes_product_owner(id_mensaje)
        ON DELETE CASCADE,
    CONSTRAINT fk_lecturas_po_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
);
