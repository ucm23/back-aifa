import { pool } from "../connect.js";
import dayjs from "dayjs";
import moment from "moment";

/*export const getEmployees = async (req, res) => {
    try {
        const rows = await pool.query("SELECT * FROM employees");
        res.json(rows?.rows);
    } catch (error) {
        return res.status(500).json({ message: "Something goes wrong" + error });
    }
};*/

export const valideFligth = async (req, res) => {
    try {
        const {
            _asiento,
            _hora,
            _routing,
            _flight_number,
            _place_id,
            _user_code,
            _user_name
        } = req.body;
        console.log("🚀 ~ valideFligth ~ req.body:", req.body)

        if (!_hora || !_asiento || !_routing || !_flight_number || !_place_id || !_user_code || !_user_name) {
            return res.status(400).json({ message: `BODY: ${JSON.stringify(req.body)}`, error: "Faltan parámetros" });
        }

        try {
            const folioTemp = `${_flight_number}_${_routing}_${_asiento}_${_user_code}_${_place_id}`;
            let query = `SELECT * FROM public."registerByVuelo" WHERE folio = '${folioTemp}';`;
            const getFolios = await pool.query(query) || [];

            if (getFolios.rows[0]?.id) return res.status(200).json({ value: 2, message: "Código ya leído" });
            
            const result = await pool.query(
                `SELECT * FROM vuelos WHERE arr_flight_number = '${_flight_number}' OR dep_flight_designator LIKE '%${_flight_number}%';`
            );
            const vuelos = result.rows;
            const hora = moment(_hora, "YYYY-MM-DD HH:mm:ss");

            const flight = vuelos.find(item => {
                console.log(`Procesando vuelo: ${item.arr_flight_number}/${item.dep_flight_designator}`);

                if (_routing.startsWith("NLU-")) {
                    const depSobt = moment(item.dep_sobt);
                    const horaLimiteInferior = depSobt.clone().subtract(4, "hours");
                    return hora.isBetween(horaLimiteInferior, depSobt, null, '[]');
                }

                if (_routing.endsWith("-NLU")) {
                    const arrSibt = moment(item.arr_sibt);
                    const horaLimiteSuperior = arrSibt.clone().add(2, "hours");

                    return hora.isBetween(arrSibt, horaLimiteSuperior, null, '[]');
                }

                return false;
            });

            if (flight) {
                const insertQuery = `INSERT INTO public."registerByVuelo" 
                    (people, chair, code, routing, folio, place, flight) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
                `;
                const values = [
                    _user_name,
                    _asiento,
                    _user_code,
                    _routing,
                    folioTemp,
                    _place_id,
                    _flight_number
                ];

                const insertResult = await pool.query(insertQuery, values);
                console.log("Registro insertado:", insertResult.rows[0]);

                return res.json({ value: 1, flight, registerByVuelo: insertResult.rows[0] });
            } else {
                return res.json({ value: 0 });
            }

        } catch (error) {
            console.error("❌ Error al consultar vuelos:", error);
            res.status(500).json({ error: "Error interno del servidor" });
        }
    } catch (error) {
        return res.status(500).json({ message: "Something goes wrong: " + error.message });
    }
};