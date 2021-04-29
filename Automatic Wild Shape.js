// keep turn order for shape changed creature

// Automatic Wild Shape
on("ready", function () {
    log("Automatic Wild Shape API Ready!");

    /* -------------------------------------------------------------------------- */
    /*                                   Options                                  */
    /* -------------------------------------------------------------------------- */
    // Settings
    const AWS_notifyGM = true;
    const AWS_hpbar = 3;

    // Debug
    const AWS_debug = true;

    /* -------------------------------- Constants ------------------------------- */
    const AWS_name = "AWS";
    const AWS_state_name = "AUTOMATICWILDSHAPE";
    const AWS_error = AWS_name + " ERROR";
    const AWS_log = AWS_name + " - ";

    /* --------------------------------- Classes -------------------------------- */

    /** A class that represents any druid, and contains functions to get the max CR of the druid's wild shapes.
     * @param {string} id
     * @param {string} override
     * @param {string} class
     * @param {string} classAttr
     * @param {number} level
     * @param {string} levelAttr
     * @param {string} subclass
     * @param {string} subclassAttr
     */
    class Druid {
        /**
         * @param {Character|Druid} char
         */
        constructor(char) {
            // Accept a Druid instance in place of `char`.
            if (char instanceof Druid) return Object.assign(this, char);
            // Apply all the properties to `this` while maintaining property names.
            Object.assign(this, this.getDetails(char));
            Object.assign(this, this.getCr(level));
        }

        /** Takes a player Character object and returns all the parts needed for wild shape calculations.
         * @param {Character} char
         * @returns {{id:string, override:string, class:string, classAttr:string, level:number, levelAttr:string, subclass:string, subclassAttr:string}}
         */
        getDetails(char) {
            let classIndex = -1;
            let classAttrVal = getAttrByName(char.id, "class");
            if (classAttrVal.toLowerCase() === "druid") classIndex = 0;
            // TODO optional chaining should be here
            else {
                for (let i = 1; i <= 4; i++) {
                    if (getAttrByName(char.id, `multiclass${i}_flag`) !== 1)
                        continue;
                    if (
                        getAttrByName(
                            char.id,
                            `multiclass${i}`
                        ).toLowerCase() === "druid" // TODO optional chaining should be here
                    ) {
                        classIndex = i;
                        break;
                    }
                }
            }
            if (classIndex === -1)
                return toChat("No druid class found on sheet.", { code: 32 }); // TODO accept NPCs if GM
            let classAttr;
            let levelAttr;
            let subclassAttr;
            switch (classIndex) {
                case 0:
                    classAttr = "class";
                    levelAttr = "base_level";
                    subclassAttr = "subclass";
                    break;

                case 1:
                case 2:
                case 3:
                case 4:
                    classAttr = `multiclass${classIndex}`;
                    levelAttr = `multiclass${classIndex}_lvl`;
                    subclassAttr = `multiclass${classIndex}_subclass`;
                    break;
            }
            return {
                id: char.id,
                override: getAttrByName(char.id, "aws_override"),
                classAttr,
                class: getAttrByName(char.id, classAttr),
                levelAttr,
                level: +getAttrByName(char.id, levelAttr), // NOTE may cause errors
                subclassAttr,
                subclass: getAttrByName(char.id, subclassAttr),
            };
        }

        /** Returns max wildshape CR accounting for the override. */
        getCr(level = this.level) {
            if (this.override) return { maxCr: "99", filter: 99 };
            return this.calcCr(level);
        }

        /** Calculates max wildshape CR based on supplied level or `this.level`.
         * @returns {{maxCr:string, filter:number}}
         */
        calcCr(level = this.level) {
            return {
                maxCr: this.druidLevelToCr(level),
                filter: fractionToNumber(maxCr),
            };
        }

        /** Takes a druid's level and returns the CR limit of beasts that druid can turn into.
         *
         * Does not apply to moon druids of >= 6th level.
         * @param {number} level
         * @returns {string}
         */
        druidLevelToCr(level) {
            if (level >= 8) return "1";
            if (level >= 4) return "1/2";
            return "1/4";
        }
    }

    class MoonDruid extends Druid {
        /**
         * @param {Druid} druid
         */
        constructor(druid) {
            super(druid);
        }

        /** Calculates max wildshape CR based on supplied level or `this.level` for Moon Druids.
         * @returns {{maxCr:string, filter:number}}
         */
        calcCr(level = this.level) {
            // moon druids are treated like normal druids until 6th level
            if (druid.level < 6) return super.getCr(level);
            return {
                filter: Math.floor(Math.max(level / 3, 1)),
                maxCr: filter.toString(),
            };
        }
    }

    class Beast {
        /**
         * @param {Character} char
         */
        constructor(char) {
            const cr = getAttrByName(char.id, "npc_challenge");
            this.cr = cr;
            this.filter = fractionToNumber(cr);
            this.id = char.id;
            this.name = char.get("name");
            this.sheet = char;
        }
    }

    /* ---------------------------------- Code ---------------------------------- */
    /*  Check each of the AWS public macros, and if they don't exist find the
    first GM and create the macro as that GM. */
    const checkMacros = (function () {
        const onlinePlayers = findObjs({ _type: "player", _online: true });
        const onlineGms = onlinePlayers.filter((p) => playerIsGM(p.id));
        const existantMacros = findObjs({ _type: "macro" });
        const gmMacros = [
            {
                name: "AutoWildShape",
                action: "!aws",
            },
            {
                name: "AWSlist",
                action: "!aws list",
            },
            {
                name: "AWSadd",
                visibleto: "all",
                action: "!aws list add",
            },
            {
                name: "AWSremove",
                action: "!aws list remove",
            },
            {
                name: "AWSpopulate",
                action: "!aws populate",
            },
        ];
        gmMacros.forEach((m) => {
            const thisMacro = existantMacros.find(
                (e) => e.get("action") === m.action
            );
            if (thisMacro) return;
            const duplicateMacro = existantMacros.find(
                (e) => e.get("name") === m.name
            );
            if (duplicateMacro) duplicateMacro.remove();
            onlineGms.some((p) => {
                if (!playerIsGM(p.id)) return;
                createObj("macro", {
                    action: m.action,
                    name: m.name,
                    playerid: p.id,
                    visibleto: m.visibleto || "",
                });
                toChat(`/w gm Created **${m.name}** macro.`, {
                    player: p.name,
                });
                return true; // stop finding GMs once the macro has been created.
            });
        });
    })();

    /* User message interpretation */
    on("chat:message", function (msg) {
        const parts = msg.content.toLowerCase().split(" ");
        if (msg.type !== "api" || parts[0] !== "!aws") return;
        if (AWS_notifyGM && !playerIsGM(msg.playerid))
            toChat(`-AWS in use by ${msg.who}-`, { player: "gm" });
        if (parts.length === 1) return transformOptions();
        if (parts[1] === "list") return listOptions();
        if (parts[1] === "populate") return populateOptions();
        return transformOptions();

        /** Options for transforming the selected token. */
        function transformOptions() {
            if (AWS_debug) return toChat("transformOptions() reached");
            if (
                msg.selected.length !== 1 ||
                msg.selected[0]._type !== "graphic" // TODO add optional chaining
            )
                return toChat("A token must be selected.", {
                    code: 11,
                    player: msg.who,
                });
            if (
                !playerIsGM(msg.playerid) &&
                !new RegExp("all|" + msg.who, "i").test()
            )
                return toChat("You must control the selected token.", {
                    code: 12,
                    player: msg.who,
                });
            /*
            !aws => return list of transform options
            !aws end => end transformation
            !aws <beast_name> => transform into beast
            */
            if (parts.length === 1) return giveShapeList(msg);
            if (parts[1] === "end") return endTransform(msg);
            return transform(msg);
        }

        /** !aws list => Show the complete wild shapes list to this user.
         *
         * !aws list add => Add the currently selected token(s) to the wild shapes list.
         *
         * !aws list remove => Remove the sheets listed by their ID(s).
         */
        function listOptions() {
            if (parts.length === 2)
                return listToChat(msg, { cr: true, remove: true });

            if (parts[2] === "add") {
                if (!playerIsGM(msg.playerid))
                    return toChat(
                        "You must be a GM to alter the wild shapes list.",
                        { code: 16, player: msg.who }
                    );
                if (msg.selected.length === 0) {
                    return toChat("At least one token must be selected.", {
                        code: 19,
                        player: msg.who,
                    });
                }
                return listAdd(msg);
            }

            if (parts[2] === "remove") {
                if (!playerIsGM(msg.playerid))
                    return toChat(
                        "You must be a GM to alter the wild shapes list.",
                        { code: 17, player: msg.who }
                    );
                return listRemove(msg);
            }

            return toChat(
                'Command not understood, commands starting with "!aws list" must be followed by nothing, "add", or "remove".',
                { code: 12, player: msg.who }
            );
        }

        /** !aws populate => Search all character sheets and add any sheet with type "beast" to the wild shapes list. */
        function populateOptions() {
            if (parts.length > 2)
                return toChat(
                    'Command not understood, the "!aws populate" command should not be followed by any other text.',
                    { code: 13, player: msg.who }
                );
            if (!playerIsGM(msg.playerid))
                return toChat(
                    "You must be a GM to populate the wild shapes list.",
                    { code: 18, player: msg.who }
                );
            return populateList(msg);
        }
    });

    /** Returns a list that is filtered appropriately for the selected druid PC.
     * @param {ChatEventData} msg
     */
    function giveShapeList(msg) {
        // TODO error messages
        // TODO deal with `aws_override`
        // TODO convert straight into moon druid when appropriate
        const char = charFromMessage(msg);
        if (!char) return toChat("No char sheet", { code: 31 }); //TODO accept if GM
        let druid = new Druid(char);
        if (!druid) return toChat("No attrs from char.", { code: 32 });
        if (druid.level < 2) return toChat("Lvl too low.", { code: 33 });
        if (druid.subclass.toLowerCase().trim() === "moon")
            // TODO add optional chaining
            druid = MoonDruid(druid);
        const beasts = filterBeasts(druid.filter);
        return listToChat(beasts);
    }

    /** Returns a filtered array of beasts based on the supplied CR.
     * @param {number} filter
     * @returns {Beast[]}
     */
    function filterBeasts(filter) {
        return getAllShapes.filter((a) => a.filter <= filter);
    }

    /** Returns a list of all wild shapes with some details.
     * @returns {Beast[]}
     */
    function getAllShapes() {
        const attrs = findObjs({
            _type: "attribute",
            name: "ws",
        });
        if (attrs.length === 0) return [];
        return attrs
            .map((a) => getObj("character", a.get("_characterid")))
            .filter((a) => a !== undefined)
            .map((a) => new Beast(a));
    }

    /** Adds the selected token(s) to the list of wildshapes.
     * @param {ChatEventData} msg
     */
    function listAdd(msg) {
        // TODO error handling
        const tokens = tokensFromMessage(msg);
        tokens.forEach((t) => {
            const beastId = t.get("represents");
            createObj("attribute", {
                _characterid: beastId,
                name: "ws",
                current: "1",
            });
            toChat(
                `Added the character representing "${t.get(
                    "name"
                )}" to the wildshape list.`,
                { player: msg.who }
            );
        });
    }

    /** Removes the seleted token(s) or named beasts from the beast list. */
    function listRemove(msg) {
        // TODO error handling
        if (msg.content.split(" ").length > 3) return listRemoveNamed(msg);
        listRemoveSelected(msg);
    }

    /** Removes the named beast from the beast list.
     * @param {ChatEventData} msg
     */
    function listRemoveNamed(msg) {
        const name = msg.content.replace("!aws list remove ", "");
        const chars = findObjs({
            _type: "character",
            name: name,
        });
        if (chars.length === 0)
            return toChat(`No beast found with name "${name}".`);
        if (chars.length > 1)
            return toChat(
                `Couldn't find beast: More than one character exists with the name "${name}".`,
                { code: 42, player: msg.who }
            );
        const char = chars[0];
        const attrs = findObjs({
            _type: "attribute",
            _characterid: char.id,
            name: "ws",
        });
        if (attrs.length === 0)
            return toChat(`Character "${name}" has no wildshape attribute.`, {
                code: 43,
                player: msg.who,
            });
        attrs.forEach((a) => a.remove());
        toChat(`Removed "${name}" from wildshape list.`, { player: msg.who });
    }

    /** Removes the selected token(s) from the beast list.
     * @param {ChatEventData} msg
     */
    function listRemoveSelected(msg) {
        // TODO error handling
        const tokens = tokensFromMessage(msg);
        const removed = [];
        const missingWs = [];
        const charIds = tokens ? tokens.map((t) => t.get("represents")) : [];
        if (charIds.length === 0)
            return toChat(
                "No tokens were selected and no beast name was provided.",
                { code: 41, player: msg.who }
            );
        const attrs = findObjs({
            _type: "attribute",
            name: "ws",
        });
        charIds.forEach((id, i) => {
            const attr = attrs.find((a) => id === a.get("_characterid"));
            if (!attr) return (missingWs[i] = tokens[i]);
            attr.remove();
            removed[i] = tokens[i];
        });
        const out1 = removed.reduce(
            (a, b) => a + `<br>${b.get("name")}`,
            `Removed these tokens from the list:`
        );
        const out2 = missingWs.reduce(
            (a, b) => a + `<br>${b.get("name")}`,
            `Couldn't remove these tokens from the list:`
        );
        if (removed !== 0) toChat(out1, { player: msg.who });
        if (missingWs.length !== 0) toChat(out2, { code: 69, player: msg.who });
    }

    /** Make a table out of the supplied attribute's sheets ready to post to chat.
     * @param {ChatEventData} msg
     * @param {{beasts:Beast[], cr?:boolean, remove?:boolean, transform?:boolean}} options If `beasts` is not supplied, a list of all beasts is used.
     *
     * If `cr = true` then beast CR will be shown and beasts will be sorted by CR.
     *
     * If `remove = true` then a button will be provided beside each beast that, when clicked by a GM, will remove the beast from the wild shapes list.
     *
     * If `transform = true` then a button will be provided beside each beast that will transform the selected token into that beast when clicked by a player controlling the token.
     */
    function listToChat(
        msg,
        {
            beasts = getAllShapes(),
            cr = false,
            remove = false,
            transform = false,
        } = {}
    ) {
        const tableName = cr ? "Wild Shapes by CR" : "Wild Shapes by Name";
        if (beasts.length === 0)
            return toChat("No beasts in the wildshape list.", {
                player: msg.who,
            });
        beasts.sort((a, b) => a.name - b.name);
        if (cr) beasts.sort((a, b) => a.filter - b.filter);
        const output = beasts.reduce(
            (a, b) =>
                a +
                `{{${cr ? `CR ${b.cr} ` : ""}${b.name}=${
                    transform ? `[✓](!<br>aws ${b.name})` : ""
                }${remove ? `[✗](!<br>aws list remove ${b.name})` : ""}}}`,
            `&{template:default}{{name=${tableName}}}`
        );
        return toChat(output, { player: msg.who });
    }

    /** Populates the wild shape list with Beast type NPCs by adding a
     * "ws" attribute to their character sheets.
     */
    function populateList(msg) {
        const beasts = findAllBeasts({ includeExisting: false });
        if (beasts.length < 1)
            return toChat("No new beasts detected.", { player: msg.who });
        let addedBeasts = [];
        beasts.forEach((b) => {
            createObj("attribute", {
                _characterid: b.id,
                name: "ws",
                current: "1",
            });
            addedBeasts.push({
                name: b.get("name"),
                cr: getAttrByName(b.id, "npc_challenge"),
            });
        });
        const output = addedBeasts.reduce(
            (a, b) => a + `{{${b.name}=${b.cr}}}`,
            `&{template:default}{{name=New Beasts}}{{**Name**=**CR**}}`
        );
        return toChat(output, { player: msg.who });
    }

    /** Returns an array of all beasts found using their "npc_type" attribute.
     *
     * Optionally filters away any sheets that have the "ws" attribute.
     * @param {{includeExisting:boolean}}
     * @returns {Character[]}
     */
    function findAllBeasts({ includeExisting = true }) {
        return findObjs({ _type: "character" }).filter(
            (c) =>
                getAttrByName(c.id, "npc_type").search(/beast/i) !== -1 &&
                (includeExisting || !getAttrByName(c.id, "ws"))
        );
    }

    /**
     * @param {ChatEventData} msg
     * @returns {Graphic}
     */
    function tokenFromMessage(msg) {
        return getObj("graphic", msg.selected[0]._id);
    }

    /**
     * @param {ChatEventData} msg
     * @returns {Graphic[]}
     */
    function tokensFromMessage(msg) {
        const tokens = msg.selected;
        return tokens && tokens.map((t) => getObj("graphic", t._id));
    }

    /**
     * @param {ChatEventData} msg
     * @returns {Character}
     */
    function charFromMessage(msg) {
        const token = tokenFromMessage(msg);
        return getObj("character", token._characterid); // TODO add optional chaining
    }

    /** Takes a string fraction and returns it as a resolved number.
     * @param {string} str
     */
    function fractionToNumber(str) {
        return str.split("/").reduce((a, b) => +a / +b, 0);
    }

    /** Output the supplied message to chat, optionally as a whisper and/or as an error which will also log to the console.
     * @param {string} msg
     * @param {{code:number, player:string, logMsg:string}} options
     */
    function toChat(
        msg,
        { code = undefined, player = undefined, logMsg = undefined } = {}
    ) {
        const isError = code !== undefined;
        const playerName = player && player.concat(" ").split(" ", 1)[0];
        if (msg)
            sendChat(
                isError ? AWS_error : AWS_name,
                `${playerName ? "/w " + playerName + " " : ""}${"<br>" + msg}`
            );
        if (isError)
            log(AWS_log + (logMsg || msg) + " Error code " + code + ".");
    }
});
