
    CONSTRAINT fk_notificaciones_historia
        FOREIGN KEY (id_historia)
        REFERENCES product_backlog(id_historia)
        ON DELETE CASCADE
);


#---Sprint 4: PB-32 y PB-33 (César): Registro y consulta de tiempos---
CREATE TABLE IF NOT EXISTS registros_tiempo (
    id_registro INT AUTO_INCREMENT PRIMARY KEY,
    id_historia INT NOT NULL,
    id_usuario INT NOT NULL,
    fecha_trabajo DATE NOT NULL,
    horas DECIMAL(5,2) NOT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tiempos_historia (id_historia),
    INDEX idx_tiempos_usuario_fecha (id_usuario, fecha_trabajo),
    CONSTRAINT chk_tiempos_horas CHECK (horas > 0 AND horas <= 24),
    CONSTRAINT fk_tiempos_historia
        FOREIGN KEY (id_historia) REFERENCES product_backlog(id_historia)
        ON DELETE CASCADE,
    CONSTRAINT fk_tiempos_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- Francisco: Sprint 4, PB-40 y PB-41.
CREATE TABLE IF NOT EXISTS capacitaciones_completadas (
    id_registro INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    tipo_capacitacion ENUM('SCRUM_MASTER', 'PRODUCT_OWNER', 'DESARROLLADOR') NOT NULL,
    id_intento CHAR(32) NOT NULL,
    fecha_finalizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_capacitacion_intento (id_usuario, id_intento),
    INDEX idx_capacitacion_usuario_tipo (id_usuario, tipo_capacitacion),
    CONSTRAINT fk_capacitacion_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

##sprint 5 jesus
-- JESUS - PB-34: RETROSPECTIVA DEL SPRINT

CREATE TABLE IF NOT EXISTS retrospectivas_sprint (
    id_retrospectiva INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto INT NOT NULL,
    id_sprint INT NOT NULL,
    id_usuario INT NOT NULL,

    aciertos TEXT NOT NULL,
    aspectos_mejorar TEXT NOT NULL,
    acciones_acordadas TEXT NOT NULL,

    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_retrospectiva_sprint_usuario
        (id_sprint, id_usuario),

    CONSTRAINT fk_retro_proyecto
        FOREIGN KEY (id_proyecto)
        REFERENCES proyectos(id_proyecto)
        ON DELETE CASCADE,

    CONSTRAINT fk_retro_sprint
        FOREIGN KEY (id_sprint)
        REFERENCES sprints(id_sprint)
        ON DELETE CASCADE,

    CONSTRAINT fk_retro_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
);
SELECT *
FROM retrospectivas_sprint;


#---PB-46: horas estimadas por historia (Planning Poker, Scrum Master)---
-- NULL = todavia sin estimar.
ALTER TABLE product_backlog
    ADD COLUMN horas_estimadas DECIMAL(6,2) NULL AFTER puntos;

#sprint 5 PB-42: apartado Reuniones

CREATE TABLE IF NOT EXISTS reuniones (
    id_reunion INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto INT NOT NULL,
    id_autor INT NULL,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    fecha_reunion DATETIME NOT NULL,
    modalidad ENUM('Presencial', 'En linea') NOT NULL,
    lugar_enlace VARCHAR(500) NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reuniones_proyecto_fecha (id_proyecto, fecha_reunion, id_reunion),
    CONSTRAINT fk_reuniones_proyecto
        FOREIGN KEY (id_proyecto) REFERENCES proyectos(id_proyecto)
        ON DELETE CASCADE,
    CONSTRAINT fk_reuniones_autor
        FOREIGN KEY (id_autor) REFERENCES usuarios(id_usuario)
        ON DELETE SET NULL
);
-- Francisco: Sprint 5, PB-45 - Contenido de Planning Poker.
SET @pb45_existe_horas = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'product_backlog'
      AND COLUMN_NAME = 'horas_estimadas'
);

SET @pb45_sql_horas = IF(
    @pb45_existe_horas = 0,
    'ALTER TABLE product_backlog ADD COLUMN horas_estimadas DECIMAL(7,2) NULL DEFAULT NULL AFTER puntos',
    'SELECT ''horas_estimadas ya existe; se conserva sin cambios.'' AS mensaje'
);

PREPARE pb45_sentencia_horas FROM @pb45_sql_horas;
EXECUTE pb45_sentencia_horas;
DEALLOCATE PREPARE pb45_sentencia_horas;

SHOW COLUMNS FROM product_backlog LIKE 'horas_estimadas';