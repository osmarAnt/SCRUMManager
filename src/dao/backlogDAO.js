// dao/backlog.dao.js
const pool = require('../base_de_datos/conexion');

const BacklogDAO = {
    crear: async (datos) => {
        const { id_proyecto, titulo, descripcion, puntos, prioridad } = datos;
        
        // Ahora sí incluimos 'puntos' en la consulta SQL
        const query = `INSERT INTO product_backlog (id_proyecto, titulo, descripcion, puntos, prioridad) VALUES (?, ?, ?, ?, ?)`;
        
        // Usamos pool.promise() para que el async/await funcione perfectamente
        const [result] = await pool.promise().query(query, [
            id_proyecto, 
            titulo, 
            descripcion, 
            puntos || null, 
            prioridad || 'Media'
        ]);
        
        return result.insertId;
    },
    
    obtenerPorProyecto: async (id_proyecto) => {
        const query = `SELECT * FROM product_backlog WHERE id_proyecto = ? ORDER BY orden ASC`;
        const [rows] = await pool.promise().query(query, [id_proyecto]);
        return rows;
    },
    
    eliminar: async (id_historia) => {
        // Validación para no eliminar si ya está en un sprint
        const [rows] = await pool.promise().query('SELECT id_sprint FROM product_backlog WHERE id_historia = ?', [id_historia]);
        
        if (rows.length > 0 && rows[0].id_sprint !== null) {
            throw new Error('La historia ya está en un Sprint y no se puede eliminar.');
        }
        
        const [result] = await pool.promise().query('DELETE FROM product_backlog WHERE id_historia = ?', [id_historia]);
        return result.affectedRows;
    }
};

module.exports = BacklogDAO;