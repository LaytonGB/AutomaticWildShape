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
                        if (playerIsGM(msg.playerid) || char.get("controlledby").search("all") || char.get("controlledby").search(playerName)) {
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
                sendChat(AWS_error, "/w "+playerName+" Only a GM can use this command. Error code 28.");
                log(AWS_log+" Only a GM can use 'remove <beast name>' command. Error code 28.");
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
                log(AWS_debug+" Found that token.get returned undefined. Error code 5.");
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
                    if (findObjs({_type: 'character', name: parts[1]})[0] !== undefined) { // if a sheet is grabbed when name is filter
                        msgBeast = findObjs({_type: 'character', name: parts[1]})[0]; // get id of beast by name
                        if (beastList.indexOf(msgBeast.id) !== -1) { // if the beast's ID is in the list of WS beast's IDs
                            transform(playerName, token, char, msgBeast.id); // activate transform function and send it beast ID
                        } else {
                            sendChat(AWS_error, '/w '+playerName+' Could not find beast '+parts[1]+'. Error code 6.');
                            log('Could not find creature \''+parts[1]+'\' in Journal. Error code 6.');
                            return;
                        }
                    }
                    break;
            }
        } else {
            //debug
            if (AWS_debug) {log(AWS_log+"Reached beastListToChat() function caller.")}
    
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
                    sendChat(AWS_error, "/w "+playerName+" No Druid class found. Only druids can use wildshape. Error code 14.")
                    log(AWS_log+"No Druid class found. Only druids can use wildshape. Error code 14.")
                    return;
            }
            // if the character class contains "druid", level is a number, and level is at least 2, allow wild shape
            if ((charClass.search(/druid/i) !== -1 && !isNaN(charLevel) && charLevel >= 2) || getAttrByName(char.id, 'aws_override') == 1) {
                beastListToChat(beastList, char, charFirstName, charLevel, charSubclass, playerName); 
            } else if (isNaN(charLevel)) {
                sendChat(AWS_error, "/w "+playerName+" Selected token's level not a number. Error code 10.")
                log(AWS_log+"Selected token's level not a number. Error code 10.")
                return;
            } else {
                sendChat(AWS_error, "/w "+playerName+" Selected token's level is too low. Wild Shape is unlocked at 2nd level. Error code 11.")
                log(AWS_log+"Selected token's level was too low. Wild Shape is unlocked at 2nd level. Error code 11.")
                return;
            }
        }
    }
    
    // --- FUNCTIONS ---
    function makeBeastList(msg) {
        //debug
        if (AWS_debug) {log(AWS_log+"makeBeastList() function called.")};
        let x = 1;
    
        // compile array of beast names based on "ws" attribute existence
        let beastIDArray = [];
        let beastNameArray = [];
        let entry = 0;
        _.each(findObjs({_type: "character"}), function(sheet) { // for every object of type character in game
            //debug
            if (AWS_debug) {log("Sheet "+x+" ID: "+sheet.id+" | Sheet "+x+" name: "+sheet.get("name"))};
    
            if (sheet.get("_type") === "character") { // if the char sheet is for sure a char sheet
                if (findObjs({ // if the attribute "ws" exists
                    _characterid: sheet.id,
                    _type: "attribute",
                    name: "ws"
                }, {caseInsensitive: true})[0] !== undefined) {
                    //debug
                    log(AWS_log+"Accepted Sheet Name: "+sheet.get("name")+" | Accepted Sheet ID: "+sheet.id+" | Accepted Sheet WS Attr Val: "+getAttrByName(sheet.id, "ws"));
    
                    beastIDArray[entry] = sheet.id; // add sheet ID to ID ARRAY
                    beastNameArray[entry] = sheet.get("name"); // add sheet NAME to NAME ARRAY
                    entry++;
                }
            } else { // if somehow a non-character got through, end this pass and post to log
                sendChat(AWS_error, "/w "+msg.who+"Unknown error, see log. Error Code 2.")
                log(AWS_log+"Error Code 2.")
                return;
            }
    
            //debug
            x++;
        })
        //debug
        if (AWS_debug) {
            for (let i = 0; i < beastIDArray.length; i++) {
                log("beastNameArray["+i+"]: "+beastNameArray[i])
            }
        }
    
        // if no names ids, return error. else return ids.
        if (beastIDArray.length > 0) {
            return beastIDArray; // return array of beast IDs
        } else if (beastIDArray < 1) {
            sendChat(AWS_error, "No wild shape sheets found. Error code 3.");
            log("No wild shape sheets found. Error code 3.");
            return;
        }
    }
    
    function beastListToChat(beastList, char, charName, charLevel, charSubclass, playerName) {
        //debug
        if (AWS_debug) {log(AWS_log+"beastListToChat() function called.")};
    
        //moonDruid setup
        let subclass = charSubclass;
        let moonDruid = false;
        if (subclass.search(/moon/i) !== -1) {moonDruid = true}; // if "moon" is in the subclass attribute (ignoring caps), moonDruid = true
        //debug
        if(AWS_debug){log(AWS_log+`MoonDruid = true`)}
    
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
    
        // Cull beastList by CR
        let finalBeasts = [];
        _.each(beastList, function(beastID) {
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
            if (!isNaN(beastFilter) && beastFilter <= crFilter) {finalBeasts.push(beastID)}; 
            // if the value of beast's CR is a number & less than the PC's crLimit, add to finalBeasts array
            log(`beastName: `+getAttrByName(beastID, 'npc_name')+` | beastCR: `+beastCR+` | beastFilter: `+beastFilter+` | crFilter: `+crFilter+` | beastFilter <= crFilter: `+(+beastFilter <= +crFilter))
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
        _.each(finalBeasts, function(beastID) {
            let beastName = getAttrByName(beastID, "npc_name");
            let beastCR = getAttrByName(beastID, 'npc_challenge');
    
            if (beastName !== undefined) {
                //debug
                if (AWS_debug) {log(AWS_log+'Beast '+(i+1)+', Name: '+beastName+', added to chat output.')};
    
                if (i % 2 === 0) { // if first half of macro
                    outputList = outputList.concat(" {{["+beastName+", (CR"+beastCR+")](!<br>aws "+beastName+") = ");
                } else { // if second half of macro
                    outputList = outputList.concat("["+beastName+", (CR"+beastCR+")](!<br>aws "+beastName+")}}");
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
                log('multiple characters named '+charName+' found');
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
                    sendChat(AWS_error, `/w `+playerName+` Variable 'aws_hpbar' incorrectly set. Please see variables at the top of AutomaticWildShape API. Error code 26.`);
                    sendChat(AWS_name, `/w `+playerName+` Character '`+wildSheet.get('name')+`' deleted.`);
                    wildSheet.remove();
                    log(AWS_log+`Variable 'aws_hpbar' incorrectly set. Must be 1, 2, or 3. Error code 26.`);
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
                
                sendChat(AWS_name, `/w `+playerName+` Character '`+charName+`' wild shape ended.`);

                //HP calc
                let tokenHP = token.get('bar'+AWS_hpbar+'_value');
                let charHP = getAttrByName(char.id, 'hp');
                let newHP = +charHP;
                if (tokenHP < 0) { // if token HP is negative, apply it to char hp
                    newHP = +charHP + +tokenHP;
                    sendChat(AWS_name, `/w `+playerName+` '`+charName+`' lost [[`+String(tokenHP).replace('-', '')+`]] hit points due to the damage they took in wild shape.`);
                };

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
                createObj("attribute", {
                    _characterid: beast.id,
                    name: 'ws',
                    current: '1'
                });
                sendChat(AWS_name, '/w '+playerName+' '+beast.get('name')+' (CR '+getAttrByName(beast.id, "npc_challenge")+') has been added to the available Wild Shapes.');
                return;
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
                        sendChat(AWS_error, `/w `+playerName+` `+beast.get(`name`)+` (CR `+getAttrByName(beast.id, "npc_challenge")+`) is not amongst the available Wild Shapes, and so can't be removed from the Wild Shapes list. Error code 16.`);
                        log(AWS_log+beast.get(`name`)+` (CR `+getAttrByName(beast.id, "npc_challenge")+`) is not amongst the available Wild Shapes, and so can't be removed from the Wild Shapes list. Error code 16.`);
                        return;
                    }
                } else {
                    sendChat(AWS_error, `/w `+playerName+` A selected beast's sheet could not be identified. Please ensure all selected tokens represent their sheets. Error code 28.`);
                    log(AWS_log+`A selected beast's sheet could not be identified. Please ensure all selected tokens represent their sheets. Error code 28.`);
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
                    sendChat(AWS_error, `/w `+playerName+` `+beast.get(`name`)+` (CR `+getAttrByName(beast.id, "npc_challenge")+`) is not amongst the available Wild Shapes, and so can't be removed from the Wild Shapes list. Error code 16.`);
                    log(AWS_log+beast.get(`name`)+` (CR `+getAttrByName(beast.id, "npc_challenge")+`) is not amongst the available Wild Shapes, and so can't be removed from the Wild Shapes list. Error code 16.`);
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

        let msg = '/w '+playerName+' &{template:default} {{name=**All WildShape Beasts**}}';
        let i = 0;
        _.each(beastList, function(beastID) {
            let beast = getObj('character', beastID);
            let beastName = beast.get('name');
            let beastCR = getAttrByName(beastID, 'npc_challenge');
            
            msg = msg.concat(' {{Beast '+(i+1)+' = '+beastName+', CR: '+beastCR+' [X](!<br>aws remove '+beastName+')}}');
            i++;
        })
        sendChat(AWS_name, msg)
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
});
