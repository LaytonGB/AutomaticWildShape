var AutomaticWildShape = AutomaticWildShape || (function () {
    var stateName = 'AutomaticWildShape',
        states = [
            ['beastList', 'any', []],
            ['notifyGM'],
            ['hpBar', [1, 2, 3], 3]
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
                        'AWShelp',
                        `${apiCall} help`
                    ],
                    [
                        'AWSreset',
                        `${apiCall} RESET ?{Are you sure? This will reset all settings and empty the Wild Shape list|No|Yes}`
                    ]
                ];
            _.each(macrosArr, macro => {
                let macroObj = findObjs({ _type: 'macro', name: macro[0] })[0];
                if (macroObj) {
                    if (macroObj.get('visibleto').includes('all') === false) {
                        macroObj.set('visibleto', 'all');
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
                        visibleto: 'all'
                    })
                    toChat(`**Macro '${macro[0]}' was created and assigned to ${gm.get('_displayname')}.**`, true);
                }
            })
        },

        showHelp = function () {
            let commandsArr = [
                [
                    '!aws',
                    'List available wild-shape forms.'
                ]
            ];
            _.each(commandsArr, command => {
                let output = `&{template:default} {{name=${code(command[0])} Help}}`;
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
                let acceptableValues = value[1] ? value[1] : [true, false],
                    defaultValue = value[2] != undefined ? value[2] : true,
                    currentValue = `${getState(value[0])}`,
                    stringVals = valuesToString(acceptableValues, defaultValue);
                    if (!Array.isArray(value[2])) {
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

        resetConfig = function() {
            _.each(states, value => {
                let defaultValue = (value[2] != undefined) ? value[2] : true;
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
                if (!parts[1]) {
                    wildShape(msg);
                } else if (!['help', 'add', 'remove', 'list', 'populate', 'config', 'RESET'].includes(parts[1])) {
                    wildShape(msg);
                } else {
                    switch (parts[1]) {
                        case 'help':
                            showHelp();
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
                        case 'config':
                            if (playerIsGM(playerID)) { setConfig(parts); }
                            else { error(`Only GMs can modify API settings.`, -1) }
                            break;
                        case 'RESET':
                            if (parts[2] == 'Yes' && playerIsGM(playerID)) { resetConfig(); }
                            else { error(`Only GMs can reset the API settings.`, -2) }
                            break;
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
            else if (!charID || !char) { error(`Character ID was invalid.`, 2); return; }

            if (getAttrByName(charID, 'aws_override') == 1 && getAttrByName(charID, 'npc') != 1) {
                toChat(`**PLAYER IS USING AWS OVERRIDE**`, false, 'gm');
            }

            if (!parts[1]) {

            } else {
                let beastName = msg.content.replace(parts[0], '').trim(),
                    beast = findObjs({ _type: 'character', name: beastName })[0];
                if (beast) {
                    let crLimit = getPlayerFilter();
                } else {
                    error(`No beast named '${beastName}' found in the Journal.`, 3);
                    return;
                }
            }
        },

        listAdd = function (objs) {
            let beasts = getSheetsFromSelected(objs);
            _.each(beasts, beast => { listAddSheet(beast) });
            return;
        },

        listRemove = function (parts, objs) {
            if (parts[2] || objs[0]) {
                let beasts = parts[2] ? [parts[2]] : getSheetsFromSelected(objs),
                    list = getState('beastList'),
                    index;
                _.each(beasts, beast => {
                    index = _.findIndex(list, sheet => { return beast.id == sheet.id; })
                    if (index != -1) { list.splice(index, 1); }
                })
                state[`${stateName}_beastList`] = list;
                return;
            } else {
                error(`No Beast selected. Make sure you select a beast when running the remove command.`, 8);
                return;
            }
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

        listPopulate = function () {
            _.each(findObjs({ _type: 'character' }), sheet => {
                let type = getAttrByName(sheet.id, 'npc_type');
                if (type.toLowerCase().includes('beast') && getState('beastList').includes(sheet.id)) {
                    sheet.get('_defaulttoken', obj => {
                        if (obj != 'null') {
                            listAddSheet(sheet);
                        } else {
                            error(`Could not add '${sheet.get('name')}' to Wild Shape list because there was no default token.`, 4);
                        }
                    })
                }
            })
        },

        listAddSheet = function (sheet) {
            let beast = { id: sheet.id, name: sheet.get('name'), filter: filter, cr: cr },
                cr = getAttrByName(sheet.id, 'npc_challenge'),
                filter = crToFilter(cr);
            state[`${stateName}_beastList`].push(beast);
            listSort();
            toChat(`Beast '${sheet.get('name')}' added to the Wild Shape list.`, true);
            return;
        },

        listSort = function () {
            let list = getState('beastList');
            list.sort((a, b) => (a.name > b.name) ? 1 : -1); // sort alphabetically
            list.sort((a, b) => a.filter - b.filter); // sort by CR
            list = _.uniq(list, true); // remove duplicates
            state[`${stateName}_beastList`] = list;
        },

        getPlayerFilter = function () {
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
                    break;
                }
            })
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
                        error(`NPCs can only wild shape if they have the attribute 'aws_override' set to '1'.`, 7);
                        return;
                    }
                } else {
                    error(`Character is not a Druid. Only Druids can use Wild Shape.`, 6);
                    return;
                }
            }
            // categorise filter by level
            if (moonDruid) {
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

        getSheetsFromSelected = function (objs) {
            let tokens = _.map(objs, obj => { getObj('graphic', obj._id) }),
                tokens = _.filter(tokens, token => { 
                    let keep = token.get('represents') != undefined;
                    if (!keep) { error(`Beast '${token.get('name')}' did not represent a sheet, and so could not be added to the Wild Shape list.`, 9) }
                    return keep; 
                }),
                sheets = _.map(tokens, token => { getObj('character', token.get('represents')) });
            return sheets;
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
                let values = variable[1] ? variable[1] : [true, false],
                    defaultValue = variable[2] != undefined ? variable[2] : true;
                if (!state[`${stateName}_${variable[0]}`] || (!values.includes(state[`${stateName}_${variable[0]}`]) && variable[1] != 'any')) {
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