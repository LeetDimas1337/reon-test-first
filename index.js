/**
 * Основной модуль приложения - точка входа.
 */

const express = require("express");
const api = require("./api");
const logger = require("./logger");
const config = require("./config");
const {getFieldValue} = require("./utils");

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));

const calculateAge = (birthUnix) => {
    const birthDate = new Date(birthUnix * 1000)
    const currentDate = new Date()
    const age = currentDate.getFullYear() - birthDate.getFullYear()
    return currentDate.getMonth() < birthDate.getMonth() ||
		currentDate.getDate() <= birthDate.getDate() && currentDate.getMonth() === birthDate.getMonth()
        ? age - 1
        : age
}

const BIRTH_ID = 881471
const AGE_ID = 881521

api.getAccessToken().then(() => {
    app.get("/ping", (req, res) => res.send("pong " + Date.now()));

    app.post("/hook", (req, res) => {

        const contact = req.body.contacts?.update || req.body.contacts?.add
        const customFields = contact[0].custom_fields
        if (customFields) {
            const birth = getFieldValue(customFields, BIRTH_ID)
            const previousAge = getFieldValue(customFields, AGE_ID) || {value: -1}
            const newAge = calculateAge(birth) >= 0 ? calculateAge(birth) : 0
            if (Number(previousAge.value) === newAge) {
                res.send("OK")
            } else {
                api.updateContacts([
                    {
                        id: Number(contact[0].id),
                        custom_fields_values: [
                            {
                                field_id: AGE_ID,
                                values: [
                                    {value: newAge}
                                ]
                            }
                        ]
                    }
                ])
                    .then(data => res.status(200).json({message: "all right"}))
                    .catch(err => res.status(400).json({message: err.message}))
            }

        } else {
            res.status(400).json({message: "invalid contact data"});
        }
    });

    app.listen(config.PORT, () => logger.debug("Server started on ", config.PORT));
});
