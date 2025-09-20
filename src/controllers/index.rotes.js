import { pool } from "../connect.js";

export const index = (req, res) => res.json({ message: "welcome to my api" });

export const login = async (req, res) => {
    try {
        const { _dealership, _id } = req.body;
        console.log("🚀 ~ login ~ id:", _id)
        console.log("🚀 ~ login ~ dealership:", _dealership)
        console.log("🚀 ~ valideFligth ~ req.body:", req.body)

        if (!_dealership || !_id) {
            return res.status(400).json({ message: `BODY: ${JSON.stringify(req.body)}`, error: "Faltan parámetros" });
        }

        try {
            let query = `SELECT * FROM public."places" WHERE id = $1 AND dealership = $2;;`;
            const login = await pool.query(query, [_id, _dealership]) || [];

            if (login.rows[0]?.id) {
                return res.status(200).json( login.rows[0] );
            } else {
                return res.json( false );
            }

        } catch (error) {
            console.error("❌ Error al consultar vuelos:", error);
            res.status(500).json({ error: "Error interno del servidor" });
        }
    } catch (error) {
        return res.status(500).json({ message: "Something goes wrong: " + error.message });
    }
};

