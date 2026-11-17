-- PB-30 / HU-17: ejecutar este archivo una vez en la base existente.
-- Se puede volver a ejecutar. No modifica los avisos ni borra datos.
USE scrument;

CREATE TABLE IF NOT EXISTS mensajes_foro (
    id_mensaje INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto INT NOT NULL,
    id_autor INT NULL,
    contenido TEXT NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_foro_proyecto_mensaje (id_proyecto, id_mensaje),
    CONSTRAINT fk_foro_proyecto
        FOREIGN KEY (id_proyecto) REFERENCES proyectos(id_proyecto)
        ON DELETE CASCADE,
    CONSTRAINT fk_foro_autor
        FOREIGN KEY (id_autor) REFERENCES usuarios(id_usuario)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
