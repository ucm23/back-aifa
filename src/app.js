import express from "express";
import morgan from "morgan";
import cors from 'cors';
//import path from "path";

//import bodyParser from 'body-parser';
import indexRoutes from "./routes/index.routes.js";
import aifaRoutes from "./routes/aifa.routes.js";

const app = express();
const api = '/api'

app.use(morgan("dev"));

app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 
//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: true }));
//app.use(express.urlencoded({ extended: true }));
//app.use(express.static(path.join(__dirname, 'public')))

app.use(cors())
app.use(`${api}/auth`, indexRoutes);
app.use(`${api}/routes`, aifaRoutes);

app.use((req, res, next) => {
    res.status(404).json({ message: "Not found" });
});

export default app;
