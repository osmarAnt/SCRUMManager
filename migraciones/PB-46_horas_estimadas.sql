-- PB-46: el Scrum Master asigna horas estimadas a cada historia desde Planning Poker.
-- NULL = la historia todavía no tiene estimación (no es lo mismo que 0 horas).
-- Si al ejecutarlo aparece "Duplicate column name 'horas_estimadas'", la columna ya existe y no hay que hacer nada.
ALTER TABLE product_backlog
    ADD COLUMN horas_estimadas DECIMAL(6,2) NULL AFTER puntos;
