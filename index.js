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

const calculateAge = (birthDate) => Math.floor((Date.now() - birthDate * 1000) / (3600 * 1000 * 24 * 365.25))

const BIRTH_ID = 881471
const AGE_ID = 881521

api.getAccessToken().then(() => {
    app.get("/ping", (req, res) => res.send("pong " + Date.now()));

    app.post("/hook", (req, res) => {

        const contact = req.body?.contacts.update || req.body?.contacts.add || null

        if (contact[0].custom_fields) {
            const birth = getFieldValue(contact[0].custom_fields, BIRTH_ID)
            const previousAge = getFieldValue(contact[0].custom_fields, AGE_ID) || {value: -1}
            const newAge = calculateAge(birth) >= 0 ? calculateAge(birth) : 0
            if (+previousAge.value === newAge) {
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
                    .then(data => res.status(200).json({message: "invalid contact data"}))
                    .catch(err => res.status(400).json({message: err.message}))
            }

        } else {
            res.status(400).json({message: "invalid contact data"});
        }
    });

    app.listen(config.PORT, () => logger.debug("Server started on ", config.PORT));
});
