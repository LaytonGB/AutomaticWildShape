/*
README
In order to prepare a beast for wild-shaping, complete this checklist:
1) Make sure the beast has a player-uploaded default token.
2) Make sure you're using a filled out Roll20 D&D 5e Character Sheet.
3) ??? - If its not working with a default SRD monster sheet & blank player-uploaded default token then something has gone wrong. Hit me up at the link below.

To override the class requirement of "Druid" and disable the CR limit set by character level:
1) Create an attribute on the NPC or PC sheet.
2) Name the attribute "aws_override".
3) Set the attribute value to "1".
If a PC is using the "aws_override" attribute the GM will be notified.

Automatic Wild Shape written by Layton - https://app.roll20.net/users/1519557/layton
*/

// Constants
const AWS_name = "AWS";
const AWS_state_name = "AUTOMATICWILDSHAPE";
const AWS_error = AWS_name+" ERROR";
const AWS_log = AWS_name+" - ";

// Debug
const AWS_debug = false;

// Settings
const AWS_notifyGM = true;
const AWS_hpbar = 3;

// Automatic Wild Shape
on("ready", function() {
    log("Automatic Wild Shape API Ready!");
    
    //macro creation
    if (findObjs({_type: "macro", name: "AutoWildShape"}, {caseInsensitive: true})[0] === undefined) {
        for (let i = 0; i < findObjs({_type: "player", _online: true}).length; i++) { // for every online player:
            if (playerIsGM(findObjs({_type: "player", _online: true})[i].id)) { // if there is not a macro and an online player is gm, create macro as player
                sendChat(AST_name, "/w gm Created **AutoWildShape** macro.");
                createObj("macro", {
                    playerid: findObjs({_type: "player", _online: true})[i].id,
                    name: "AutoWildShape",
                    visibleto: "all",
                    action: "!aws"
                });
                break;
            };
        };
    };
    if (findObjs({_type: "macro", name: "AWSadd"}, {caseInsensitive: true})[0] === undefined) {
        for (let i = 0; i < findObjs({_type: "player", _online: true}).length; i++) { // for every online player:
            if (playerIsGM(findObjs({_type: "player", _online: true})[i].id)) { // if there is not a macro and an online player is gm, create macro as player
                sendChat(AST_name, "/w gm Created **AWSadd** macro.");
                createObj("macro", {
                    playerid: findObjs({_type: "player", _online: true})[i].id,
                    name: "AWSadd",
                    visibleto: "all",
                    action: "!aws add"
                });
                break;
            };
        };
    };
    if (findObjs({_type: "macro", name: "AWSremove"}, {caseInsensitive: true})[0] === undefined) {
        for (let i = 0; i < findObjs({_type: "player", _online: true}).length; i++) { // for every online player:
            if (playerIsGM(findObjs({_type: "player", _online: true})[i].id)) { // if there is not a macro and an online player is gm, create macro as player
                sendChat(AST_name, "/w gm Created **AWSremove** macro.");
                createObj("macro", {
                    playerid: findObjs({_type: "player", _online: true})[i].id,
                    name: "AWSremove",
                    visibleto: "all",
                    action: "!aws remove"
                });
                break;
            };
        };
    };
    if (findObjs({_type: "macro", name: "AWSlist"}, {caseInsensitive: true})[0] === undefined) {
        for (let i = 0; i < findObjs({_type: "player", _online: true}).length; i++) { // for every online player:
            if (playerIsGM(findObjs({_type: "player", _online: true})[i].id)) { // if there is not a macro and an online player is gm, create macro as player
                sendChat(AST_name, "/w gm Created **AWSlist** macro.");
                createObj("macro", {
                    playerid: findObjs({_type: "player", _online: true})[i].id,
                    name: "AWSlist",
                    visibleto: "all",
                    action: "!aws list"
                });
                break;
            };
        };
    };
    if (findObjs({_type: "macro", name: "AWSpopulate"}, {caseInsensitive: true})[0] === undefined) {
        for (let i = 0; i < findObjs({_type: "player", _online: true}).length; i++) { // for every online player:
            if (playerIsGM(findObjs({_type: "player", _online: true})[i].id)) { // if there is not a macro and an online player is gm, create macro as player
                sendChat(AST_name, "/w gm Created **AWSpopulate** macro.");
                createObj("macro", {
                    playerid: findObjs({_type: "player", _online: true})[i].id,
                    name: "AWSpopulate",
                    visibleto: "all",
                    action: "!aws populate"
                });
                break;
            };
        };
    };

    //message catch
    on("chat:message", function (msg) {
        if (msg.type === "api" && msg.content.split(' ')[0] === "!aws") {
            // if message type is API && when split with spaces, the first part is !aws && a token is selected
            let playerName = msg.who.substring(0, (msg.who+' ').indexOf(' '));
            if (AWS_notifyGM) {sendChat(AWS_name, "/w gm -AWS in use by "+playerName+"-");} // notify gm of usage
            sendChat(AWS_name, "/w "+playerName+" ---AWS---"); // clear a line
            if (msg.selected !== undefined && msg.content.split(' ') !== 'list' && msg.content.split(' ')[1] !== 'populate' && (msg.content.split(' ')[1] !== 'remove' || msg.content.split(' ', 3)[2] === undefined)) {
                if (msg.selected[0]._type === "graphic") { // if selected object is token
                    if (msg.selected.length === 1 || msg.content.split(' ')[1] === 'add' || msg.content.split(' ')[1] === 'remove' || msg.content.split(' ')[1] === 'list') {
                        let token = getObj(msg.selected[0]._type, msg.selected[0]._id);
                        let char = getObj("character", token.get("represents"));
                        if (AWS_debug) {log("Token= "+token.get("name")+" | Character= "+char.get("name")+" | Controlled By= "+char.get("controlledby"))}
                        if (playerIsGM(msg.playerid) || char.get("controlledby").search("all") || char.get("controlledby").search(msg.who)) {
                        // if the player using macro controls the token they select OR is a gm
                            AutomaticWildShape(msg, token, char);
                        } else {
                            sendChat(AWS_error, "/w "+playerName+" You must be a GM or control the selected token to use the AWS API. Error code 9.");
                            log(AWS_error+" Player who did not control token tried to Wild-Shape it. Error Code 9.");
                            return;
                        };
                    } else {
                        sendChat(AWS_error, "/w "+playerName+" Only one token may be selected. Error Code 7.");
                        log(AWS_error+" Too many tokens selected. Error Code 7.");
                        return;
                    }
                } else {
                    sendChat(AWS_error, "/w "+playerName+" The object you've selected is not a token. Error code 8.");
                    log(AWS_error+" Non-token object selected. Error code 8.");
                    return;
                }
            } else if (msg.content.split(' ')[1] === 'list') {
                AutomaticWildShape(msg, [{name:'mask'}], [{name:'mask'}]);
            } else if (msg.content.split(' ')[1] === 'populate' && playerIsGM(msg.playerid)) {
                AutomaticWildShape(msg, [{name:'mask'}], [{name:'mask'}]);
            } else if (msg.content.split(' ', 3)[1] === 'remove' && msg.content.split(' ', 3)[2] !== undefined && playerIsGM(msg.playerid)) {
                AutomaticWildShape(msg, [{name:'mask'}], [{name:'mask'}]);
            } else if (msg.content.split(' ')[1] === 'populate' && !playerIsGM(msg.playerid)) {
                sendChat(AWS_error, "/w "+playerName+" Only a GM can use this command. Error code 22.");
                log(AWS_log+" Only a GM can use 'populate' command. Error code 22.");
                return;
            } else if (msg.content.split(' ', 3)[1] === 'remove' && msg.content.split(' ', 3)[2] !== undefined && !playerIsGM(msg.playerid)) {
                sendChat(AWS_error, "/w "+playerName+" Only a GM can use this command. Error code 31.");
                log(AWS_log+" Only a GM can use 'remove <beast name>' command. Error code 31.");
                return;
            } else if (msg.selected === undefined) {
                sendChat(AWS_error, "/w "+playerName+" No token selected. Error Code 0.");
                log(AWS_log+" No Token Selected. Error Code 0.");
                return;
            };
        };
    });

    function AutomaticWildShape(msg, token, char) {
        if (AWS_debug) {log("AWS Main function called.")};
    
        // message split-up
        let parts = msg.content.split(' ', 2); // split incoming message into 2 parts
    
        // objects setup
        let playerName = msg.who.substring(0, (msg.who+' ').indexOf(' ')); // player's first name
        let charName;
        let charFirstName;
        if (msg.content.split(' ')[1] !== 'list' && msg.content.split(' ')[1] !== 'populate' && msg.content.split(' ', 3)[2] === undefined) {
            if (token.get("represents") === undefined)  { // if token does not represent a character sheet.
                sendChat(AWS_error, "/w "+playerName+" The selected token does not represent a character sheet. Error code 5.");
                log(AWS_debug+" Found that token.get('represents') returned undefined. Error code 5.");
                return;
            } // TODO - Let tokens with no sheet transform as per this api
            charName = char.get("name");
            charFirstName = charName.substring(0, (charName+" ").indexOf(" "));
        }

        // override check
        if (getAttrByName(char.id, 'aws_override') == 1 && getAttrByName(char.id, 'npc') != 1) {
            sendChat(AWS_name, `/w gm ---**PLAYER IS USING AWS OVERRIDE**---`);
        }
            
        // Make list of beast names
        let beastList;
        beastList = makeBeastList(msg);
    
        // read message, filter actions based on content
        log(`Got to command filter.`);
        if (parts[1]) { // if there is more than 1 part
            switch (parts[1]) {
                case 'end':
                    revert(playerName, token);
                    break;
    
                case 'add':
                    addBeast(msg, playerName);
                    break;

                case 'remove':
                    removeBeast(msg, playerName);
                    break;

                case 'list':
                    listBeasts(beastList, playerName);
                    break;

                case 'populate':
                    populate(playerName);
                    break;
    
                default: // if part 2 is likely a beast name, check name against the beastList. If found, transform.
                    parts[1] = msg.content.replace(parts[0]+' ', ''); // make parts[1] into a string of that beast's name
                    let msgBeast;
                    if (findObjs({_type: 'character', name: parts[1]}, {caseInsensitive: true})[0] !== undefined) { // if a sheet is grabbed when name is filter
                        msgBeast = findObjs({_type: 'character', name: parts[1]}, {caseInsensitive: true})[0]; // get id of beast by name
                        let charLevel = getDruid(char, playerName, 'level');
                        let charSubclass = getDruid(char, playerName, 'subclass');
                        let charFilter;
                        let beastFilter;
                        if (charSubclass && charLevel){
                            charFilter = getCRlimit(char, charLevel, charSubclass, 'filter');// get char crFilter
                            beastFilter = getBeastCR(msgBeast.id, 'filter'); // get beast crFilter
                        } else {
                            return;
                        }
                        if (beastList.filter(beast => beast.id == msgBeast.id)[0] !== undefined) { // if the beast's ID is in the list of WS beast's IDs and the character is a druid of high enough level
                            if (beastFilter <= charFilter) { // if player filter is more than or equal to beast filter
                                transform(playerName, token, char, msgBeast.id); // activate transform function and send it beast ID
                            } else {
                                sendChat(AWS_error, `/w `+playerName+` Your level is too low to transform into a '`+parts[1]+`'. Error code 44.`);
                                log(`Your level is too low to transform into a '`+parts[1]+`'. Error code 44.`);
                                return;
                            }
                        } else {
                            sendChat(AWS_error, `/w `+playerName+` Could not find beast '`+parts[1]+`' in BeastList. Add that beast by using the AWSadd command on its token. Error code 6.`);
                            log(`Could not find creature '`+parts[1]+`' in BeastList. Error code 6.`);
                            return;
                        }
                    } else {
                        sendChat(AWS_error, `/w `+playerName+` Could not find beast '`+parts[1]+`' in Journal. Error code 35.`);
                        log(`Could not find creature '`+parts[1]+`' in Journal. Error code 35.`);
                        return;
                    }
                    break;
            }
        } else { // check class & level and post filtered wild shape options to chat
            //debug
            if (AWS_debug) {log(AWS_log+"Reached beastListToChat() function caller.")}
    
            let charLevel = getDruid(char, playerName, 'level');
            if (!charLevel) { // stop here if they didn't pass druid checks.
                return;
            }
            let charSubclass = getDruid(char, playerName, 'subclass');
            beastListToChat(beastList, char, charFirstName, charLevel, charSubclass, playerName); 
        }
    }
    
    // --- FUNCTIONS ---
    function makeBeastList(msg) {
        //debug
        if (AWS_debug) {log(AWS_log+"makeBeastList() function called.")};
        let x = 1;
    
        // compile array of beast names based on "ws" attribute existence
        let beastArray = [];
        let entry = 0;
        _.each(findObjs({_type: "character"}), function(sheet) { // for every object of type character in game
            //debug
            if (AWS_debug) {log("Sheet "+x+" ID: "+sheet.id+" | Sheet "+x+" name: "+sheet.get("name"))};
    
            if (findObjs({ // if the attribute "ws" exists
                _characterid: sheet.id,
                _type: "attribute",
                name: "ws"
            }, {caseInsensitive: true})[0] !== undefined) {
                //debug
                log(AWS_log+"Accepted Sheet Name: "+sheet.get("name")+" | Accepted Sheet ID: "+sheet.id+" | Accepted Sheet WS Attr Val: "+getAttrByName(sheet.id, "ws"));

                let beast = {
                    id: sheet.id,
                    name: sheet.get('name'),
                    cr: getBeastCR(sheet.id, 'cr'),
                    filter: getBeastCR(sheet.id, 'filter'),
                    sheet: sheet
                }
                beastArray.push(beast);
                entry++;
            }
    
            //debug
            x++;
        })
        //debug
        if (AWS_debug) {
            for (let i = 0; i < beastArray.length; i++) {
                log(`beastArray[`+i+`].name: `+beastArray[i].name)
            }
        }

        //sort
        log('hit array sorter')
        beastArray.sort((a,b) => (a.name > b.name) ? 1 : -1);
        beastArray.sort((a, b) => a.filter - b.filter);
    
        // if no ids, return error. else return ids.
        if (beastArray.length > 0) {
            return beastArray; // return array of beast objects
        } else if (beastArray < 1) {
            log("No wild shape sheets found. Error code 3.");
            return;
        }
    }
    
    function beastListToChat(beastList, char, charName, charLevel, charSubclass, playerName) {
        //debug
        if (AWS_debug) {log(AWS_log+"beastListToChat() function called.")};
    
        let crFilter = getCRlimit(char, charLevel, charSubclass, 'filter');
        let crLimit = getCRlimit(char, charLevel, charSubclass, 'limit');

        if (!crFilter || crFilter == undefined || !crLimit || crLimit == undefined) {
            sendChat(AWS_name, `/w `+playerName+` No Druid class found. Error code 39.`);
            log(AWS_log+`No Druid class found. Error code 39.`)
            return;

        } else {
            // Cull beastList by CR
            let finalBeasts = [];
            _.each(beastList, function(beast) {
                if (!isNaN(beast.filter) && beast.filter <= crFilter) {finalBeasts.push(beast)}; 
                // if the value of beast's CR is a number & less than the PC's crLimit, add to finalBeasts array
                log(`beastName: `+getAttrByName(beast.id, 'npc_name')+` | beastCR: `+beast.cr+` | beastFilter: `+beast.filter+` | crFilter: `+crFilter+` | beastFilter <= crFilter: `+(+beast.filter <= +crFilter))
            });

            //make sure at least one beast got through check
            if (finalBeasts[0] === undefined) {
                sendChat(AWS_name, `/w `+playerName+` No Beasts in BeastList of appropiate CR. Error code 20.`);
                log(AWS_log+`No Beasts in BeastList of appropiate CR. Error code 20.`)
                return;
            }
        
            // Compose Chat Message
            let outputList = " &{template:default} {{name=SELECT WILD SHAPE}}"
            let i = 0;
            _.each(finalBeasts, function(beast) {
                beast.name = getAttrByName(beast.id, "npc_name");
                beast.cr = getAttrByName(beast.id, 'npc_challenge');
        
                if (beast.name !== undefined) {
                    //debug
                    if (AWS_debug) {log(AWS_log+'Beast '+(i+1)+', Name: '+beast.name+', added to chat output.')};
        
                    if (i % 2 === 0) { // if first half of macro
                        outputList = outputList.concat(" {{["+beast.name+" (CR"+beast.cr+")](!<br>aws "+beast.name+") = ");
                    } else { // if second half of macro
                        outputList = outputList.concat("["+beast.name+" (CR"+beast.cr+")](!<br>aws "+beast.name+")}}");
                    }
                    i++;
                    if (i === finalBeasts.length && i % 2 !== 0) { // if final entry just went through on first part of macro
                        outputList = outputList.concat("}}"); // close macro
                    };
                } else {
                    sendChat(AWS_error, "No usable name found for wild shape sheet "+(i+1)+". Error code 12.");
                    log(AWS_log+"No usable name found for wild shape sheet "+(i+1)+". Error code 12.");
                    return;
                }
            });
        
            // Chat Output Part 1, CR limit and intro
            sendChat(AWS_name, "/w "+playerName+" Please select a beast of **CR "+crLimit+" or lower** from the following list:");
        
            // Chat Output Part 2, Beast List
            sendChat(AWS_name, "/w "+playerName + outputList);
            
            log(AWS_log+`List of creatures posted for character `+charName)
        }
    }
    
    function transform(playerName, pcToken, pcSheet, beastID) {
        //debug
        if (AWS_debug) {log(AWS_log+"transform() function called. With "+getObj('character', beastID).get('name')+' as beast.')};

        let beast = getObj('character', beastID);
        let campaign = getObj('campaign', 'root');
        let playerPageID = campaign.get('playerpageid');

        //create new beast
        let wildSheet = createObj('character', {name: pcSheet.get(`name`)+` as `+beast.get(`name`), avatar: beast.get(`avatar`)});
        sendChat(AWS_name, pcSheet.get('name')+` wild-shaped into a `+beast.get('name')+`.`);
        let beastAttrs = findObjs({_type: 'attribute', _characterid: beast.id});
    
        if (beastAttrs[0] !== undefined) {
            for (let i = 0; i < beastAttrs.length; i++) {
                //for ever attribute on old beast sheet, duplicate onto new beast sheet
                createObj('attribute', {
                    _characterid: wildSheet.id,
                    name: beastAttrs[i].get('name'),
                    current: beastAttrs[i].get('current'),
                    max: beastAttrs[i].get('max')
                });
            }

            // create '!aws end' ability
            createObj('ability', {
                _characterid: wildSheet.id,
                name: `~EndWildShape`,
                action: `!aws end`,
                istokenaction: true
            })

            // remove 'ws' attribute
            findObjs({_type: 'attribute', _characterid: wildSheet.id, name: 'ws'})[0].remove();

            // set int, wis, and cha
            setAttr('intelligence');
            setAttr('wisdom');
            setAttr('charisma');

            function setAttr (attr) {
                findObjs({_type: 'attribute', _characterid: wildSheet.id, name: attr})[0].set('current', getAttrByName(pcSheet.id, attr));
                findObjs({_type: 'attribute', _characterid: wildSheet.id, name: attr+'_mod'})[0].set('current', getAttrByName(pcSheet.id, attr+'_mod'));
            }

            // list of all skill attributes
            let allSkills = [
                'strength_save', 'dexterity_save', 'constitution_save', 'intelligence_save', 'wisdom_save', 'charisma_save', 'athletics', 'acrobatics', 'sleight_of_hand', 
                'stealth', 'arcana', 'history', 'investigation', 'nature', 'religion', 'animal_handling', 'insight', 'medicine', 'perception', 'survival', 
                'deception', 'intimidation', 'performance', 'persuasion'
            ];

            // go through the list of all skill attributes and only keep attributes that the player is proficient in
            let profSkills = [];
            for (let i = 0; i < allSkills.length; i++) {
                if (getAttrByName(pcSheet.id, allSkills[i]+'_prof') !== undefined && getAttrByName(pcSheet.id, allSkills[i]+'_prof') != 0) {
                    profSkills.push(allSkills[i]);
                }
            }

            // set skill categories by attribute
            let strSkills = ['strength_save', 'athletics'];
            let dexSkills = ['dexterity_save', 'acrobatics', 'sleight_of_hand', 'stealth'];
            let conSkills = ['constitution_save'];
            let intSkills = ['intelligence_save', 'arcana', 'history', 'investigation', 'nature', 'religion'];
            let wisSkills = ['wisdom_save', 'animal_handling','insight', 'medicine', 'perception', 'survival'];
            let chaSkills = ['charisma_save', 'deception', 'intimidation', 'performance', 'persuasion'];

            let attr;
            // for every skill the character is proficient in,
            for (let i = 0; i < profSkills.length; i++) { 

                // find the relevant attribute and set the attribute as 'attr'
                if (strSkills.indexOf(profSkills[i]) != -1) { 
                    attr = 'strength_mod';
                } else if (dexSkills.indexOf(profSkills[i]) != -1) {
                    attr = 'dexterity_mod';
                } else if (conSkills.indexOf(profSkills[i]) != -1) {
                    attr = 'constitution_mod';
                } else if (intSkills.indexOf(profSkills[i]) != -1) {
                    attr = 'intelligence_mod';
                } else if (wisSkills.indexOf(profSkills[i]) != -1) {
                    attr = 'wisdom_mod';
                } else if (chaSkills.indexOf(profSkills[i]) != -1) {
                    attr = 'charisma_mod';
                } else {
                    sendChat('', 'ERROR, skill not found in skill arrays. Error code 18.');
                    log ('ERROR, skill not found in skill arrays. Error code 18.');
                    return;
                }

                let beastAttrMod = getAttrByName(wildSheet.id, attr);
                let skill = npcSave('npc_'+profSkills[i]);
                let skillBonus;
                if (isNaN(getAttrByName(wildSheet.id, skill))) {
                    skillBonus = beastAttrMod;
                } else {
                    skillBonus = getAttrByName(wildSheet.id, skill);
                }
                let charPB = getAttrByName(pcSheet.id, 'pb');
                let beastPB = skillBonus - beastAttrMod;
                
                // if (character's proficiency bonus for skill) is higher than (beast's proficiency bonus for skill)
                if (beastPB === NaN || charPB > beastPB) {
                    // use the character's prof bonus + beast's attr bonus
                    findObjs({_type: 'attribute', _characterid: wildSheet.id, name: skill})[0].set('current', +charPB + +beastAttrMod);
                    // make that skill visible on beast sheet
                    findObjs({_type: 'attribute', _characterid: wildSheet.id, name: skill+'_flag'})[0].set('current', 1);
                }

                // Change saving throws to npc styled saving throws ('dexterity_save' => 'dex_save')
                function npcSave(attr) {

                    if (attr.indexOf("_save") != -1) {
                        attr = attr.replace('ength','');
                        attr = attr.replace('terity','');
                        attr = attr.replace('stitution','');
                        attr = attr.replace('elligence','');
                        attr = attr.replace('dom','');
                        attr = attr.replace('risma','');
                    }
                    return attr;
                }
            }

        } else {
            sendChat(AWS_name, `/w `+playerName+` No attributes found for beast sheet. Error code 17.`)
            log(AWS_log+'No attributes found for beast sheet. Error code 17.')
            return;
        }

        beast.get('_defaulttoken', function(o) {

            if (o == 'null') {
                sendChat(AWS_name, '/w '+playerName+' ERROR: Beast sheet has no default token. Error code 21.');
                sendChat(AWS_name, `/w `+playerName+` Character '`+wildSheet.get('name')+`' deleted.`);
                wildSheet.remove();
                log(AWS_log+'ERROR: Beast sheet has no default token. Error code 21.');
                return;
                
            } else {
                let obj = JSON.parse(o);
                
                if (playerPageID === undefined || pcToken.get('name') === undefined || beast.get('name') === undefined) {
                    sendChat(AWS_error, `/w `+playerName+` Some parts of WildShape default token were incorrectly prepared. Try re-setting default token and ensuring both character token and wild-shape token have names set. Error code 24.`);
                    sendChat(AWS_name, `/w `+playerName+` Character '`+wildSheet.get('name')+`' deleted.`);
                    wildSheet.remove();
                    log(AWS_log+`Error code 24.`);
                    return;

                } else {
                    //token setup
                    obj._pageid = playerPageID;
                    obj.name = pcToken.get('name')+' ('+beast.get('name')+')';
                    obj.layer = pcToken.get('layer');
                    obj.left = pcToken.get('left');
                    obj.top = pcToken.get('top');
                    if (AWS_hpbar <= 3 && AWS_hpbar >= 1) {
                        if (getAttrByName(beastID, 'hp', 'max')) {
                            obj[`bar${AWS_hpbar}_max`] = getAttrByName(beastID, 'hp', 'max');
                            obj[`bar${AWS_hpbar}_value`] = obj[`bar${AWS_hpbar}_max`];
                        } else if (obj[`bar${AWS_hpbar}_max`]) {
                            obj[`bar${AWS_hpbar}_value`] = obj[`bar${AWS_hpbar}_max`];
                        } else {
                            sendChat(AWS_error, `/w `+playerName+` Some parts of WildShape default token were incorrectly prepared. Try re-setting default token and ensuring both character token and wild-shape token have names set. Error code 25.`);
                            sendChat(AWS_name, `/w `+playerName+` Character '`+wildSheet.get('name')+`' deleted.`);
                            wildSheet.remove();
                            log(AWS_log+`Error code 25.`);
                            return;
                        }
                    } else {
                        sendChat(AWS_error, `/w `+playerName+` Variable 'aws_hpbar' incorrectly set. Please see variables at the top of AutomaticWildShape API. Error code 26.`);
                        sendChat(AWS_name, `/w `+playerName+` Character '`+wildSheet.get('name')+`' deleted.`);
                        wildSheet.remove();
                        log(AWS_log+`Variable 'aws_hpbar' incorrectly set. Must be 1, 2, or 3. Error code 26.`);
                        return;
                    }
                    obj.represents = wildSheet.id;

                    //size setup
                    if (getAttrByName(beast.id, 'npc_type').search(/tiny/i) != -1) {
                        if (AWS_debug) {log(`Creature is tiny.`)}
                        obj.height = pcToken.get('height') / 2;
                        obj.width = pcToken.get('width') / 2;
                    } else if (getAttrByName(beast.id, 'npc_type').search(/large/i) != -1) {
                        if (AWS_debug) {log(`Creature is large.`)}
                        obj.height = pcToken.get('height') * 2;
                        obj.width = pcToken.get('width') * 2;
                    } else if (getAttrByName(beast.id, 'npc_type').search(/huge/i) != -1) {
                        if (AWS_debug) {log(`Creature is huge.`)}
                        obj.height = pcToken.get('height') * 3;
                        obj.width = pcToken.get('width') * 3;
                    }

                    //img setup
                    let img = obj.imgsrc;
                    img = img.replace("max.", "thumb.");
                    img = img.replace("med.", "thumb.");
                    img = img.replace("min.", "thumb.");
                    obj.imgsrc = img;
            
                    //place token
                    let wildToken = createObj('graphic', obj);
                    if (wildToken === undefined) {
                        sendChat(AWS_error, '/w '+playerName+' Tokens must be uploaded for the AWS API to work. Error code 23.')
                        sendChat(AWS_name, `/w `+playerName+` Character '`+wildSheet.get('name')+`' deleted.`);
                        wildSheet.remove();
                        log(AWS_log+'Tokens must be uploaded for the AWS API to work. Error code 23.')
                        return;
                    } else {
                        toFront(wildToken);
                        setDefaultTokenForCharacter(wildSheet, wildToken);
        
                        //delete old token
                        pcToken.remove();
                    }
                }
            }

        });
    };
    
    function revert(playerName, token) {
        //debug
        if (AWS_debug) {log(AWS_log+"revert() function called.")};
        
        let ws = getObj('character', token.get('represents'));
        let wsName = ws.get('name');
        let campaign = getObj('campaign', 'root');
        let playerPage = campaign.get('playerpageid');
        let charName = wsName.replace(' as '+getAttrByName(ws.id, 'npc_name'), '');

        if (findObjs({_type: 'character', name: charName})[0] !== undefined) {
            let char = findObjs({_type: 'character', name: charName})[0];

            if(findObjs({_type: 'character', name: charName}).length > 1) {
                sendChat(AWS_error, '/w '+playerName+' Multiple characters named '+charName+' found. Error code 34.');
                log(AWS_log+'Multiple characters named '+charName+' found. Error code 34.');
                return;
            } else if (wsName.search(' as '+getAttrByName(ws.id, 'npc_name')) === -1) {
                sendChat(AWS_error, `/w `+playerName+` Character '`+charName+`' is not in Wild Shape. Error code 36.`);
                log(AWS_log+`Character '`+charName+`' is not in Wild Shape. Error code 36.`);
                return;
            } else if (findObjs({_type: 'character', name: charName}).length < 1) {
                sendChat(AWS_error, '/w '+playerName+' No characters named '+charName+' found. Error code 35.');
                log(AWS_log+'No characters named '+charName+' found. Error code 35.');
                return;
            }

            //place token
            char.get('_defaulttoken', function(o) {

                let obj = JSON.parse(o);

                //token setup
                obj._pageid = playerPage;
                obj.layer = token.get('layer');
                obj.left = token.get('left');
                obj.top = token.get('top');
                if (AWS_hpbar <= 3 && AWS_hpbar >= 1) {
                    obj[`bar${AWS_hpbar}_value`] = getAttrByName(char.id, 'hp');
                } else {
                    sendChat(AWS_error, `/w `+playerName+` Variable 'aws_hpbar' incorrectly set. Please see variables at the top of AutomaticWildShape API. Error code 32.`);
                    sendChat(AWS_name, `/w `+playerName+` Character '`+wildSheet.get('name')+`' deleted.`);
                    wildSheet.remove();
                    log(AWS_log+`Variable 'aws_hpbar' incorrectly set. Must be 1, 2, or 3. Error code 32.`);
                    return;
                }

                //img setup
                let img = obj.imgsrc;
                img = img.replace("max.", "thumb.");
                img = img.replace("med.", "thumb.");
                img = img.replace("min.", "thumb.");
                obj.imgsrc = img;

                let charToken = createObj('graphic', obj);
                toFront(charToken);
                

                //HP calc
                let tokenHP = token.get('bar'+AWS_hpbar+'_value');
                let charHP = getAttrByName(char.id, 'hp');
                let newHP = +charHP;
                let chatHP = '';
                if (tokenHP < 0) { // if token HP is negative, apply it to char hp
                    newHP = +charHP + +tokenHP;
                    chatHP = ` and they lost [[`+String(tokenHP).replace('-', '')+`]] hit points due to the damage they took in wild shape.`;
                };
                sendChat(AWS_name, charName+`'s wild shape ended`+chatHP+`.`);

                setTimeout(function(){
                    charToken.set('bar'+AWS_hpbar+'_value', newHP);
                }, 50);

                //delete old token & sheet
                ws.remove();
                token.remove();
            });
        } else {
            sendChat(AWS_name, `/w `+playerName+` No characters found with name '`+charName+`'. Error code 19.`);
            log(AWS_log+`No characters found with name '`+charName+`'. Error code 19.`);
            return;
        }
    }
    
    function addBeast(msg, playerName) {
        //debug
        if (AWS_debug) {log(AWS_log+"addBeast() function called.")};
    
        _.each(msg.selected, function(obj) {
            let beastToken = getObj(obj._type, obj._id);
            let beast = getObj('character', beastToken.get('represents')) // TODO stop sheets getting added if they have no default token
    
            if (getAttrByName(beast.id, 'ws') === undefined || getAttrByName(beast.id, 'ws') != 1) {
                beast.get('_defaulttoken', function (o) {
                    if (o == 'null') {sendChat(AWS_name, '/w '+playerName+' **WARNING: '+beast.get('name')+' (CR '+getAttrByName(beast.id, "npc_challenge")+') has no default token.**')}
                    createObj("attribute", {
                        _characterid: beast.id,
                        name: 'ws',
                        current: '1'
                    });
                    sendChat(AWS_name, '/w '+playerName+' '+beast.get('name')+' (CR '+getAttrByName(beast.id, "npc_challenge")+') has been added to the available Wild Shapes.');
                    return;
                })
                
            } else {
                sendChat(AWS_error, '/w '+playerName+' '+beast.get('name')+' (CR '+getAttrByName(beast.id, "npc_challenge")+') is already amongst the available Wild Shapes. Error code 15.');
                log(AWS_log+beast.get('name')+' (CR '+getAttrByName(beast.id, "npc_challenge")+') is already amongst the available Wild Shapes. Error code 15.');
                return;
            }
        })
    }
    
    function removeBeast(msg, playerName) {
        //debug
        if (AWS_debug) {log(AWS_log+"removeBeast() function called.")};
    
        if(!msg.content.split(' ', 3)[2] || msg.content.split(' ', 3)[2] == undefined) { // if no beast name was supplied with remove command
            _.each(msg.selected, function(obj) {
                let beastToken = getObj(obj._type, obj._id);
                let beast;
                if (beastToken.get('represents')) {
                    beast = getObj('character', beastToken.get('represents'));
        
                    if (beast !== undefined) {
                        log('Attempting to Remove '+beast.get('name')+', with WS value: '+getAttrByName(beast.id, 'ws'));
                
                        if (getAttrByName(beast.id, 'ws') !== undefined) {
                            findObjs({_type: 'attribute', _characterid: beast.id, name: 'ws'}, {caseInsensitive: true})[0].remove();
                            sendChat(AWS_name, '/w '+playerName+' '+beast.get('name')+' (CR '+getAttrByName(beast.id, "npc_challenge")+') has been removed from the available Wild Shapes.');
                            return;
                        } else {
                            sendChat(AWS_error, `/w `+playerName+` `+beast.get(`name`)+` (CR `+getAttrByName(beast.id, "npc_challenge")+`) is not amongst the available Wild Shapes, and so can't be removed from the Wild Shapes list. Error code 16.`);
                            log(AWS_log+beast.get(`name`)+` (CR `+getAttrByName(beast.id, "npc_challenge")+`) is not amongst the available Wild Shapes, and so can't be removed from the Wild Shapes list. Error code 16.`);
                            return;
                        }
                    } else {
                        sendChat(AWS_error, `/w `+playerName+` `+beast.get(`name`)+` (CR `+getAttrByName(beast.id, "npc_challenge")+`) is not amongst the available Wild Shapes, and so can't be removed from the Wild Shapes list. Error code 13.`);
                        log(AWS_log+beast.get(`name`)+` (CR `+getAttrByName(beast.id, "npc_challenge")+`) is not amongst the available Wild Shapes, and so can't be removed from the Wild Shapes list. Error code 13.`);
                        return;
                    }
                } else {
                    sendChat(AWS_error, `/w `+playerName+` A selected beast's sheet could not be identified. Please ensure all selected tokens represent their sheets. Error code 30.`);
                    log(AWS_log+`A selected beast's sheet could not be identified. Please ensure all selected tokens represent their sheets. Error code 30.`);
                }
            })
        } else { // if beast name was supplied by text with remove command
            let beastName = "";
            for (let i = 2; i < msg.content.split(' ').length; i++) {
                beastName = beastName.concat(msg.content.split(' ')[i])+" ";
            }
            beastName = beastName.trim();
            let beast;
            if (findObjs({_type: 'character', name: beastName})[0] != undefined) {
                beast = findObjs({_type: 'character', name: beastName})[0];
                if (getAttrByName(beast.id, 'ws') !== undefined) {
                    findObjs({_type: 'attribute', _characterid: beast.id, name: 'ws'}, {caseInsensitive: true})[0].remove();
                    sendChat(AWS_name, '/w '+playerName+' '+beast.get('name')+' (CR '+getAttrByName(beast.id, "npc_challenge")+') has been removed from the available Wild Shapes.');
                    return;
                } else {
                    sendChat(AWS_error, `/w `+playerName+` `+beast.get(`name`)+` (CR `+getAttrByName(beast.id, "npc_challenge")+`) is not amongst the available Wild Shapes, and so can't be removed from the Wild Shapes list. Error code 33.`);
                    log(AWS_log+beast.get(`name`)+` (CR `+getAttrByName(beast.id, "npc_challenge")+`) is not amongst the available Wild Shapes, and so can't be removed from the Wild Shapes list. Error code 33.`);
                    return;
                }
            } else {
                sendChat(AWS_error, `/w `+playerName+` Sheet for beast `+beastName+` could not be found. Please ensure all selected tokens represent their sheets or that the beast name was spelt correctly. Error code 28.`);
                log(AWS_log+`Sheet for beast `+beastName+` could not be found via token.represents of find by name. Error code 28.`);
                return;
            }
        }
    }
    
    function listBeasts(beastList, playerName) {
        //debug
        if (AWS_debug) {log(AWS_log+"listBeasts() function called.")};

        if (beastList == undefined || beastList.length == 0){
            sendChat(AWS_name, `/w `+playerName+` No Beasts in BeastList. Error code 29.`);
            log(AWS_log+`No Beasts in BeastList. Error code 29.`)
            return;
        } else {
            let msg = '/w '+playerName+' &{template:default} {{name=**All WildShape Beasts**}}';
            let i = 0;
            _.each(beastList, function(beast) {
                msg = msg.concat(' {{Beast '+(i+1)+' = '+beast.name+', CR: '+beast.cr+' [X](!<br>aws remove '+beast.name+')}}');
                i++;
            })
            sendChat(AWS_name, msg)
        }
    }

    function populate(playerName) {
        //debug
        if (AWS_debug) {log(AWS_log+"populate() function called.")};

        _.each(findObjs({_type: 'character'}), function(sheet) {
            if (getAttrByName(sheet.id, 'npc_type') !== undefined) { // if there's an attribute 'npc_type'
                if (getAttrByName(sheet.id, 'npc_type').search(/beast/i) != -1) { // if that attribute contains 'beast'
                    if (getAttrByName(sheet.id, 'ws') === undefined || getAttrByName(sheet.id, 'ws') != 1) {
                        sheet.get('_defaulttoken', function(o){
                            if(o != 'null') {
                                log(sheet.get('name')+`got into creation area <---`)
                                log(sheet.get('name')+` 'o': `+o)
                                createObj('attribute', {
                                    _characterid: sheet.id,
                                    name: 'ws',
                                    current: '1'
                                });
                                sendChat(AWS_name, `/w `+playerName+` '`+sheet.get('name')+`' added to the Wild Shape list.`);
                            } else {
                                sendChat(AWS_name, `/w `+playerName+` **'`+sheet.get('name')+`' can't be added to the Wild Shape list because the sheet has no default token.** Error code 27.`);
                                log(AWS_log+sheet.get('name')+`' can't be added to the Wild Shape list because the sheet has no default token. Error code 27.`);
                            }
                        })
                    }
                }
            }
        })
    }

    function getCRlimit(char, charLevel, charSubclass, option) {
        //debug
        if (AWS_debug) {log(AWS_log+"getCRlimit() function called.")};
    
        //moonDruid setup
        let subclass = charSubclass;
        let moonDruid = false;
        if (subclass) {
            if (subclass.search(/moon/i) !== -1) {moonDruid = true}; // if "moon" is in the subclass attribute (ignoring caps), moonDruid = true
            //debug
            if(AWS_debug){log(AWS_log+`MoonDruid = true`)}
        }
    
        //cr limit setup
        let crLimit;
        let crFilter;
        if (getAttrByName(char.id, 'aws_override') == 1) {
            //debug
            if (AWS_debug) {log(AWS_log+`Selected token can take any wild shape.`)}

            crLimit = 99;
            crFilter = 99;
        } else if (moonDruid && charLevel >= 6) {
            //debug
            if (AWS_debug) {log(AWS_log+"Selected token represents a Moon Druid of at least 2nd level.")};
    
            crLimit = Math.floor(Math.max(charLevel/3, 1));
            crFilter = crLimit;
        } else {
            //debug
            if (AWS_debug) {log(AWS_log+"Selected token represents a Druid of at least 2nd level (may or may not be a Moon druid, it doesn't affect CR limit until 6th level).")};

            if (charLevel >= 8) {
                crLimit = "1";
                crFilter = 1;
            } else if (charLevel >= 4) {
                crLimit = "1/2";
                crFilter = .5;
            } else {
                crLimit = "1/4";
                crFilter = .2;
            }
        };
        switch (option) {
            case 'filter':
                return crFilter;
            case 'limit':
                return crLimit;
            default: 
                log(AWS_log+`Error code 40.`);
        }
    }

    function getBeastCR(beastID, option) {
        //debug
        if (AWS_debug) {log(AWS_log+"getBeastCR() function called.")};

        let beastCR = getAttrByName(beastID, "npc_challenge");
        let beastFilter;
        switch (beastCR) {
            case '1/8':
                beastFilter = .1;
                break;
            case '1/4':
                beastFilter = .2;
                break;
            case '1/2':
                beastFilter = .5;
                break;
            default:
                beastFilter = beastCR;
                break;
        }

        switch(option){
            case 'cr':
                return beastCR;
            case 'filter':
                return beastFilter;
            default:
                log(AWS_log+`Error code 41.`)
        }
    }

    function getDruid(char, playerName, option) {
        //debug
        if (AWS_debug) {log(AWS_log+"getDruid() function called.")}

        let charLevel;
        let charLevelAttr;
        let charClass;
        let charClassAttr;
        let charClassArr = []; // array of all possible class attribute locations
        if (getAttrByName(char.id, "class") !== undefined) {charClassArr.push(getAttrByName(char.id, "class"))};
        if (getAttrByName(char.id, "multiclass1") !== undefined) {
            if (getAttrByName(char.id, "multiclass1_flag") == 1) {charClassArr.push(getAttrByName(char.id, "multiclass1"))};
        }
        if (getAttrByName(char.id, "multiclass2") !== undefined) {
            if (getAttrByName(char.id, "multiclass1_flag") == 1) {charClassArr.push(getAttrByName(char.id, "multiclass2"))};
        }
        if (getAttrByName(char.id, "multiclass3") !== undefined) {
            if (getAttrByName(char.id, "multiclass1_flag") == 1) {charClassArr.push(getAttrByName(char.id, "multiclass3"))};
        }
        if (getAttrByName(char.id, "multiclass4") !== undefined) {
            if (getAttrByName(char.id, "multiclass1_flag") == 1) {charClassArr.push(getAttrByName(char.id, "multiclass4"))};
        }
        let charSubclassAttr;
        let charSubclass;

        let druidClassIndex;
        for (let i = 0; i < charClassArr.length; i++) { // find if any class attribute contains "druid". keep the first.
            if (charClassArr[i].search(/druid/i) !== -1 || getAttrByName(char.id, 'aws_override') == 1) {
                druidClassIndex = i;
                break;
            }
        }
        if(AWS_debug) {log(AWS_log+`druidClassIndex: `+druidClassIndex)}

        switch (druidClassIndex) {
            case 0: // assign attributes based on which attribute contained "druid"
                charLevelAttr = "base_level";
                charLevel = getAttrByName(char.id, charLevelAttr);
                charClassAttr = "class";
                charClass = getAttrByName(char.id, charClassAttr);
                charSubclassAttr = "subclass";
                charSubclass = getAttrByName(char.id, charSubclassAttr);
                break;
            
            case 1:
            case 2: 
            case 3: 
            case 4:
                charLevelAttr = `multiclass`+druidClassIndex+`_lvl`;
                charLevel = getAttrByName(char.id, charLevelAttr);
                charClassAttr = `multiclass`+druidClassIndex;
                charClass = getAttrByName(char.id, charClassAttr);
                charSubclassAttr = `multiclass`+druidClassIndex+`_subclass`;
                charSubclass = getAttrByName(char.id, charSubclassAttr);
                break;

            default:
                if (getAttrByName(char.id, 'npc') == 1) {
                    sendChat(AWS_error,`/w `+playerName+` NPC's can't use wildshape unless you set the "aws_override" attribute to "1".`);
                    return;
                } else {
                    sendChat(AWS_error, "/w "+playerName+" No Druid class found. Only druids can use wildshape. Error code 40.")
                    log(AWS_log+"No Druid class found. Only druids can use wildshape. Error code 40.")
                    return;
                }
        }
        // if the character class contains "druid", level is a number, and level is at least 2, allow wild shape
        if ((charClass.search(/druid/i) !== -1 && !isNaN(charLevel) && charLevel >= 2) || getAttrByName(char.id, 'aws_override') == 1) {
            switch (option) {
                case 'level':
                    return charLevel;
                case 'subclass':
                    return charSubclass;
                case 'isdruid':
                    return true;
                default:
                        sendChat(AWS_error, "/w "+playerName+" No Druid class found. Only druids can use wildshape. Error code 41.")
                        log(AWS_log+"No Druid class found. Only druids can use wildshape. Error code 41.")
                        return;
            }
        } else if (isNaN(charLevel)) {
            sendChat(AWS_error, "/w "+playerName+" Selected token's level not a number. Error code 42.")
            log(AWS_log+"Selected token's level not a number. Error code 42.")
            return;
        } else {
            sendChat(AWS_error, "/w "+playerName+" Selected token's level is too low. Wild Shape is unlocked at 2nd level. Error 4.")
            log(AWS_log+"Selected token's level was too low. Wild Shape is unlocked at 2nd level. Error 4.")
            return;
        }
    }
});
