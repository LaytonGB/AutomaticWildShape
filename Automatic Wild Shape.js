var AutomaticWildShape = AutomaticWildShape || (function () {
    var stateName = 'AutomaticWildShape',
        states = [
            ['beastList', 'any', []], // wild shape list of creatures
            ['polyConfirm'], // require GM confirmation for player to use Polymorph
            ['notifyGM'], // notify gm of who is using api
            ['hpBar', [1, 2, 3], 3],
            ['roll_shape_hp', ['true', 'false'], 'false']
        ],
        name = 'AWS',
        nameError = name + ' ERROR',
        nameLog = name + ': ',
        apiCall = '!aws',

        parts,
        playerName,
        playerID,
        token,
        charID,
        char,

        checkMacros = function () {
            let playerList = findObjs({ _type: 'player', _online: true }),
                gm = _.find(playerList, player => { return playerIsGM(player.id) === true; }),
                macrosArr = [
                    [
                        'WildShape',
                        `${apiCall}`
                    ],
                    [
                        'AWSadd',
                        `${apiCall} add`
                    ],
                    [
                        'AWSremove',
                        `${apiCall} remove`
                    ],
                    [
                        'AWSlist',
                        `${apiCall} list`
                    ],
                    [
                        'AWSpopulate',
                        `${apiCall} populate`
                    ],
                    [
                        'AWSconfig',
                        `${apiCall} config`
                    ],
                    [
                        'AWShelp',
                        `${apiCall} help`
                    ],
                    [
                        'AWSreset',
                        `${apiCall} RESET ?{Are you sure? This will reset all settings and empty the Wild Shape list|No|Yes}`
                    ],
                    [
                        'AWSoverrideToggle',
                        `${apiCall} override`,
                        true // sets GM only
                    ]
                ];
            _.each(macrosArr, macro => {
                let macroObj = findObjs({ _type: 'macro', name: macro[0] })[0],
                    who = macro[2] ? '' : 'all';
                if (macroObj) {
                    if (macroObj.get('visibleto').includes('all') === false) {
                        macroObj.set('visibleto', who);
                        toChat(`**Macro '${macro[0]}' was made visible to all.**`, true);
                    }
                    if (macroObj.get('action') !== macro[1]) {
                        macroObj.set('action', macro[1]);
                        toChat(`**Macro '${macro[0]}' was corrected.**`, true);
                    }
                } else if (gm && playerIsGM(gm.id)) {
                    createObj('macro', {
                        _playerid: gm.id,
                        name: macro[0],
                        action: macro[1],
                        visibleto: who
                    })
                    toChat(`**Macro '${macro[0]}' was created and assigned to ${gm.get('_displayname')}.**`, true);
                }
            })
        },

        showHelp = function () {
            let commandsArr = [
                [
                    `${apiCall}`,
                    'If a token is selected, presents a list of eligible wild shapes as per 5th Edition rules. If a character sheet ID is appended and the character sheet is in the wild shape list, the selected token will wild shape into a duplicate of that character sheet.'
                ],
                [
                    `${apiCall} add`,
                    'Adds the selected token and the sheet it represents to the list of available wild shapes.'
                ],
                [
                    `${apiCall} remove`,
                    'Removes the selected tokens from the wild shapes list. If a character sheet ID is appended and the character sheet is in the wild shape list, it is removed.'
                ],
                [
                    `${apiCall} populate`,
                    'Automatically populates the wild shape list with all NPC character sheets of type Beast.'
                ],
                [
                    `${apiCall} list`,
                    'Lists all creatures in the wild shapes list, and supplies an easy means of their removal.'
                ],
                [
                    `${apiCall} override`,
                    'Toggles whether the selected character must abide by the wild-shape limits.'
                ],
                [
                    `${apiCall} config`,
                    'Displays configuration settings and an interface with which to change them.'
                ],
                [
                    `${apiCall} RESET`,
                    'Resets ALL settings and empties the wild shapes list. This is present to fix some otherwise ireparable issues.'
                ],
                [
                    `${apiCall} help`,
                    'Shows this interface.'
                ]
            ];
            _.each(commandsArr, command => {
                let output = `&{template:default} {{name=${code(command[0])}}}`;
                _.each(command, function (part, index) {
                    if (index < 3) {
                        let section;
                        switch (index) {
                            case 0:
                                section = 'Command';
                                break;
                            case 1:
                                section = 'Function';
                                break;
                            case 2:
                                section = 'Typical Input';
                                break;
                        }
                        output += `{{${section}=${part}}}`;
                    } else {
                        output += `{{${part[0]}=${part[1]}}}`;
                    }
                })
                toPlayer(output);
            })
            return;
        },

        showConfig = function () {
            let output = `&{template:default} {{name=${name} Config}}`;
            _.each(states, value => {
                if (!Array.isArray(value[2])) {
                    let acceptableValues = value[1] ? value[1] : ['true', 'false'],
                        defaultValue = value[2] != undefined ? value[2] : 'true',
                        currentValue = `${getState(value[0])}`,
                        stringVals = valuesToString(acceptableValues, defaultValue);
                    output += `{{${value[0]}=[${currentValue}](${apiCall} config ${value[0]} ?{New ${value[0]} value${stringVals}})}}`;
                }
            })
            toPlayer(output);
            return;

            function valuesToString(values, defaultValue) {
                let output = '',
                    index = values.indexOf(defaultValue);
                if (index !== -1) {
                    let val = values.splice(index, 1);
                    values.unshift(val);
                }
                _.each(values, value => {
                    output += `|${value}`;
                })
                return output;
            }
        },

        setConfig = function (parts) {
            if (parts[2] == states[0][0]) { error(`Oh no you don't, that setting isn't for your grubby little fingers.`, 'DANGER ZONE'); return; }
            toPlayer(`**${parts[2]}** has been changed **from ${state[`${stateName}_${parts[2]}`]} to ${parts[3]}**.`, true);
            state[`${stateName}_${parts[2]}`] = parts[3];
            showConfig();
            return;
        },

        resetConfig = function () {
            _.each(states, value => {
                let defaultValue = value[2] != undefined ? value[2] : 'true';
                state[`${stateName}_${value[0]}`] = defaultValue;
            })
            toChat(`All settings restored to default, and Wild Shape list emptied.`, true);
            return;
        },

        handleInput = function (msg) {
            playerName = msg.who.split(' ', 1)[0];
            playerID = msg.playerid;
            parts = msg.content.split(' ');
            if (msg.type === 'api' && parts[0] === `${apiCall}`) {
                if (!parts[1] || !['help', 'end', 'add', 'remove', 'list', 'populate', 'revertDamage', 'config', 'RESET', 'override'].includes(parts[1])) {
                    wildShape(msg);
                } else {
                    switch (parts[1]) {
                        case 'help':
                            showHelp();
                            break;
                        case 'end':
                            revertToken();
                            break;
                        case 'add':
                            listAdd(msg.selected);
                            break;
                        case 'remove':
                            listRemove(parts, msg.selected);
                            break;
                        case 'list':
                            listToChat();
                            break;
                        case 'populate':
                            listPopulate();
                            break;
                        case 'revertDamage':
                            if (playerIsGM(playerID)) { revertDamage(parts[2], parts[3]); }
                            else { error(`Only GMs can revert the damage carry-over.`, 14) }
                            break;
                        case 'config':
                            if (playerIsGM(playerID)) { setConfig(parts); }
                            else { error(`Only GMs can modify API settings.`, -1) }
                            break;
                        case 'RESET':
                            if (parts[2] == 'Yes' && playerIsGM(playerID)) { resetConfig(); }
                            else { error(`Only GMs can reset the API settings.`, -2) }
                            break;
                        case 'override':
                            if (parts[2] == 'Yes' && playerIsGM(playerID)) { toggleOverride(msg); }
                            else { error(`Only GMs can toggle override.`, -3) }
                        default:
                            error(`Command not understood:<br>${code(msg.content)}`, 0);
                            break;
                    }
                    return;
                }
            }
        },

        wildShape = function (msg) {
            token = getObj('graphic', msg.selected[0]._id);
            charID = token.get('represents');
            char = getObj('character', charID);

            if (!token) { error(`Either no token was selected or the selected token was not a graphic.`, 1); return; }
            else if (!charID || !char) { error(`Character ID ${code(charID)} was invalid.`, 2); return; }

            if (getAttrByName(charID, 'aws_override') == 1 && getAttrByName(charID, 'npc') != 1) {
                toChat(`**PLAYER IS USING AWS OVERRIDE**`, false, 'gm');
            }

            if (!parts[1]) { // Druid wild shape list popout
                if (!getPlayerFilter('druid')) { error(`Only druids and DM controlled NPCs can use Wild Shape.`, 15); return; }
                transformListToChat('druid');
            } else if (parts[1] == 'poly') { // if Polymorph
                if (getState('polyConfirm')) {
                    let beast = getBeastFromList(parts[2]);
                    toChat(`Confirmation message sent to GM. You will transform when they accept.`, true, playerName);
                    toChat(`${playerName} wants to transform into a ${beast.name}. Allow this?<br>[Yes](!aws confirm ${token.id} ${beast.id}) [No](!aws decline ${playerName} ${beast.name})`, false, 'gm'); //working
                    return;
                }
            } else { // if transformation command
                let beastID = msg.content.replace(parts[0], '').trim(), // delete api call and trim spaces from message for beastID
                    beast = getObj('character', beastID);
                if (beast) {
                    let crLimit = getPlayerFilter(),
                        listBeast = getState('beastList').find(beast => beast.id == beastID);
                    if (crLimit && listBeast) {
                        if (listBeast.filter <= crLimit) {
                            transformToken(beast);
                        } else {
                            let cr = crLimit == .2 ? '1/4' : crLimit == .5 ? '1/2' : crLimit;
                            error(`Sorry, but the CR of a '${beast.name}' is too high for ${token.get('name')} to transform into.<br>Pick a creature of CR ${cr} or lower.`)
                        }
                    }
                } else {
                    error(`No beast named '${beastID}' found in the Journal.`, 3);
                }
            }
            return;
        },

        getBeastFromList = function (id) {
            return _.find(getState('beastList'), beast => { return beast.id == id; })
        },

        transformListToChat = function (type) {
            let chatOutput = `&{template:default} {{name=${token.get('name')}'s Wild Shapes}}`,
                filters = {
                    cr: getPlayerFilter(),
                    level: getPlayerFilter('level'),
                    canSwim: this.level >= 4,
                    canFly: this.level >= 8
                },
                beastList = type == 'druid' ?
                    _.filter(getState('beastList'), beast => {
                        return beast.filter <= filters.cr
                            && (!beast.canSwim || (beast.canSwim && filters.canSwim))
                            && (!beast.canFly || (beast.canFly && filters.canFly));
                    })
                    : type == 'poly' ?
                        beastList = getState('beastList')
                        : undefined;
            if (beastList.length > 0) {
                let i = 0,
                    cr;
                _.each(beastList, beast => {
                    if (cr != beast.cr) {
                        cr = beast.cr;
                        chatOutput += ` {{CR${cr} Creatures}}`;
                    }
                    if (i % 2 == 0) {
                        chatOutput += ` {{[${beast.name}](!aws ${beast.id}) `;
                    } else {
                        chatOutput += `= [${beast.name}](!aws ${beast.id})}}`;
                    }
                    i++;
                })
                if (i % 2 == 0) {
                    chatOutput += `}}`;
                }
                toChat(chatOutput, undefined, playerName);
            } else {
                error(`No creatures present in available Wild Shapes.`, 9);
            }
            return;
        },

        transformToken = function (beastOld) {
            // make checks
            beastOld.get('_defaulttoken', o => {
                if (o == 'null') { error(`'${beastOld.get('name')}' does not have a default token. Wild Shape cancelled.`, 11); return; }
            });
            if (findObjs({ _type: 'attribute', _characterid: beastOld.id, name: 'source_token' })[0]) {
                error(`That beast is already in Wild Shape, detected because character attribute ${code('source_token')} already has a value.`, 12);
                return;
            }
            if (getState('hpBar') > 3 || getState('hpBar') < 1) {
                error(`The HP bar setting has been set outside of its parameters. To reset, run the command ${code('!aws RESET yes')}. Wild Shape cancelled.`, 12);
                return;
            }

            // create beast sheet
            let beastOldAttrs = findObjs({ _type: 'attribute', _characterid: beastOld.id }),
                beastNew = createObj('character', { name: `${token.get('name')} as ${beastOld.get('name')}`, avatar: beastOld.get('avatar') });

            // add beast attrs
            _.each(beastOldAttrs, attr => {
                let attrNew = createObj('attribute', {
                    _characterid: beastNew.id,
                    name: attr.get('name')
                })
                attrNew.setWithWorker({
                    current: attr.get('current'),
                    max: attr.get('max')
                })
            });

            // add revert macro
            createObj('ability', {
                _characterid: beastNew.id,
                name: `~EndWildShape`,
                action: `!aws end`,
                istokenaction: true
            });

            // add player control
            beastNew.set('controlledby', char.get('controlledby'));

            // bring over player sheets proficiencies and mental stats
            let mentalAttrs = ['intelligence', 'wisdom', 'charisma'],
                skills = {
                    skills: [
                        'strength_save', 'dexterity_save', 'constitution_save', 'intelligence_save', 'wisdom_save', 'charisma_save', 'athletics', 'acrobatics', 'sleight_of_hand', 'stealth', 'arcana', 'history', 'investigation', 'nature', 'religion', 'animal_handling', 'insight', 'medicine', 'perception', 'survival', 'deception', 'intimidation', 'performance', 'persuasion'
                    ],
                    saves: [],
                    str: ['strength_save', 'athletics'],
                    dex: ['dexterity_save', 'acrobatics', 'sleight_of_hand', 'stealth'],
                    con: ['constitution_save'],
                    int: ['intelligence_save', 'arcana', 'history', 'investigation', 'nature', 'religion'],
                    wis: ['wisdom_save', 'animal_handling', 'insight', 'medicine', 'perception', 'survival'],
                    cha: ['charisma_save', 'deception', 'intimidation', 'performance', 'persuasion'],
                    findAbility: function (skill) {
                        let end = '_mod';
                        if (skills.str.includes(skill)) {
                            return 'strength' + end;
                        } else if (skills.dex.includes(skill)) {
                            return 'dexterity' + end;
                        } else if (skills.con.includes(skill)) {
                            return 'constitution' + end;
                        } else if (skills.int.includes(skill)) {
                            return 'intelligence' + end;
                        } else if (skills.wis.includes(skill)) {
                            return 'wisdom' + end;
                        } else if (skills.cha.includes(skill)) {
                            return 'charisma' + end;
                        } else {
                            error(`Skill '${skill}' was not related to any ability score.`, 11);
                            return;
                        }
                    }
                };

            _.each(mentalAttrs, attrName => { // set ability scores
                let beastAttr = findObjs('attribute', { _characterid: beastNew.id, name: attrName })[0];
                beastAttr.setWithWorker({ current: getAttrByName(charID, attrName, 'current'), max: getAttrByName(charID, getAttrByName(charID, attrName, 'max')) });
            });

            let skillsProfs = _.filter(skills.skills, skill => { // reduce skill list to only skills PC is proficient in
                return getAttrByName(charID, skill + '_prof') == 1;
            });

            _.each(skillsProfs, skill => { // for each skill or save proficiency that the PC has, set the skill to the highest of the PC or Beast bonuses
                // store IDs, attribute names, and search for bonuses
                let ability = skills.findAbility(skill), // the relevant ability score for this skill
                    attrsChar = {
                        bonus: getAttrByName(charID, 'pb') ? getAttrByName(charID, 'pb') : getAttrByName(charID, 'npc') == 1 ? (+getAttrByName(charID, 'npc_challenge') / 4) + 2 : 2
                    },
                    attrsBeast = {
                        id: beastNew.id,
                        name: 'npc_' + skill + '_bonus',
                        abilityMod: getAttrByName(attrsBeast.id, ability)
                    };
                // Change saving throws to npc styled saving throws ('dexterity_save' => 'dex_save')
                if (skill.contains('_save')) {
                    attrsBeast.name = npcSave(skill);
                    attrsBeast.attr = findObjs('attribute', { _characterid: beastNew.id, name: attrsBeast.name })[0];
                } else {
                    attrsBeast.attr = findObjs('attribute', { _characterid: beastNew.id, name: attrsBeast.name })[0];
                }
                // for beast only, see if an attribute was found. if not, create it and set to 0.
                if (!attrsBeast.attr) {
                    attrsBeast.attr = createObj('attribute', { _characterid: attrsBeast.id, name: attrsBeast.name });
                    attrsBeast.attr.setWithWorker({ current: 0 });
                }
                // get beast proficiency bonus for this skill
                attrsBeast.bonus = +attrsBeast.attr.get('current') - +getAttrByName(attrsBeast.id, ability);
                // if the beast bonus is smaller than the player bonus, use the player bonus
                if (+attrsBeast.bonus < +attrsChar.bonus) {
                    attrsBeast.attr.setWithWorker({ current: +attrsChar.bonus + +attrsBeast.abilityMod });
                }
            });
            function npcSave(attr) { // Change saving throws to npc styled saving throws ('dexterity_save' => 'dex_save')
                attr = attr.replace('ength', '');
                attr = attr.replace('terity', '');
                attr = attr.replace('stitution', '');
                attr = attr.replace('elligence', '');
                attr = attr.replace('dom', '');
                attr = attr.replace('risma', '');
                return attr;
            }

            // randomise and/or refill hp
            let beastNewHP = findObjs({ _type: 'attribute', _characterid: beastNew.id, name: 'hp' })[0];
            if (getState('roll_shape_hp') && beastNew.get('npc_hpformula')) {
                let rolledHP = roll(beastNew.get('npc_hpformula'));
                beastNewHP.setWithWorker({ max: rolledHP, current: rolledHP });
            } else {
                beastNewHP.setWithWorker({ max: beastNewHP.get('max'), current: beastNewHP.get('max') });
            }

            // store old token JSON string in new beast sheet
            createObj('attribute', { _characterid: beastNew.id, name: 'source_token', current: JSON.stringify(token) })

            // create beast token
            beastOld.get('_defaulttoken', o => {
                let obj = JSON.parse(o);
                obj = Object.assign(obj, {
                    _pageid: token.get('_pageid'),
                    layer: token.get('layer'),
                    name: token.get('name'),
                    left: token.get('left'),
                    top: token.get('top'),
                    represents: beastNew.id
                });
                // token hp
                obj[`bar${getState('hpBar')}_max`] = getAttrByName(beastNew, 'hp', 'max');
                obj[`bar${getState('hpBar')}_value`] = obj[`bar${getState('hpBar')}_max`];
                // token size
                switch (true) {
                    case getAttrByName(beastNew, 'npc_type').search(/tiny/i) != -1:
                        setSize(0.5);
                        break;
                    case getAttrByName(beastNew, 'npc_type').search(/large/i) != -1:
                        setSize(2);
                        break;
                    case getAttrByName(beastNew, 'npc_type').search(/huge/i) != -1:
                        setSize(3);
                        break;
                }
                function setSize(size) {
                    obj.width *= size;
                    obj.height *= size;
                }
            });
            //img setup
            let img = obj.imgsrc;
            img = img.replace("max.", "thumb.");
            img = img.replace("med.", "thumb.");
            img = img.replace("min.", "thumb.");
            obj.imgsrc = img;

            // place new token and delete old token
            let beastNewToken = createObj('graphic', obj);
            if (beastNewToken == undefined) {
                error(`Tokens must be player-uploaded for the Auto Wild Shape API to work.`, 13);
                // remove the created sheet that is now unused
                toChat(`API cleaned up character sheets left over after errors.`, false);
                beastNew.remove();
                return;
            } else {
                toFront(beastNewToken);
                setDefaultTokenForCharacter(beastNew, beastNewToken);
                // delete old token
                token.remove();
            }
        },

        revertToken = function () {
            // create original token from info on wild shaped sheet
            let tokenString = findObjs({ _type: 'attribute', _characterid: charID, name: 'source_token' })[0],
                tokenOld;
            if (tokenString) {
                tokenOld = JSON.parse(tokenString);
                Object.assign(tokenOld, {
                    _pageid: token.get('_pageid'),
                    layer: token.get('layer'),
                    left: token.get('left'),
                    top: token.get('top')
                });
                tokenOld = createObj('graphic', tokenOld);
            } else {
                error(`This token is not in Wild Shape, and so cannot leave Wild Shape.`, 13);
                return;
            }

            // carry over damage
            if (token.get(`bar${hpBar}_value`) < 0) {
                let oldHP = tokenOld.get(`bar${hpBar}_value`),
                    damage = token.get(`bar${hpBar}_value`).replace('-', ''),
                    newHP = +oldHP - +damage,
                    char = getChar(tokenOld.id), // get tokenOld char
                    hpAttr = findObjs({ _type: 'attribute', _characterid: char.id, name: 'hp' }); // get char hp attribute
                hpAttr.setWithWorker({ current: newHP }); // carry over damage
                toChat(`${damage} damage carried over from ${tokenOld.get('name')}'s Wild Shape.`, false); // post to chat about damage 
                toChat(`[Revert Damage](!aws revertDamage ${tokenOld.id} ${oldHP})`); // supply revert button (gm only)
            }

            // delete beast token and sheet
            let beastSheet = getChar(token);
            token.remove();
            beastSheet.remove();
            return;
        },

        revertDamage = function (tokenID, hpOld) {
            let char = getChar(tokenID),
                hp = findObjs({ _type: 'attribute', _characterid: char.id, name: 'hp' });
            hp.setWithWorker({ current: hpOld });
            return;
        },

        listAdd = function (objs) {
            let beasts = getSheetsFromSelected(objs),
                successes = 0,
                lastSuccess = new String,
                failures = 0;
            _.each(beasts, beast => {
                if (listAddSheet(beast)) {
                    successes += 1;
                    lastSuccess = beast.get('name');
                } else { failures += 1; }
            });
            if (successes == 1) {
                toChat(`${lastSuccess} added to Wild Shapes.`, true);
            } else if (successes > 1) {
                toChat(`${successes} creatures successfully added to the Wild Shape list.`, true);
            } else {
            }
            if (failures > 0) {
                error(`Something went wrong - ${failures} creature(s) could not be added to the Wild Shape list.`, 13);
            }
            return;
        },

        getSheetsFromSelected = function (objs) {
            let chars = _.map(objs, obj => { return getChar(obj._id) });
            return chars;
        },

        listPopulate = function () {
            let beastsAdded = 0,
                lastBeast;
            _.each(findObjs({ _type: 'character' }), sheet => {
                let isNPC = getAttrByName(sheet.id, 'npc'),
                    type = getAttrByName(sheet.id, 'npc_type');
                if (isNPC && type.search(/beast/i) != -1 && searchBeastList(sheet.id, 'id') == -1) {
                    if (!findObjs({ _type: 'attribute', _characterid: sheet.id, name: 'source_token' })) {
                        // sheet.get('_defaulttoken', o => {
                        // if (o != 'null') {
                        listAddSheet(sheet);
                        beastsAdded += 1;
                        lastBeast = sheet.get('name');
                        // } else {
                        // error(`Could not add '${sheet.get('npc_name')}' to Wild Shape list because there was no default token.`, 4);
                        // }
                        // })
                    }
                }
            })
            if (beastsAdded == 1) {
                toChat(`**${lastBeast} added** to Wild Shapes.`, true);
            } else if (beastsAdded > 1) {
                toChat(`**${beastsAdded} beasts added** to Wild Shapes.`, true);
            } else {
                toChat(`No new beasts found.`, false, playerName);
            }
            return;
        },

        listAddSheet = function (sheet) {
            if (sheet) {
                let cr = getAttrByName(sheet.id, 'npc_challenge'),
                    filter = crToFilter(cr),
                    beast = {
                        id: sheet.id,
                        name: sheet.get('name'),
                        filter: filter,
                        cr: cr,
                        swimming: getAttrByName(sheet.id, 'npc_speed').search(/swim/i) != -1,
                        flying: getAttrByName(sheet.id, 'npc_speed').search(/fly/i) != -1
                    };
                state[`${stateName}_beastList`].push(beast);
                listSort();
                return true;
            }
            return false;
        },

        listRemove = function (parts, objs) {
            if (parts[2] || objs[0]) {
                let beasts = parts[2] ? [getObj('character', parts[2])] : getSheetsFromSelected(objs),
                    list = getState('beastList'),
                    index,
                    removedCount = 0,
                    lastBeast = '';
                _.each(beasts, beast => {
                    index = _.findIndex(list, sheet => { return beast.id == sheet.id; })
                    if (index != -1) {
                        removedCount += 1;
                        lastBeast = beast.get('name');
                        list.splice(index, 1);
                    }
                })
                if (removedCount == 1) {
                    toChat(`Removed '${lastBeast}' from Wild Shapes.`, true);
                } else if (removedCount > 1) {
                    toChat(`Removed ${removedCount} creatures from Wild Shapes.`, true);
                } else {
                    error(`Creature was not amongst those in the Wild Shapes.`, 14);
                }
                state[`${stateName}_beastList`] = list;
            } else {
                error(`No Beast selected. Make sure you select a beast when running the remove command.`, 8);
            }
            return;
        },

        listToChat = function () {
            if (getState('beastList').length > 0) {
                let msg = `&{template:default} {{name=**Full Wild Shape List**}} {{**vv NAME vv**=**vv CR vv**}}`;
                _.each(getState('beastList'), beast => {
                    msg += ` {{${beast.name} = CR${beast.cr} [X](!aws remove ${beast.id})}}`;
                })
                toChat(msg, undefined, playerName);
            } else {
                error(`Wild Shape list has no entries.`, 5);
                return;
            }
        },

        listSort = function () {
            let list = getState('beastList');
            list.sort((a, b) => (a.name > b.name) ? 1 : -1); // sort alphabetically
            list.sort((a, b) => a.filter - b.filter); // sort by CR
            list = _.uniq(list, true); // remove duplicates
            state[`${stateName}_beastList`] = list;
        },

        searchBeastList = function (value, attr) {
            let index = -1;
            for (let i = 0; i < getState('beastList').length; i++) {
                if (getState('beastList')[i][`${attr}`] == value) {
                    index = i;
                    break;
                }
            }
            return index;
        },

        getPlayerFilter = function (type) {
            let classAttrs = ['class'],
                druidClass,
                druidLevel,
                moonDruid,
                filter;
            // find player druid class
            for (let i = 1; i <= 4; i++) {
                if (getAttrByName(charID, `multiclass${i}_flag`) == 1) {
                    classAttrs.push(`multiclass${i}`);
                }
            }
            _.each(classAttrs, attrName => {
                if (getAttrByName(charID, attrName).toLowerCase().includes('druid')) {
                    druidClass = attrName;
                }
            })
            if (type == 'druid') { return druidClass != undefined; }
            if (type == 'class') { return druidClass; }
            // find subclass & if moon druid
            if (druidClass == 'class') {
                druidLevel = getAttrByName(charID, 'base_level');
                moonDruid = getAttrByName(charID, 'subclass').toLowerCase().includes('moon');
            } else if (druidClass != undefined) {
                druidLevel = getAttrByName(charID, druidClass + '_lvl');
                moonDruid = getAttrByName(charID, druidClass + '_subclass').toLowerCase().includes('moon');
            } else {
                if (getAttrByName(charID, 'npc') == 1) {
                    if (playerIsGM(playerID)) {
                        return 99;
                    } else {
                        error(`NPCs can only wild shape if the GM runs the command or if they have override enabled.`, 7);
                        return;
                    }
                } else {
                    error(`Character is not a Druid. Only Druids can use Wild Shape.`, 6);
                    return;
                }
            }
            if (type == 'level') { return druidLevel; }
            if (type == 'moon') { return moonDruid; }
            // categorise filter by class and level
            if (!moonDruid) {
                filter = +druidLevel >= 8 ? 1 : +druidLevel >= 4 ? .5 : +druidLevel >= 2 ? .2 : undefined;
            } else {
                filter = +druidLevel >= 6 ? Math.floor(+druidLevel / 3) : +druidLevel >= 2 ? 1 : undefined;
            }
            // return filter
            return filter;
        },

        crToFilter = function (cr) {
            let filter;
            switch (cr) {
                case '1/8':
                    filter = .1;
                    break;
                case '1/4':
                    filter = .2;
                    break;
                case '1/2':
                    filter = .5;
                    break;
                default:
                    filter = cr;
                    break;
            }
            return filter;
        },

        getState = function (value) {
            return state[`${stateName}_${value}`];
        },

        getChar = function (tokenID) {
            let token = getObj('graphic', tokenID),
                charID = token ? token.get('represents') : undefined,
                char = charID ? getObj('character', charID) : undefined;
            return char;
        },

        roll = function (formula) {
            return new Promise(resolve => {
                sendChat('', '/r ' + formula, results => {
                    resolve(JSON.parse(results[0].content).total);
                });
            });
        },

        code = function (snippet) {
            return `<span style="background-color: rgba(0, 0, 0, 0.5); color: White; padding: 2px; border-radius: 3px;">${snippet}</span>`;
        },

        toChat = function (message, success, target) {
            let style = '<div>',
                whisper = target ? `/w ${target} ` : '';
            if (success === true) {
                style = `<br><div style="background-color: #5cd65c; color: Black; padding: 5px; border-radius: 10px;">`;
            } else if (success === false) {
                style = `<br><div style="background-color: #ff6666; color: Black; padding: 5px; border-radius: 10px;">`;
            }
            sendChat(name, `${whisper}${style}${message}</div>`);
        },

        toPlayer = function (message, success) {
            if (!success) {
                sendChat(name, `/w ${playerName} ` + message);
            } else {
                sendChat(name, `/w ${playerName} ` + '<br><div style="background-color: #5cd65c; color: Black; padding: 5px; border-radius: 10px;">' + message + '</div>');
            }
        },

        error = function (error, code) {
            if (playerName) {
                sendChat(nameError, `/w ${playerName} <br><div style="background-color: #ff6666; color: Black; padding: 5px; border-radius: 10px;">**${error}** Error code ${code}.</div>`);
            } else {
                sendChat(nameError, `<br><div style="background-color: #ff6666; color: Black; padding: 5px; border-radius: 10px;">**${error}** Error code ${code}.</div>`);
            }
            log(nameLog + error + ` Error code ${code}.`);
        },

        startupChecks = function () {
            _.each(states, variable => {
                let values = variable[1] ? variable[1] : ['true', 'false'],
                    defaultValue = variable[2] != undefined && variable[2] !== [] ? variable[2] : 'true';
                if ((state[`${stateName}_${variable[0]}`] == undefined && state[`${stateName}_${variable[0]}`] !== []) || (!values.includes(state[`${stateName}_${variable[0]}`]) && variable[1] != 'any')) {
                    error(`'${variable[0]}'** value **was '${state[`${stateName}_${variable[0]}`]}'** but has now been **set to its default** value, '${defaultValue}'.`, -1);
                    state[`${stateName}_${variable[0]}`] = defaultValue;
                }
            })
        },

        registerEventHandlers = function () {
            on('chat:message', handleInput);
        };

    return {
        CheckMacros: checkMacros,
        StartupChecks: startupChecks,
        RegisterEventHandlers: registerEventHandlers
    };
}())

on('ready', function () {
    AutomaticWildShape.CheckMacros();
    AutomaticWildShape.StartupChecks();
    AutomaticWildShape.RegisterEventHandlers();
})