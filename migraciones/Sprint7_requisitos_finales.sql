-- =====================================================================
-- Sprint 7: requisitos finales de la evaluación (casos de prueba del profesor)
-- Se puede ejecutar más de una vez: cada cambio revisa primero si ya existe.
-- =====================================================================

-- Ayudante: agrega una columna solo si todavía no existe.
DROP PROCEDURE IF EXISTS scrument_agregar_columna;
DELIMITER $$
CREATE PROCEDURE scrument_agregar_columna(IN tabla VARCHAR(64), IN columna VARCHAR(64), IN definicion TEXT)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tabla AND COLUMN_NAME = columna
    ) THEN
        SET @sql_columna = CONCAT('ALTER TABLE `', tabla, '` ADD COLUMN `', columna, '` ', definicion);
        PREPARE sentencia FROM @sql_columna;
        EXECUTE sentencia;
        DEALLOCATE PREPARE sentencia;
    END IF;
END$$
DELIMITER ;

-- Ayudante: agrega una llave foránea solo si todavía no existe.
DROP PROCEDURE IF EXISTS scrument_agregar_llave;
DELIMITER $$
CREATE PROCEDURE scrument_agregar_llave(IN tabla VARCHAR(64), IN nombre VARCHAR(64), IN definicion TEXT)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tabla AND CONSTRAINT_NAME = nombre
    ) THEN
        SET @sql_llave = CONCAT('ALTER TABLE `', tabla, '` ADD CONSTRAINT `', nombre, '` ', definicion);
        PREPARE sentencia FROM @sql_llave;
        EXECUTE sentencia;
        DEALLOCATE PREPARE sentencia;
    END IF;
END$$
DELIMITER ;

-- ---------------------------------------------------------------------
-- BLOQUE 1 (Nino) · HU-12: nombre del Sprint
-- BLOQUE 5 (Osmar) · HU-13: capacidad del equipo en horas por Sprint
-- ---------------------------------------------------------------------
CALL scrument_agregar_columna('sprints', 'nombre', 'VARCHAR(120) NULL AFTER numero');
CALL scrument_agregar_columna('sprints', 'capacidad_horas', 'DECIMAL(7,2) NULL AFTER duracion_dias');

-- ---------------------------------------------------------------------
-- BLOQUE 2 (César) · HU-07 y HU-08: épicas y épica obligatoria en historias
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS epicas (
    id_epica INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    color CHAR(7) NOT NULL,
    descripcion VARCHAR(500) NULL,
    id_autor INT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_epica_nombre (id_proyecto, nombre),
    CONSTRAINT chk_epica_color CHECK (color REGEXP '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT fk_epicas_proyecto
        FOREIGN KEY (id_proyecto) REFERENCES proyectos(id_proyecto)
        ON DELETE CASCADE,
    CONSTRAINT fk_epicas_autor
        FOREIGN KEY (id_autor) REFERENCES usuarios(id_usuario)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CALL scrument_agregar_columna('product_backlog', 'id_epica', 'INT NULL AFTER id_sprint');
CALL scrument_agregar_llave('product_backlog', 'fk_pb_epica',
    'FOREIGN KEY (id_epica) REFERENCES epicas(id_epica) ON DELETE SET NULL');

-- ---------------------------------------------------------------------
-- BLOQUE 3 (Francisco) · HU-10: Definition of Done por historia y por Sprint
-- (HU-09 usa la columna criterios_aceptacion.completado que ya existe)
-- Cada requisito pertenece a una historia (DoD de la historia) o a un Sprint (DoD del Sprint).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dod_requisitos (
    id_requisito INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto INT NOT NULL,
    id_sprint INT NULL,
    id_historia INT NULL,
    descripcion VARCHAR(255) NOT NULL,
    cumplido BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dod_sprint (id_sprint),
    INDEX idx_dod_historia (id_historia),
    CONSTRAINT chk_dod_destino CHECK (
        (id_sprint IS NOT NULL AND id_historia IS NULL) OR
        (id_sprint IS NULL AND id_historia IS NOT NULL)
    ),
    CONSTRAINT fk_dod_proyecto
        FOREIGN KEY (id_proyecto) REFERENCES proyectos(id_proyecto)
        ON DELETE CASCADE,
    CONSTRAINT fk_dod_sprint
        FOREIGN KEY (id_sprint) REFERENCES sprints(id_sprint)
        ON DELETE CASCADE,
    CONSTRAINT fk_dod_historia
        FOREIGN KEY (id_historia) REFERENCES product_backlog(id_historia)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- BLOQUE 4 (Jesús) · HU-16: impedimentos del Sprint
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS impedimentos (
    id_impedimento INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto INT NOT NULL,
    id_sprint INT NULL,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    impacto ENUM('Bajo', 'Medio', 'Alto') NOT NULL DEFAULT 'Medio',
    estado ENUM('Activo', 'Resuelto') NOT NULL DEFAULT 'Activo',
    solucion TEXT NULL,
    id_autor INT NULL,
    id_resolutor INT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion DATETIME NULL,
    INDEX idx_impedimentos_proyecto (id_proyecto, estado, fecha_registro),
    CONSTRAINT fk_impedimentos_proyecto
        FOREIGN KEY (id_proyecto) REFERENCES proyectos(id_proyecto)
        ON DELETE CASCADE,
    CONSTRAINT fk_impedimentos_sprint
        FOREIGN KEY (id_sprint) REFERENCES sprints(id_sprint)
        ON DELETE SET NULL,
    CONSTRAINT fk_impedimentos_autor
        FOREIGN KEY (id_autor) REFERENCES usuarios(id_usuario)
        ON DELETE SET NULL,
    CONSTRAINT fk_impedimentos_resolutor
        FOREIGN KEY (id_resolutor) REFERENCES usuarios(id_usuario)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- BLOQUE 6 (Emmanuel) · HU-17: tipo de reunión · HU-22: repositorio de GitHub
-- ---------------------------------------------------------------------
CALL scrument_agregar_columna('reuniones', 'tipo',
    "ENUM('Sprint Planning', 'Daily Scrum', 'Sprint Review', 'Sprint Retrospective', 'Otra') NOT NULL DEFAULT 'Otra' AFTER titulo");
CALL scrument_agregar_columna('proyectos', 'repositorio_github', 'VARCHAR(140) NULL');

DROP PROCEDURE IF EXISTS scrument_agregar_columna;
DROP PROCEDURE IF EXISTS scrument_agregar_llave;
