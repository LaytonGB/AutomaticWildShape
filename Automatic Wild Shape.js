// TODO warn when ws hp is 0 or below
// TODO auto-revert setting
// TODO integrate Jack of All Trades bonus
// TODO keep turn order for shape changed creature

// Automatic Wild Shape
on("ready", function () {
  "use strict";
  log("Automatic Wild Shape API Ready!");

  /* -------------------------------------------------------------------------- */
  /*                                   Options                                  */
  /* -------------------------------------------------------------------------- */
  const AWS_notifyGM = true; // Notify all GMs whenever the API is used by a player.

  const AWS_hpbar = 3; // The token bar used for hp (can be 1, 2, or 3).

  const AWS_rollHp = false; // Roll for max beast HP.

  /*
  When calculating wild shape skill bonuses the rules are a little vague
  regarding whether the player's proficiency bonus or the beast's proficiency
  bonus should be applied to skills that the player is proficient in.
  Set this to true to use the player's bonus, which will almost always be higher. */
  const AWS_usePlayerProfBonus = false;

  // If a player has expertise in a skill then allow them to make use of it in their wildshapes.
  const AWS_usePlayerExpertise = false; // TODO not yet integrated

  /* ----------------------------- Options Checks ----------------------------- */
  const options = [
    { name: "AWS_notifyGM", type: "boolean", value: AWS_notifyGM },
    { name: "AWS_hpbar", type: "number", value: AWS_hpbar },
    { name: "AWS_rollHp", type: "boolean", value: AWS_rollHp },
    {
      name: "AWS_usePlayerProfBonus",
      type: "boolean",
      value: AWS_usePlayerProfBonus,
    },
    {
      name: "AWS_usePlayerExpertise",
      type: "boolean",
      value: AWS_usePlayerExpertise,
    },
  ];
  options.forEach((o) => {
    if (typeof o.value !== o.type)
      throw new Error(
        `AutomaticWildShape - Option "${o.name}" should be a ${o.type} but has value "${o.value}".`
      );
  });

  /* -------------------------------- Constants ------------------------------- */
  const AWS_name = "AWS";
  const AWS_state_name = "AUTOMATICWILDSHAPE";
  const AWS_error = AWS_name + " ERROR";
  const AWS_log = AWS_name + " - ";

  /* --------------------------------- Classes -------------------------------- */

  /**
   * A class that represents any druid, and contains functions to get the max CR of the druid's wild shapes.
   * @param {string} id
   * @param {string} override
   * @param {string} class
   * @param {string} classAttr
   * @param {number} level
   * @param {string} levelAttr
   * @param {string} subclass
   * @param {string} subclassAttr
   * @param {string} cr
   * @param {number} filter
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
      Object.assign(this, this.getCr());
      const required = ["id", "class", "level"];
      for (const property of required) {
        if (!this[property])
          throw new Error(`Druid property "${property}" was missing.`);
      }
    }

    /**
     * Takes a player Character object and returns all the parts needed for wild shape calculations.
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
          if (getAttrByName(char.id, `multiclass${i}_flag`) !== 1) continue;
          if (
            getAttrByName(char.id, `multiclass${i}`).toLowerCase() === "druid" // TODO optional chaining should be here
          ) {
            classIndex = i;
            break;
          }
        }
      }
      if (classIndex === -1) return; // TODO accept NPCs if GM?
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

    /**
     * Returns max wildshape CR accounting for the override.
     */
    getCr(level = this.level) {
      if (this.override) return { cr: "99", filter: 99 };
      return this.calcCr(level);
    }

    /**
     * Calculates max wildshape CR based on supplied level or `this.level`.
     * @returns {{cr:string, filter:number}}
     */
    calcCr(level = this.level) {
      const cr = this.druidLevelToCr(level);
      const filter = crStringToNumber(cr);
      return {
        cr,
        filter,
      };
    }

    /**
     * Takes a druid's level and returns the CR limit of beasts that druid can turn into.
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

    /**
     * Calculates max wildshape CR based on supplied level or `this.level` for Moon Druids.
     * @returns {{cr:string, filter:number}}
     */
    calcCr(level = this.level) {
      // moon druids are treated like normal druids until 6th level
      if (druid.level < 6) return super.getCr(level);
      return {
        filter: Math.floor(Math.max(level / 3, 1)),
        cr: filter.toString(),
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
      this.filter = crStringToNumber(cr);
      this.id = char.id;
      this.name = char.get("name");
      this.sheet = char;
    }
  }

  /* ------------------------------- ANCHOR Code ------------------------------ */
  /*  Check each of the AWS public macros, and if they don't exist find the
    first GM and create the macro as that GM. */
  (function checkMacros() {
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
      {
        name: "AWSabilities",
        action: "!aws addabilities",
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
        toChat(`Created **${m.name}** macro.`, {
          player: "gm",
        });
        return true; // stop finding GMs once the macro has been created.
      });
    });
  })();

  /* --------------------------------- Globals -------------------------------- */
  let msg; // set below, never mutated after setting

  /* ---------------------------- ANCHOR Listeners ---------------------------- */
  on("chat:message", function (m) {
    msg = m;
    const parts = msg.content.toLowerCase().split(" ");
    if (msg.type !== "api" || parts[0] !== "!aws") return;
    if (AWS_notifyGM && !playerIsGM(msg.playerid))
      toChat(`-AWS in use by ${msg.who}-`, { player: "gm" });
    if (parts.length === 1) return transformOptions();
    if (parts[1] === "list") return listOptions();
    if (parts[1] === "populate") return populateOptions();
    if (parts[1] === "addabilities") return addAbilities();
    if (["transform", "end"].includes(parts[1])) return transformOptions();
    return toChat(`Did not understand message "${msg.content}"`, {
      code: 0,
      player: msg.who,
    });

    /**
     * Options for transforming the selected token.
     *
     * !aws => return list of transform options
     *
     * !aws end => end transformation
     *
     * !aws transform <beastName> => transform into beast
     */
    function transformOptions() {
      try {
        if (
          !msg.selected ||
          msg.selected.length !== 1 ||
          msg.selected[0]._type !== "graphic" // TODO add optional chaining
        )
          return toChat("A token must be selected.", {
            code: 11,
            player: msg.who,
          });
        const char = charFromMessage();
        if (
          !playerIsGM(msg.playerid) &&
          !new RegExp("all|" + msg.who, "i").test(char.get("controlledby"))
        )
          return toChat("You must control the selected token.", {
            code: 12,
            player: msg.who,
          });
        if (parts.length === 1) return giveShapeList();
        if (parts[1] === "end") return endTransform();
        return wildShape();
      } catch (error) {
        return toChat(`AWS transform failed.`, {
          code: 1,
          player: msg.who,
          logMsg: `Failed with error: '${error.message}'`,
        });
      }
    }

    /**
     * !aws list => Show the complete wild shapes list to this user.
     *
     * !aws list add => Add the currently selected token(s) to the wild shapes list.
     *
     * !aws list remove => Remove the sheets listed by their ID(s).
     */
    function listOptions() {
      if (parts.length === 2) return listToChat({ cr: true, remove: true });

      if (parts[2] === "add") {
        if (!playerIsGM(msg.playerid))
          return toChat("You must be a GM to alter the wild shapes list.", {
            code: 16,
            player: msg.who,
          });
        if (!msg.selected || msg.selected.length === 0) {
          return toChat("At least one token must be selected.", {
            code: 19,
            player: msg.who,
          });
        }
        return listAdd();
      }

      if (parts[2] === "remove") {
        if (!playerIsGM(msg.playerid))
          return toChat("You must be a GM to alter the wild shapes list.", {
            code: 17,
            player: msg.who,
          });
        return listRemove();
      }

      return toChat(
        'Command not understood, commands starting with "!aws list" must be followed by nothing, "add", or "remove".',
        { code: 12, player: msg.who }
      );
    }

    /**
     * !aws populate => Search all character sheets and add any sheet with type "beast" to the wild shapes list. */
    function populateOptions() {
      if (parts.length > 2)
        return toChat(
          'Command not understood, the "!aws populate" command should not be followed by any other text.',
          { code: 13, player: msg.who }
        );
      if (!playerIsGM(msg.playerid))
        return toChat("You must be a GM to populate the wild shapes list.", {
          code: 18,
          player: msg.who,
        });
      return populateList();
    }
  });

  on("change:player:_online", (p) => {
    if (playerIsGM(p.id) && p.get("online")) checkMacros();
  });

  /* ---------------------------- ANCHOR Processes ---------------------------- */
  /**
   * Adds an easy to use wildshape button to characters that have druid in any of the class names.
   */
  function addAbilities() {
    const chars = findObjs({
      _type: "character",
    });
    let changeCount = 0;
    chars.forEach((c) => {
      if (
        [
          "class",
          "multiclass1",
          "multiclass2",
          "multiclass3",
          "multiclass4",
        ].some((a) => {
          const val = getAttrByName(c.id, a);
          return val && /druid/i.test(val);
        })
      ) {
        if (
          findObjs({
            _type: "ability",
            _characterid: c.id,
            action: "!aws",
          }).length > 0
        )
          return;
        createObj("ability", {
          _characterid: c.id,
          name: "~WildShape",
          action: "!aws",
          istokenaction: true,
        });
        changeCount++;
      }
    });
    toChat(`Added wildshape ability to ${changeCount} characters.`);
  }

  /**
   * Returns a list that is filtered appropriately for the selected druid PC.
   */
  function giveShapeList() {
    try {
      const druid = getDruidFromMessage();
      if (!druid.filter) throw new Error("Druid max CR was not present.");
      const beasts = filterBeasts(druid.filter);
      if (beasts.length < 1)
        return toChat(
          `There are no beasts in the wildshape list of CR ${druid.cr} or lower, which is your wildshape CR limit.`,
          { player: msg.who }
        );
      return listToChat({ beasts, cr: true, transform: true });
    } catch (err) {
      toChat(`Failed to output beast list: "${err.message}".`);
    }
  }

  /**
   * Returns a druid or moondruid instance.
   * @returns {Druid|MoonDruid}
   */
  function getDruidFromMessage() {
    // TODO deal with `aws_override`
    // TODO convert straight into moon druid when appropriate
    const char = charFromMessage();
    if (!char)
      return toChat("The selected token does not represent a character.", {
        code: 31,
      }); //TODO accept if GM
    try {
      var druid = new Druid(char);
    } catch (error) {
      return toChat(error.message, { code: 32 });
    }
    if (druid.level < 2)
      return toChat("Druids cannot use wildshape until they are 2nd level.", {
        code: 33,
      });
    if (druid.subclass.trim().toLowerCase() !== "moon")
      // TODO add optional chaining
      return druid;
    return MoonDruid(druid);
  }

  /**
   * Uses the selected token and its character data with the provided beast id to wildshape the selected character into the beast.
   *
   * The user's input message should be in format `!aws transform <beast_id>`.
   */
  function wildShape() {
    try {
      const { beast, token, druid } = getTransformDetails();
      if (!(beast && token && druid))
        return toChat("Couldn't get the data required for transformation.", {
          code: 52,
          player: msg.who,
        });
      if (!(druid instanceof Druid))
        return toChat("You must be a druid to use wild shape.", {
          code: 50,
          player: msg.who,
        });
      if (druid.getCr().filter < Beast.filter)
        return toChat(
          "Your druid level is not high enough to transform into this creature.",
          { code: 54, player: msg.who }
        );
      const sheet = initializeSheet(beast.sheet, druid, token);
      if (!sheet)
        return toChat(
          "Could not initialize a new character sheet for transformation.",
          { code: 53, player: msg.who }
        );
      const profSkills = getSkillDetails(druid);
      applyPlayerProfs(druid, sheet, profSkills);
      setHp(sheet);
      addExtraAttributes(druid, sheet);
      const beastSize = getNpcSize(beast.sheet);
      transformToken(beast.sheet, sheet, {
        alterSize: beastSize,
        backupSheet: getObj("character", druid.id),
      });
    } catch (err) {
      toChat(`Failed to wildshape! ${err.message}`);
    }
  }

  /**
   * Returns the details required to transform using wild shape.
   * @returns {{beast:Beast, token:Graphic, druid:Druid}}
   */
  function getTransformDetails() {
    const beastId = msg.content.replace("!aws transform ", "");
    const beastChar = getObj("character", beastId);
    if (!beastChar) throw new Error(`No beast found with ID "${beastId}".`);
    let beast;
    try {
      beast = new Beast(beastChar);
    } catch (err) {
      throw new Error(
        `Couldn't make a Beast object from beast with id "${beastId}".`
      );
    }
    const token = tokenFromMessage();
    const druid = getDruidFromMessage();
    return { beast, token, druid };
  }

  /**
   * Returns a sheet initialized with the supplied beast and character's data
   * as per the wildshape rules.
   * @param {Character} beast
   * @param {Druid} druid
   * @param {Graphic} token
   * @returns {Character}
   */
  function initializeSheet(beast, druid, token) {
    const char = getObj("character", druid.id);
    const sheet = createObj("character", {
      avatar: beast.get("avatar"),
      controlledby: char.get("controlledby"),
      name: `${beast.get("name")} ${token.get("name")}`,
    });
    const attrs = findObjs({
      _type: "attribute",
      _characterid: beast.id,
    });
    attrs.forEach((a) => {
      const name = a.get("name");
      if (name === "ws") return;
      let current = a.get("current");
      if (new RegExp(/intelligence|wisdom|charisma/i).test(name))
        current = getAttrByName(char.id, name) || current;
      createObj("attribute", {
        _characterid: sheet.id,
        name,
        current,
      });
    });
    createObj("ability", {
      _characterid: sheet.id,
      name: "~EndWildShape",
      action: "!aws end",
      istokenaction: true,
    });
    return sheet;
  }

  /**
   * Returns an object containing all skills that the provided druid is proficient in.
   * @param {Druid|MoonDruid} char
   * @returns {{strength:string[],dexterity:string[],constitution:string[],intelligence:string[],wisdom:string[],charisma:string[]}}
   */
  function getSkillDetails(char) {
    const skills = {
      strength: ["strength_save", "athletics"],
      dexterity: ["dexterity_save", "acrobatics", "sleight_of_hand", "stealth"],
      constitution: ["constitution_save"],
      intelligence: [
        "intelligence_save",
        "arcana",
        "history",
        "investigation",
        "nature",
        "religion",
      ],
      wisdom: [
        "wisdom_save",
        "animal_handling",
        "insight",
        "medicine",
        "perception",
        "survival",
      ],
      charisma: [
        "charisma_save",
        "deception",
        "intimidation",
        "performance",
        "persuasion",
      ],
    };

    const profSkills = {
      strength: [],
      dexterity: [],
      constitution: [],
      intelligence: [],
      wisdom: [],
      charisma: [],
    };
    for (const k in skills) {
      for (const s of skills[k]) {
        const prof = getAttrByName(char.id, s + "_prof");
        if (prof && prof !== "0") profSkills[k].push(s);
      }
    }
    return profSkills;
  }

  /**
   * Calculates the appropriate skill bonuses based on the character and beast
   * proficiencies and applies them to the sheet.
   * @param {Druid|MoonDruid} druid
   * @param {Character} sheet
   * @param {{strength:string[],dexterity:string[],constitution:string[],intelligence:string[],wisdom:string[],charisma:string[]}} profSkills
   */
  function applyPlayerProfs(druid, sheet, profSkills) {
    const profBonus = AWS_usePlayerProfBonus
      ? +druid.get("pb")
      : +getNpcProfBonus(sheet); // TODO find a better way to do this
    if (!profBonus) {
      sheet.remove();
      if (AWS_usePlayerProfBonus)
        return toChat(
          `Character does not have a proficiency bonus, transformation cancelled.`,
          {
            code: 55,
            player: msg.who,
          }
        );
      return toChat(
        `Could not calculate Beast "${npc.get(
          "name"
        )}" proficiency bonus, transformation cancelled.`,
        {
          code: 54,
          player: msg.who,
        }
      );
    }
    // stop if no proficiencies
    if (!Object.values(profSkills).some((attr) => attr.length > 0)) return;
    setAttrByName(sheet.id, "npc_skills_flag", "2");
    setAttrByName(sheet.id, "npc_saving_flag", "2");
    for (const attr in profSkills) {
      const modName = attr + "_mod";
      const beastMod = +getAttrByName(sheet.id, modName); // TODO find a better way to do this
      for (let s of profSkills[attr]) {
        // acrobatics => npc_acrobatics
        let skillName = "npc_" + s;
        // npc_dexterity_save => npc_dex_save
        if (skillName.includes("_save"))
          skillName =
            skillName.substr(0, 7) +
            skillName.substr(skillName.indexOf("_save"));
        // undefined or "0" for false, "1" or "2" for true
        const skillFlag = getAttrByName(sheet.id, skillName + "_flag");
        const skillBonus = getAttrByName(sheet.id, skillName);
        if (
          skillFlag === undefined ||
          skillFlag == 0 ||
          skillBonus === undefined
        ) {
          setAttrByName(sheet.id, skillName + "_flag", "2");
          setAttrByName(sheet.id, skillName, beastMod + profBonus);
          continue;
        }
        const newBonus = beastMod + profBonus;
        if (skillBonus < newBonus)
          setAttrByName(sheet.id, skillName, newBonus.toString());
      }
    }
  }

  /**
   * Sets the `current` and `max` values of the sheet's HP as per the configuration, either with averages or randomly.
   * @param {Character} sheet
   */
  function setHp(sheet) {
    const hp = getAttrObject(sheet.id, "hp");
    const form = getAttrByName(sheet.id, "npc_hpformula");
    if (!AWS_rollHp) {
      try {
        if (!setAvgHp()) calcAvgHp();
        return;
      } catch (err) {
        toChat(
          `Failed to set HP using averages, attempting to roll HP instead.`,
          { code: 110 }
        );
      }
    }
    try {
      return rollHp();
    } catch (err) {
      try {
        if (!AWS_rollHp) {
          sheet.remove();
          throw new Error();
        }
        if (setAvgHp())
          return toChat(
            `Could not randomize HP, setting HP to average instead.`,
            {
              code: 112,
            }
          );
        throw new Error();
      } catch (err) {
        throw new Error(`Could not calculate HP, wildshape cancelled.`);
      }
    }

    function setAvgHp() {
      if (hp.get("max")) {
        hp.setWithWorker("current", hp.get("max"));
        return true;
      }
      return false;
    }
    function calcAvgHp() {
      const count = /[0-9]+(?=d)/.exec(form)[0];
      const die = /(?<=d)[0-9]+/.exec(form)[0];
      const avg = +die / 2 + 0.5;
      const tot = Math.ceil(+count * avg);
      const resolve = form.replace(`${count}d${die}`, tot);
      setHpToResolve(resolve);
    }
    function rollHp() {
      setHpToResolve(form);
    }
    function setHpToResolve(formula) {
      sendChat(AWS_name, `/r ${formula}`, (r) => {
        const resolved = r[0] && r[0].content && JSON.parse(r[0].content).total;
        hp.setWithWorker("current", resolved);
        hp.setWithWorker("max", resolved);
      });
    }
  }

  /**
   * Adds the following attributes to the sheet:
   * ws_druid_id
   *
   * Also changes the npc_type from "<size> beast" to "<size> Wildshape".
   * @param {Druid|MoonDruid} druid
   * @param {Character} sheet
   */
  function addExtraAttributes(druid, sheet) {
    const extraAttributes = [
      {
        attrName: "ws_druid_id",
        value: druid.id,
      },
    ];
    extraAttributes.forEach((a) =>
      createOrSetAttrByName(sheet.id, a.attrName, a.value)
    );
    const sheetType = getAttrObject(sheet.id, "npc_type");
    const newValue = sheetType.get("current").replace(/beast/i, "Wildshape");
    sheetType.set("current", newValue);
  }

  /**
   * Transforms the selected token into that of the chosen beast.
   * @param {Character} origin The beast that has a default token.
   * @param {Character} target The sheet to copy the beast's default token.
   * @param {{alterSize:number,backupSheet:Character}}
   */
  function transformToken(origin, target, { alterSize, backupSheet } = {}) {
    origin.get("_defaulttoken", (t) => {
      try {
        if (t === "null") throw new Error("No default token");
        const tokenData = JSON.parse(t);
        if (!tokenData.imgsrc.includes("images"))
          throw new Error("Default token is not user-uploaded");
        const druidToken = getObj("graphic", msg.selected[0]._id);
        const imgsrc = cleanGraphic(tokenData.imgsrc);
        const hpAttr = getAttrObject(target.id, "hp");
        Object.assign(tokenData, {
          represents: target.id,
          width: alterSize,
          height: alterSize,
          imgsrc,
          name: target.get("name"),
          showname: true,
          pageid: druidToken.get("_pageid"),
          layer: druidToken.get("layer"),
          left: druidToken.get("left"),
          top: druidToken.get("top"),
          [`bar${AWS_hpbar}_link`]: hpAttr.id,
        });
        const newToken = createObj("graphic", tokenData);
        toFront(newToken);
        toChat(
          `${druidToken.get("name")} transformed into a ${target
            .get("name")
            .replace(druidToken.get("name"), "")
            .trim()}!`
        );
        druidToken.remove();
      } catch (error) {
        if (backupSheet) {
          toChat(
            `Attempting to create default token from character sheet because beast sheet had error "${error.message}".`,
            {
              code: 101,
            }
          );
          return transformToken(backupSheet, target, { alterSize });
        }
        toChat(
          `Could not create token - transformation aborted due to this error: "${error.message}".`,
          {
            code: 101,
          }
        );
      }
    });
  }

  /**
   * Reverts a token to the druid character it represents using the ws_druid_id attribute.
   */
  function endTransform() {
    const wsToken = tokenFromMessage();
    const sheet = charFromToken(wsToken);
    const druidId = getAttrByName(sheet.id, "ws_druid_id");
    const char = getObj("character", druidId);
    if (!char)
      throw new Error(
        `Character not found for character id "${druidId}". In endTransform.`
      );
    char.get("_defaulttoken", (t) => {
      const token = JSON.parse(t);
      Object.assign(token, {
        pageid: wsToken.get("_pageid"),
        layer: wsToken.get("layer"),
        left: wsToken.get("left"),
        top: wsToken.get("top"),
        imgsrc: cleanGraphic(token.imgsrc),
      });
      const newToken = createObj("graphic", token);
      const oldHp = getAttrByName(sheet.id, "hp");
      toFront(newToken);
      wsToken.remove();
      sheet.remove();
      toChat(`${newToken.get("name")} ended their wildshape.`);
      try {
        if (+oldHp < 0) {
          const hp = +getAttrByName(druidId, "hp");
          const newHp = hp + +oldHp;
          setAttrByName(druidId, "hp", new String(newHp));
          toChat(
            `${token.get(
              "name"
            )} hit points reduced from ${hp} to ${newHp} due to the damage they took while wildshaped.`
          );
        }
      } catch (err) {}
    });
  }

  /**
   * Returns the base dimensions of a token for an NPC.
   * @param {Character} char
   * @returns {number}
   */
  function getNpcSize(char) {
    const square = 70;
    const re = new RegExp(
      /(Tiny)|(Small|Medium)|(Large)|(Huge)|(Gargantuan)/,
      "ig"
    );
    const beastSize = getAttrByName(char.id, "npc_type");
    const res = re.exec(beastSize);
    if (res === null) return square;
    // test the groups 1 to 5 only (representing the sizes above)
    for (let i = 1; i <= 5; i++) {
      // math here converts sizes to grid squares
      if (res[i] !== undefined) {
        return (i - 1 > 0 ? i - 1 : 0.5) * square;
      }
    }
    return square;
  }

  /**
   * Returns the proficiency bonus an npc should have based on its CR.
   * @param {Character} npc
   * @returns {number}
   */
  function getNpcProfBonus(npc) {
    const cr = getAttrByName(npc.id, "npc_challenge");
    if (!cr) return;
    return Math.max(Math.ceil(crStringToNumber(cr) / 4) + 1, 2);
  }

  /**
   * Returns a filtered array of beasts based on the supplied CR.
   * @param {number} filter
   * @returns {Beast[]}
   */
  function filterBeasts(filter) {
    return getAllShapes().filter((a) => a.filter <= filter);
  }

  /**
   * Returns a list of all wild shapes with some details.
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

  /**
   * Adds the selected token(s) to the list of wildshapes.
   */
  function listAdd() {
    const tokens = tokensFromMessage();
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

  /**
   * Removes the seleted token(s) or named beasts from the beast list.
   */
  function listRemove() {
    if (msg.content.split(" ").length > 3) return listRemoveNamed();
    listRemoveSelected();
  }

  /**
   * Removes the named beast from the beast list.
   */
  function listRemoveNamed() {
    const name = msg.content.replace("!aws list remove ", "");
    const chars = findObjs({
      _type: "character",
      name,
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
      return toChat(
        `Character "${name}" has no wildshape attribute. They are not on the wildshapes list.`,
        {
          code: 43,
          player: msg.who,
        }
      );
    attrs.forEach((a) => a.remove());
    toChat(`Removed "${name}" from wildshape list.`, { player: msg.who });
  }

  /**
   * Removes the selected token(s) from the beast list.
   */
  function listRemoveSelected() {
    const tokens = tokensFromMessage();
    const removed = [];
    const missingWs = [];
    const charIds = tokens ? tokens.map((t) => t.get("represents")) : [];
    if (charIds.length === 0)
      return toChat("No tokens were selected and no beast name was provided.", {
        code: 41,
        player: msg.who,
      });
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
    if (removed !== 0) {
      const out1 = removed.reduce(
        (a, b) => a + `<br>${b.get("name")}`,
        `Removed these tokens from the list:`
      );
      toChat(out1, { player: msg.who });
    }
    if (missingWs.length !== 0) {
      const out2 = missingWs.reduce(
        (a, b) => a + `<br>${b.get("name")}`,
        `Couldn't remove these tokens from the list:`
      );
      toChat(out2, { code: 69, player: msg.who });
    }
  }

  /**
   * Make a table out of the supplied attribute's sheets ready to post to chat.
   * @param {{beasts:Beast[], cr?:boolean, remove?:boolean, transform?:boolean}} options If `beasts` is not supplied, a list of all beasts is used.
   *
   * If `cr = true` then beast CR will be shown and beasts will be sorted by CR.
   *
   * If `remove = true` then a button will be provided beside each beast that, when clicked by a GM, will remove the beast from the wild shapes list.
   *
   * If `transform = true` then a button will be provided beside each beast that will transform the selected token into that beast when clicked by a player controlling the token.
   */
  function listToChat({
    beasts = getAllShapes(),
    cr = false,
    remove = false,
    transform = false,
  } = {}) {
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
          transform ? `[✓](!<br>aws transform ${b.id})` : ""
        }${remove ? `[✗](!<br>aws list remove ${b.name})` : ""}}}`,
      `&{template:default}{{name=${tableName}}}`
    );
    return toChat(output, { player: msg.who });
  }

  /**
   * Populates the wild shape list with Beast type NPCs by adding a "ws" attribute to their character sheets.
   */
  function populateList() {
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

  /**
   * Returns an array of all beasts found using their "npc_type" attribute.
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
   * @returns {Character}
   */
  function charFromMessage() {
    const token = tokenFromMessage();
    return charFromToken(token); // TODO add optional chaining
  }

  /**
   * @param {Graphic} token
   * @returns {Character}
   */
  function charFromToken(token) {
    return getObj("character", token.get("represents"));
  }

  /**
   * @returns {Graphic[]}
   */
  function tokensFromMessage() {
    const tokens = msg.selected;
    return tokens && tokens.map((t) => getObj("graphic", t._id));
  }

  /**
   * @returns {Graphic}
   */
  function tokenFromMessage() {
    return getObj("graphic", msg.selected[0]._id);
  }

  /**
   * Takes a string number and returns it as a resolved number.
   * @param {string} str
   */
  function crStringToNumber(str) {
    if (!str) return 0;
    if (!str.includes("/")) return +str;
    return str.split("/").reduce((a, b) => +a / +b);
  }

  /**
   * Either creates an attribute or sets the value of an existing attribute as required.
   * @param {string} _characterid
   * @param {string} name Name of the attribute.
   * @param {string} current Value to set the attribute to.
   */
  function createOrSetAttrByName(_characterid, name, current) {
    if (getAttrByName(_characterid, name) !== undefined)
      return setAttrByName(_characterid, name, current);
    createObj("attribute", {
      _characterid,
      name,
      current,
    });
  }

  /**
   * Sets the value of an attribute's `current` property.
   * @param {string} _characterid
   * @param {string} name
   * @param {string} current
   */
  function setAttrByName(_characterid, name, current) {
    const attr = getAttrObject(_characterid, name);
    if (attr) attr.setWithWorker("current", current);
  }

  /**
   * Returns an attribute object found by character id and attribute name.
   * @param {string} _characterid
   * @param {string} name
   * @returns {Attribute}
   */
  function getAttrObject(_characterid, name) {
    const attrs = findObjs({
      _type: "attribute",
      _characterid,
      name,
    });
    if (attrs.length === 0)
      return toChat(`Attribute by name "${name}" could not be found.`, {
        code: 71,
        player: msg.who,
      });
    if (attrs.length > 1)
      return toChat(`Multiple attributes found with name "${name}".`, {
        code: 72,
        player: msg.who,
      });
    return attrs[0];
  }

  /**
   * Returns a slightly modified imgsrc so that it can be used by the API to create a token.
   * @param {string} imgsrc The image src property from a Character.
   * @returns {string} A version of the imgsrc that can be used by the API to create a token.
   */
  function cleanGraphic(imgsrc) {
    return imgsrc.replace(/\/(max|med|min)\./, "/thumb.");
  }

  /**
   * Output the supplied message to chat, optionally as a whisper and/or as an error which will also log to the console.
   * @param {string} message
   * @param {{code:number, player:string, logMsg:string}} options
   */
  function toChat(
    message,
    { code = undefined, player = undefined, logMsg = undefined } = {}
  ) {
    const isError = code !== undefined;
    const playerName = player && player.concat(" ").split(" ", 1)[0];
    if (message)
      sendChat(
        isError ? AWS_error : AWS_name,
        `${playerName ? "/w " + playerName + " " : ""}${"<br>" + message}`
      );
    if (isError)
      log(AWS_log + (logMsg || message) + " Error code " + code + ".");
  }
});
