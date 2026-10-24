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
#--Insercion para tener la misma base todos--
#--Con este modificas el rol a como estamos en el proyecto con los nombres de los integrantes --
#--De tu parte crea el usuario Emanuel, Jesus y Osmar--

-- Scrum Master
UPDATE usuarios
SET
    nombre = 'Nino Alessandro',
    username = 'nino'
WHERE id_usuario = 1;

-- Product Owner
UPDATE usuarios
SET
    nombre = 'Cesar Rodrigo',
    username = 'cesar'
WHERE id_usuario = 2;

-- Desarrollador
UPDATE usuarios
SET
    nombre = 'Francisco',
    username = 'francisco'
WHERE id_usuario = 3;
#--limpias tabla--
DELETE FROM proyectos
WHERE id_proyecto > 0;

-- Reiniciar contador de proyectos
ALTER TABLE proyectos AUTO_INCREMENT = 1;
-- ==========================================
-- 1. CREAR USUARIOS NUEVOS
-- ==========================================

INSERT INTO usuarios (nombre, username, password, rol)
VALUES
('Emanuel', 'emanuel', '1234', 'Desarrollador'),
('Jesús', 'jesus', '1234', 'Desarrollador'),
('Osmar Antonio', 'osmar', '1234', 'Desarrollador')
ON DUPLICATE KEY UPDATE
    nombre = VALUES(nombre);
-- ==========================================
-- 2. CREAR PROYECTO
-- ==========================================

INSERT INTO proyectos (
    nombre,
    objetivo,
    activo
)
VALUES (
    'Proyecto gestion de procesos',
    'Crear una app de scrum que permita organizar tus tareas',
    TRUE
);

SET @idProyecto = LAST_INSERT_ID();


-- ==========================================
-- 3. AGREGAR INTEGRANTES AL PROYECTO
-- ==========================================

INSERT INTO proyecto_usuarios (
    id_proyecto,
    id_usuario,
    rol,
    activo
)
SELECT
    @idProyecto,
    id_usuario,

    CASE
        WHEN username = 'nino'
            THEN 'Scrum Master'

        WHEN username = 'cesar'
            THEN 'Product Owner'

        ELSE 'Desarrollador'
    END,

    TRUE

FROM usuarios

WHERE username IN (
    'nino',
    'cesar',
    'francisco',
    'emanuel',
    'jesus',
    'osmar'
);


-- ==========================================
-- 4. CREAR SPRINT 1
-- ==========================================

INSERT INTO sprints (
    id_proyecto,
    numero,
    objetivo,
    fecha_inicio,
    fecha_fin,
    duracion_dias,
    estado
)
VALUES (
    @idProyecto,
    1,
    'Terminar bien la grafica',
    '2026-10-23',
    '2026-10-26',
    4,
    'Planificado'
);

SET @idSprint = LAST_INSERT_ID();


-- ==========================================
-- 5. OBTENER ID DEL DESARROLLADOR
-- ==========================================

SET @idOsmar = (
    SELECT id_usuario
    FROM usuarios
    WHERE username = 'osmar'
    LIMIT 1
);


-- ==========================================
-- 6. CREAR HISTORIA DE USUARIO
-- ==========================================

INSERT INTO product_backlog (
    id_proyecto,
    id_sprint,
    titulo,
    descripcion,
    puntos,
    prioridad,
    orden,
    estado_historia,
    id_responsable
)
VALUES (
    @idProyecto,
    @idSprint,
    'Funcionalidad de grafica',
    'Hacer una grafica que registre todo el proyecto con su proceso',
    8,
    'Alta',
    1,
    'Terminada',
    @idOsmar
);

SET @idHistoria = LAST_INSERT_ID();


-- ==========================================
-- 7. CREAR CRITERIOS DE ACEPTACIÓN
-- ==========================================

INSERT INTO criterios_aceptacion (
    id_historia,
    descripcion,
    completado
)
VALUES
(
    @idHistoria,
    'La gráfica debe mostrar el avance de las tareas del proyecto.',
    TRUE
),
(
    @idHistoria,
    'La gráfica debe actualizarse cuando cambie el estado de las tareas.',
    TRUE
),
(
    @idHistoria,
    'La información debe presentarse de forma clara y organizada.',
    TRUE
);


