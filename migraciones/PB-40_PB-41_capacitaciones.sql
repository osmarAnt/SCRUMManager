-- Francisco: Sprint 4, PB-40 y PB-41.
-- Ejecutar este archivo en la base existente. Se puede volver a ejecutar.
USE scrument;

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
