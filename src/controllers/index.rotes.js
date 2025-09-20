import { pool } from "../connect.js";

export const index = (req, res) => res.json({ message: "welcome to my api" });

export const login = async (req, res) => {
    const { email, password } = req.body;
    console.log("🚀 ~ login ~ req.body:", req.body)

    /*if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }*/

    try {
        const userQuery = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;
        console.log("🚀 ~ login ~ userQuery:", userQuery)
        const userResult = await pool.query(userQuery, []);

        console.log("🚀 ~ login ~ userResult:", userResult)

        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = userResult.rows[0];

        const employeeQuery = `SELECT * FROM employees WHERE id = $1`;
        const employeeResult = await pool.query(employeeQuery, [user.id]);
        const employee = employeeResult.rows[0];
        let response = {
            user: {
                ...user,
                password: undefined
            },
            employee
        };

        res.json(response);

    } catch (error) {
        console.error('Error during authentication:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};