-- ==========================================
-- 8. VERIFICAR USUARIOS
-- ==========================================

SELECT
    id_usuario,
    nombre,
    username,
    rol
FROM usuarios;


-- ==========================================
-- 9. VERIFICAR PROYECTO
-- ==========================================

SELECT *
FROM proyectos
WHERE id_proyecto = @idProyecto;


-- ==========================================
-- 10. VERIFICAR INTEGRANTES
-- ==========================================

SELECT
    u.nombre,
    u.username,
    pu.rol

FROM proyecto_usuarios pu

INNER JOIN usuarios u
    ON pu.id_usuario = u.id_usuario

WHERE pu.id_proyecto = @idProyecto;


-- ==========================================
-- 11. VERIFICAR SPRINT
-- ==========================================

SELECT *
FROM sprints
WHERE id_proyecto = @idProyecto;


-- ==========================================
-- 12. VERIFICAR HISTORIA
-- ==========================================

SELECT
    pb.id_historia,
    pb.titulo,
    pb.descripcion,
    pb.puntos,
    pb.prioridad,
    pb.estado_historia,
    u.nombre AS responsable

FROM product_backlog pb

LEFT JOIN usuarios u
    ON pb.id_responsable = u.id_usuario

WHERE pb.id_proyecto = @idProyecto;


-- ==========================================
-- 13. VERIFICAR CRITERIOS
-- ==========================================

SELECT *
FROM criterios_aceptacion
WHERE id_historia = @idHistoria;

#--PB-19 y PB-20: Revision de entregables por el Product Owner--
#--Se puede ejecutar solo esta seccion sobre una base ya existente--
USE scrument;

-- 1) Nuevos estados de la historia (los valores van sin acento; la pantalla muestra "En revisión"):
--    'En revision' = enviada a revision | 'Aprobada' / 'Rechazada' = decision del Product Owner
ALTER TABLE product_backlog
    MODIFY COLUMN estado_historia
        ENUM('Pendiente', 'En curso', 'Terminada', 'En revision', 'Aprobada', 'Rechazada')
        NOT NULL DEFAULT 'Pendiente';

-- 2) Evidencias (archivos) que el equipo adjunta al enviar la historia a revision.
--    El archivo fisico vive en uploads/evidencias/<nombre_archivo>.
CREATE TABLE IF NOT EXISTS evidencias_historia (
    id_evidencia INT AUTO_INCREMENT PRIMARY KEY,
    id_historia INT NOT NULL,
    id_usuario INT NULL,
    nombre_original VARCHAR(255) NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    tipo_mime VARCHAR(100) NULL,
    tamano_bytes INT UNSIGNED NULL,
    fecha_subida TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_evidencias_historia (id_historia),
    CONSTRAINT fk_evidencias_historia
        FOREIGN KEY (id_historia) REFERENCES product_backlog(id_historia)
        ON DELETE CASCADE,
    CONSTRAINT fk_evidencias_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON DELETE SET NULL
);

-- 3) Historial de decisiones: una fila por cada vez que el Product Owner aprueba o rechaza.
--    Si una historia rechazada vuelve a revision, conserva todas sus decisiones anteriores.
CREATE TABLE IF NOT EXISTS revisiones_historia (
    id_revision INT AUTO_INCREMENT PRIMARY KEY,
    id_historia INT NOT NULL,
    id_revisor INT NULL,
    decision ENUM('Aprobada', 'Rechazada') NOT NULL,
    observaciones TEXT NULL,
    fecha_revision TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_revisiones_historia (id_historia, id_revision),
    CONSTRAINT fk_revisiones_historia
        FOREIGN KEY (id_historia) REFERENCES product_backlog(id_historia)
        ON DELETE CASCADE,
    CONSTRAINT fk_revisiones_revisor
        FOREIGN KEY (id_revisor) REFERENCES usuarios(id_usuario)
        ON DELETE SET NULL
);