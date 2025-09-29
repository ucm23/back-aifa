import { pool } from "../connect.js";
import moment from "moment";

function contieneNLU(cadena) {
    return /NLU/i.test(cadena);
}

function extractFlightData(route, lane_direction = null) {
    const partes = route.trim().split(/\s+/);

    const _name = partes[0] || null;
    const _code = partes[1] || null;

    let _routing = null;
    if (partes.length >= 3) {
        const code = partes[2];
        const origen = code.substring(0, 3);
        const destino = code.substring(3, 6);
        _routing = `${origen}-${destino}`;
    }

    const _flight_number = partes.length > 3 ? parseInt(partes[3]) : null;

    const patronCompleto = /\s\d+Y(\d+)([A-Z]{1,2})\d+/;
    const match = route.match(patronCompleto);
    const _chair = match ? match[1] + match[2] : null;

    let lane = null;
    if (lane_direction) {
        const [carril, sentido] = lane_direction.split('_', 1).concat([null]);
        lane = { carril, sentido };
    }

    const fecha = null;
    const parte5 = partes[4];
    const matchDate = parte5.match(/^(\d+)Y/);
    fecha = juliana(parseInt(matchDate[1], 10));

    return {
        _name,
        _code,
        _routing,
        _flight_number,
        _chair,
        lane,
        date: fecha
    };
}

function juliana(date) {
  const fecha = new Date(new Date().getFullYear(), 0);
  fecha.setDate(fecha.getDate() + (date - 1));
  return fecha.toISOString().split("T")[0];
}


function matchesPattern(cadena) {
    const normalizedStr = cadena.replace(/&lt;/g, '<');
    const pattern = /^M1[A-Z]+\/[A-Z]+\s+[A-Z0-9]+\s+[A-Z0-9]+\s+\d+\s+\d+Y\d+[A-Z]\d+\s+\d+[<>]\d+[A-Z0-9]*\d+[A-Z0-9]+\s+[A-Z0-9]*\s*\d+\s*.*$/;

    if (pattern.test(normalizedStr)) return { string: normalizedStr, pattern: true };

    const nombreMatch = normalizedStr.match(/^(M1[A-Z]+\/[A-Z]+)/);
    if (!nombreMatch || nombreMatch[1].length <= 25) return false;

    const nombreCompleto = nombreMatch[1];
    const restoCadena = normalizedStr.substring(nombreCompleto.length);
    const ultimos6 = nombreCompleto.slice(-6);
    const nombreRecortado = nombreCompleto.slice(0, -6);

    const nuevaCadena = nombreRecortado + " " + ultimos6 + restoCadena;

    return { string: nuevaCadena, pattern: pattern.test(nuevaCadena) };

}

/**
 * API: valideFligth - Validación de Códigos QR de Vuelo
 * 
 * Método: POST
 * Ruta: /api/valide-flight
 * 
 * @param {Object} req - Objeto de petición 
 *                    {
 *                      string_code_qr: string,
 *                      _place_id: int,
 *                      lane_direction: string,
 *                      plate: string
 *                    }
 * @param {string} string_code_qr - Código QR escaneado del pase de abordar (Requerido)
 * @param {string} _place_id - Identificador único de la plaza (Requerido)
 * @param {string} lane_direction - Número o nombre del carril y salida (entrada/salida = 123abc_123abc) (Requerido)
 * @param {string} plate - Placa del vehículo (Opcional, default: '')
 * 
 * 
 * @returns {Object} Respuesta JSON
 * @param {Object} res - { value: int, message: string }
 *                     value = null / undefinied -> QR no valido
 *                      value = 0 -> QR no valido
 *                      value = 1 -> QR valido
 *                      value = 2 -> QR valido, pero repetido
 *                      value = 3 -> QR no valido (no es del AIFA)
 * 
 */


export const valideFligth = async (req, res) => {
    try {
        const {
            string_code_qr,
            _place_id,
            lane_direction,
            plate = ''
        } = req.body;

        console.log("🚀 ~ valideFligth ~ req.body:", req.body)

        if (!string_code_qr || !lane_direction || !_place_id) {
            return res.status(400).json({ message: `BODY: ${JSON.stringify(req.body)}`, error: "Faltan parámetros" });
        }

        let pattern = '';

        if (!contieneNLU(string_code_qr)) {
            return res.status(200).json({ value: 3 });
        }

        const data = matchesPattern(string_code_qr);
        console.log("🚀 ~ valideFligth ~ data:", data)
        if (data.pattern) pattern = data?.string;
        else return res.status(400).json({ message: `No se puede formatear con contenido` });

        const { _name, _code, _routing, _flight_number, _chair, lane } = extractFlightData(pattern, lane_direction);
        const _hora = moment().format("YYYY-MM-DD HH:mm:ss");
        const { carril = '', sentido = '' } = lane || {};


        try {
            const folioTemp = `${_flight_number}_${_routing}_${_chair}_${_code}_${_place_id}`;
            let query = `SELECT * FROM public."registerByVuelo" WHERE folio = '${folioTemp}';`;
            const getFolios = await pool.query(query) || [];

            if (getFolios.rows[0]?.id) {
                // Codigo ya usado en la misma plaza
                return res.status(200).json({ value: 2, message: "Código ya leído" });
            }

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
                    (people, chair, code, routing, folio, place, flight, line, direction, plate) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
                `;
                const values = [
                    _name,
                    _chair,
                    _code,
                    _routing,
                    folioTemp,
                    _place_id,
                    _flight_number,
                    carril,
                    sentido,
                    plate
                ];
                const insertResult = await pool.query(insertQuery, values);
                console.log("Registro insertado:", insertResult.rows[0]);
                // Codigo registrado correctamente
                return res.json({ value: 1, flight, registerByVuelo: insertResult.rows[0] });
            } else {
                // No valido
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