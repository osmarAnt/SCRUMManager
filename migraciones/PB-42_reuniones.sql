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
