import app from "./src/app.js";
import { PORT } from "./src/config.js";

/*app.get('/', (req, res) => {
    res.send('api...');
});*/

app.listen(PORT, () => {
    console.log("🚀 ~ app.listen ~ port", PORT)
})


