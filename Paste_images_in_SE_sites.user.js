// ==UserScript==
// @name        StackPaste
// @namespace   whatever
// @description Allows you to paste any image directly into SE question textarea
// @match        *://*.askubuntu.com/*
// @match        *://*.mathoverflow.net/*
// @match        *://*.serverfault.com/*
// @match        *://*.stackapps.com/*
// @match        *://*.stackexchange.com/*
// @match        *://*.stackoverflow.com/*
// @match        *://*.superuser.com/*
// @exclude      *://api.stackexchange.com/*
// @exclude      *://blog.stackexchange.com/*
// @exclude      *://blog.stackoverflow.com/*
// @exclude      *://data.stackexchange.com/*
// @exclude      *://elections.stackexchange.com/*
// @exclude      *://openid.stackexchange.com/*
// @exclude      *://stackexchange.com/*
// @version     2014.12.01.15.00
// @updateURL   https://github.com/Darker/userscripts/raw/master/Paste_images_in_SE_sites.user.js
// @downloadURL https://github.com/Darker/userscripts/raw/master/Paste_images_in_SE_sites.user.js
// @icon        http://i.stack.imgur.com/UlaAb.png
// @author      Jakub Mareda
// @grant       none
// ==/UserScript==

/*
 * JavaScript Canvas to Blob
 * https://github.com/blueimp/JavaScript-Canvas-to-Blob
 *
 * Copyright 2012, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * https://opensource.org/licenses/MIT
 *
 * Based on stackoverflow user Stoive's code snippet:
 * http://stackoverflow.com/q/4998908
 */

/* global atob, Blob */
// Source: https://github.com/blueimp/JavaScript-Canvas-to-Blob
(function(window) {
    'use strict'

    var CanvasPrototype = window.HTMLCanvasElement && window.HTMLCanvasElement.prototype;
    var hasBlobConstructor =
        window.Blob &&
        (function() {
            try {
                return Boolean(new Blob())
            } catch (e) {
                return false
            }
        })();

    var hasArrayBufferViewSupport =
        hasBlobConstructor &&
        window.Uint8Array &&
        (function() {
            try {
                return new Blob([new Uint8Array(100)]).size === 100
            } catch (e) {
                return false
            }
        })();

    var BlobBuilder =
        window.BlobBuilder ||
        window.WebKitBlobBuilder ||
        window.MozBlobBuilder ||
        window.MSBlobBuilder;

    var dataURIPattern = /^data:((.*?)(;charset=.*?)?)(;base64)?,/;

    var dataURLtoBlob =
        (hasBlobConstructor || BlobBuilder) &&
        window.atob &&
        window.ArrayBuffer &&
        window.Uint8Array &&
        function(dataURI) {
            var matches,
                mediaType,
                isBase64,
                dataString,
                byteString,
                arrayBuffer,
                intArray,
                i,
                bb;

            // Parse the dataURI components as per RFC 2397
            matches = dataURI.match(dataURIPattern);
            if(!matches) {
                throw new Error('invalid data URI');
            }

            // Default to text/plain;charset=US-ASCII
            mediaType = matches[2] ?
                matches[1] :
                'text/plain' + (matches[3] || ';charset=US-ASCII');
            isBase64 = !!matches[4];
            dataString = dataURI.slice(matches[0].length);

            if(isBase64) {
                // Convert base64 to raw binary data held in a string:
                byteString = atob(dataString);
            } else {
                // Convert base64/URLEncoded data component to raw binary:
                byteString = decodeURIComponent(dataString);
            }

            // Write the bytes of the string to an ArrayBuffer:
            arrayBuffer = new ArrayBuffer(byteString.length);
            intArray = new Uint8Array(arrayBuffer);
            for(i = 0; i < byteString.length; i += 1) {
                intArray[i] = byteString.charCodeAt(i);
            }

            // Write the ArrayBuffer (or ArrayBufferView) to a blob:
            if(hasBlobConstructor) {
                return new Blob([hasArrayBufferViewSupport ? intArray : arrayBuffer], {
                    type: mediaType
                });
            }

            bb = new BlobBuilder();
            bb.append(arrayBuffer);
            return bb.getBlob(mediaType);
        };

    if(window.HTMLCanvasElement && !CanvasPrototype.toBlob) {
        if(CanvasPrototype.mozGetAsFile) {
            CanvasPrototype.toBlob = function(callback, type, quality) {
                var self = this;
                setTimeout(function() {
                    if(quality && CanvasPrototype.toDataURL && dataURLtoBlob) {
                        callback(dataURLtoBlob(self.toDataURL(type, quality)));
                    } else {
                        callback(self.mozGetAsFile('blob', type));
                    }
                });
            }
        } else if(CanvasPrototype.toDataURL && dataURLtoBlob) {
            CanvasPrototype.toBlob = function(callback, type, quality) {
                var self = this;
                setTimeout(function() {
                    callback(dataURLtoBlob(self.toDataURL(type, quality)));
                })
            }
        }
    }

    window.dataURLtoBlob = dataURLtoBlob;
})(window);

var DEBUGGING_MODE = false;

function debugLog(){
    if(DEBUGGING_MODE){
        console.log.apply(console, arguments);
    }
}

var WARN_IMG_WIDTH = 650;

/** CREATING DOM REFFERENCES **/
//Create div for pasted images
var tempPasteDIV = document.createElement("div");
tempPasteDIV.setAttribute("contenteditable", "true");
tempPasteDIV.style.position = "fixed";
tempPasteDIV.style.top = "-20px";
tempPasteDIV.style.maxWidth = tempPasteDIV.style.maxHeight = "15px";
tempPasteDIV.style.overflow = "hidden";
document.body.appendChild(tempPasteDIV);

var inputElementsMap = new Map(),
    currInput,
    currEditor;

// Fkey (whatever it is)
var fkey;
try {
    fkey = document.getElementById("fkey").value;
} catch (e) {
    fkey = -1;
}

/** GET THE PASTED DATA **/

var lastPasteEvent, lastPasteData;
//This event can retrieve files
tempPasteDIV.addEventListener('paste', function(event) {
    var items = (event.clipboardData || event.originalEvent.clipboardData),
        files = items.items || items.files;

    if (files.length > 0) {
        for(var i = 0, len = files.length; i < len; i++){
            if(files[i].kind === "file"){
                //Read the file
                applyFile(files[i].getAsFile ? files[i].getAsFile() : files[i]);

                //Focus back on the input
                currInput.focus();
                //The operation is eventually finished when some text appears in `paste`
                event.preventDefault();
                event.cancelBubble = true;
                return false;
            }
        }
        
        debugLog("No file found");
    }

    this.innerHTML = "";
    lastPasteEvent = event;
    lastPasteEvent.target = currInput;
    lastPasteData = lastPasteEvent.clipboardData.getData("text/plain");
    debugLog("Canceled event:", lastPasteEvent, " (text data: \"" + lastPasteEvent.clipboardData.getData("text/plain") + "\")");
});

tempPasteDIV.addEventListener('input', function(event) {
    var images = this.getElementsByTagName("img");

    if (images.length != 0) {
        var im = images[0];
        //Not loaded - wait until it loads
        if (im.width == 0 || im.height == 0) {
            im.onload = function() {
                applyImage(this)
            };
        } else {
            applyImage(im);
        }
        lastPasteEvent = null;
    } else {
        debugLog("No image in HTML.");
    }
    this.innerHTML = "";
    //Focus back on the input
    currInput.focus();
    //The paste event now must be dispatched in textarea:
    if (lastPasteEvent != null) {
        debugLog("Old event: ", lastPasteEvent, " (text data: \"" + lastPasteEvent.clipboardData.getData("text/plain") + "\")");
        debugLog("Old data: ", lastPasteData);
        debugLog("Dispatch event: ", event, " (text data: \"" + event.clipboardData.getData("text/plain") + "\")");
        
        currEditor.insert(lastPasteData, lastPasteData.length, null);
        lastPasteEvent = null;
    }
});

//When pasting, focus on the PASTE element
document.addEventListener("keydown", function(e) {
    var node = e.target;

    if(!node) {
        return;
    }

    if(!inputElementsMap.get(node)) {
        inputElementsMap.set(node, new EditorControler(node));
    }

    currInput = node;
    currEditor = inputElementsMap.get(node);

    if (e.keyCode == 86 && e.ctrlKey) {
        tempPasteDIV.focus();
    }
});

/** IMAGE UPLOAD **/
var lastSelection;

function uploadToImgur(blob) {
    var req = new XMLHttpRequest(),
        formdata = new FormData();

    req.open("POST", "/upload/image");

    formdata.append("fkey", fkey);
    //Probably determines whether a file or a string is being sent (when getting image from URL)
    formdata.append("source", "computer");
    formdata.append("filename", blob, "image.png");
    req.onload = uploadOnload;

    lastSelection = currEditor.insert("![$$](loading url...)", [2, 3], /(.*)/, "image description");

    //At this point save the cursor selection
    //That will allow to insert text to the current position
    //while user is typping
    //Dynamic selection! must be detached!!!
    lastSelection.attach(currEditor);

    var end = Math.max.apply(Math, lastSelection);
    //The beginning just after ']('
    lastSelection[0] = end - "loading url...".length - 1;
    //The end is after the loading message
    lastSelection[1] = end - 1;
    //Characters typed next to this selection should end up inside of it
    lastSelection.open = true;

    if (DEBUGGING_MODE) {
        req.send(formdata);
    } else {
        setTimeout(
            function() {
                uploadOnload.apply({
                    responseText: "window.parent.closeDialog(\"http://u8.8u.cz/randimg/random.png\");"
                }, []);
            },
            3000
        );
    }
}

function uploadOnload() {
    var regex = /window\.parent\.closeDialog\("([^"]+)"\);/;
    var match = this.responseText.match(regex);
    debugLog(match);
    lastSelection.contents = match[1];
    lastSelection.detach();
}
/** CONVERTING FILES, IMAGES etc... **/

function applyFile(file) {
    var reader = new FileReader();
    reader.onload = function(event) {
        var img = new Image;
        img.onload = function() {
            applyImage(this);
        };
        img.src = event.target.result;
    }; // data url!
    reader.readAsDataURL(file);
}

function applyImage(img) {
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext('2d');
    var width = img.width;
    var height = img.height;
    canvas.width = width;
    canvas.height = height;
    //Copy given image on canvas
    ctx.drawImage(img, 0, 0);
    if (width > WARN_IMG_WIDTH && !window.TESTING_SE_PASTE) {
        if (confirm("Image is unnecesarily big. Do you want to resize it before processing?")){
            canvasResizeTo(800, 800, canvas);
        }
    }

    //document.body.appendChild(canvas);
    canvas.toBlob(function(blob) {
        uploadToImgur(blob);
    });
}

function canvasResizeTo(w, h, canvas) {
    if (w <= 0){
        w = Number.MAX_VALUE;
    }
    if (h <= 0){
        h = Number.MAX_VALUE;
    }
    //New dimensions
    var nw, nh;
    //Ratios
    var wr, hr;
    //Old imensions
    var ow = canvas.width,
        oh = canvas.height;
    //calculate rations
    if (canvas.width >= canvas.height) {
        if (canvas.width <= w && canvas.height <= h){
            return canvas; // no resizing required
        }
        wr = w / canvas.width;
        hr = h / canvas.height;
    } else {
        if (canvas.height <= w && canvas.width <= h){
            return canvas; // no resizing required
        }
        wr = h / canvas.width;
        hr = w / canvas.height;
    }
    //The actual ratio
    var ratio = Math.min(wr, hr);

    // set size proportional to image
    nw = ow * ratio;
    nh = oh * ratio;

    var oc = document.createElement('canvas'),
        octx = oc.getContext('2d');

    oc.width = nw;
    oc.height = nh;
    octx.drawImage(canvas, 0, 0, oc.width, oc.height);


    canvas.width = nw;
    canvas.height = nh;

    var ctx = canvas.getContext('2d');
    ctx.drawImage(oc, 0, 0, oc.width, oc.height,
        0, 0, canvas.width, canvas.height);
}

function EditorControler(field) {
    //Reference to the input field
    this.input = field;

    var _this = this;
    //Array of selections that needs to be updated when text changes
    this.selections = [];

    field.addEventListener("input",
        function(event) {
            _this.recalculateSelections(valueOld);
            event.preventDefault();
            return false;
        }
    );
    var valueOld;
    var changeSel;

    field.addEventListener("keydown",
        function(event) {
            changeSel = _this.getSelection();
            valueOld = this.value;
        }
    );
    this.recalculateSelections = function(originalVal) {
        if (this.selections.length == 0){
            return;
        }

        var val = this.input.value;

        var sel = this.getSelection();
        //Old length, new length, difference of length
        var ol = originalVal.length;
        var nl = val.length;
        var diffl = nl - ol; //Positive if chars were added

        //Update all selections
        var sels = this.selections;

        //If the characters BEFORE selection dissapeared apply special behavior
        //This also only happens if the selection moves by the ammount of deleted chars (just for sure)
        if (diffl < 0 && sel[0] - changeSel[0] == diffl) {
            changeSel[0] += diffl;
        }

        for (var i = 0, l = sels.length; i < l; i++) {
            sels[i].update(changeSel[0], changeSel[1], diffl);
        }
    }

    /**TEXT OPERATIONS**/
    this.replace = function(find, replace) {
        var cursor = this.getSelection();
        var match;
        var val = this.input.value;
        var matches = [];
        var info = [];
        //Offset from beginning used for cursor mapping
        var length = 0;
        //temporary string for substrings
        var tmp_str;
        while ((match = find.exec(val)) !== null) {
            //before match
            if (match.index > length) {
                tmp_str = val.substr(length, match.index - length);
                matches.push(tmp_str);
                info.push([length, match.index - length, false]);
                length += tmp_str.length;
            }
            //Match
            matches.push(match[0]);
            length += match[0].length;
            info.push([length, match[0].length, true]);
        }

        //No matches - no replacing
        if (matches.length == 0) {
            return;
        }

        //Add the missing end of the string after last match
        if (length < val.length) {
            matches.push(val.substr(length, val.length - length));
            info.push([length, val.length - length, false]);
        }

        if (matches.length == 1) {
            return;
        }
        //Get the value split by matches
        //matches = splitAt.apply(splitAt, matches);
        //Replace matches
        var inf;
        var m;
        var selChanged = false;
        for (var i = 0, l = matches.length; i < l; i++) {
            inf = info[i];
            //If it's match
            if (inf[2]) {
                m = matches[i];
                m = m.replace(find, replace);
                matches[i] = m;
                //check if the cursor was behind the match
                if (m.length != inf[1]) {
                    //move cursors
                    selChanged = selChanged || checkSelection(cursor, [inf[0], inf[1]], [inf[0], m.length]);
                }
            }
        }

        function checkSelection(sel, range, newRange) {
            var changed = false;
            //Only if range length has changed
            if (range[1] != newRange[1]) {
                for (var i = 0; i < 2; i++) {
                    //Cursor is after the change and needs to be re-aligned
                    if (sel[i] > range[1]) {
                        debugLog("Difference:",range[1]-newRange[1]);
                        sel[i] += newRange[1] - range[1];
                        changed = true;
                    }
                    //Cursor is in the range
                    else if (sel[i] >= range[0]) {
                        sel[i] = i == 0 ? newRange[1] : range[1];
                        changed = true;
                    }
                }
            }
            return changed;
        }
        //Change value
        this.input.value = matches.join("");
        //Move cursor
        if (selChanged) {
            this.setSelection(cursor[0], cursor[1]);
            debugLog("Selection at ", cursor);
        }
        //Render changes
        this.update();
        return;
    }

    function splitAt(string) {
        if (arguments.length == 1){
            return [string];
        }
        var tmp = [];
        var tmp_string;
        //Save the starting fragment even if not requested
        if (arguments[1] > 0) {
            tmp_string = string.substr(0, arguments[1]);
            tmp_string.startOffset = 0;
            tmp.push(tmp_string);
        }
        //Remember length and save original offset for each piece
        var length = tmp[0].length;
        for (var i = 1;
            (i + 1) < arguments.length; i++) {
            tmp_string = string.substr(arguments[i], arguments[i + 1] - arguments[i]);
            tmp_string.startOffset = length;
            length += tmp_string.length;
            tmp.push(tmp_string);
        }
        //Save end fragment even if not requested (if not empty)
        if (arguments[arguments.length - 1] < (string.length)) {
            var tmp_string = string.substr(arguments[arguments.length - 1]);
            tmp_string.startOffset = length;
            tmp.push(tmp_string);
        }
        return tmp;
    }
    window.splitAt = splitAt;

    this.changed = function(set) {
        if (set == true || this.lastValue == null) {
            this.lastValue = this.trimValue(this.input.value);
            return true;
        }

        debugLog(this.lastValue, this.input.value.replace(/[\s]*/,""), this.lastValue != this.input.value.replace(/[\s]*/,""));
        return this.lastValue != this.trimValue(this.input.value);
    }
    this.trimValue = function(val) {
        return val.replace(/(^[\s]+|[\s]+$)/g, "")
            .replace(/[\s]{2,}/g, " ");

    }
    this.setValue = function(v) {
        this.input.value = v;
    }
    //Dynamic selections MUST be destroyed!
    this.getSelection = function(dynamic) {
        return new EditorSelection(this.input.selectionStart, this.input.selectionEnd, dynamic ? this : null);
    }
    this.setSelection = function(start, end) {
        if (this.input != null) {
            if (this.input.createTextRange) {
                var range = this.input.createTextRange();
                if (end == null){
                    range.move('character', start);
                }
                else {
                    range.collapse(true);
                    range.moveStart('character', start);
                    range.moveEnd('character', end);
                }
                range.select();
            } else {
                if (this.input.selectionStart) {
                    this.input.focus();
                    if (end == null){
                        end = start;
                    }
                    this.input.setSelectionRange(start, end);
                } else{
                    this.input.focus();
                }
            }
        }
    }
}
/**
 *  Param:
 *     inserted: the string to be inserted
 *               use $$ to retrieve matches from wrap_selected
 *
 *     selection: where to put the cursor (relativelly to inserted)
 *     wrap_selected: regular expression to replace in selected text

 *     defaultMatches: if no match is fount of if match is "", default match will be picked
 *                     order of this array applies to order of $$ in first parameter
 *     selOverride: the selection that should be replaced, instead of
 *                  cursor selection
 **/
EditorControler.prototype.insert = function(inserted, selection, wrap_selected, default_matches, selOverride) {
    var sel = selOverride ? selOverride : this.getSelection();
    //Selection can be number but will be converted to selection
    if (typeof selection == "number"){
        selection = new EditorSelection(selection, selection);
    }
    //Array is also converted to selection object
    else if (selection instanceof Array && !(selection instanceof EditorSelection)){
        selection = new EditorSelection(selection);
    }

    debugLog("Selection:",sel);
    var text = [
        this.input.value.substr(0, sel[0]), //Before selected
        this.input.value.substr(sel[0], sel[1] - sel[0]), //Selected
        this.input.value.substr(sel[1]) //After selected
    ];
    var original_length = text[1].length;
    debugLog("Divided text:", text);
    //Remember if last inserting method was successfull
    //Here I'm just avoiding many repeated code in else {}
    var insert_done = false;
    //Will try to wrap the selected text instead of replacing it
    //Notice that even if selected fragment is empty, there are necessary calculations
    //to be done!
    if (wrap_selected != null /*&&text[1].length>0*/ ) {
        if (wrap_selected instanceof RegExp) {

            //Split the insertment by the insert marks $$
            inserted = inserted.split(/\${2}/);

            //Match stuff in selected text
            var matches = text[1].match(wrap_selected);


            //Allows to pass just a string as a parameter
            if (typeof default_matches == "string"){
                default_matches = [default_matches];
            }
            //If there are default matches available, the replacing will proceed even if regexp failed
            if (matches == null && default_matches instanceof Array){
                matches = [];
            }

            if (matches != null) {
                //I'm saving myself an IF (in for loop) statement by doing this
                if (default_matches == null){
                    default_matches = [];
                }
                //Remove first element of the match array as this is the one we don't need
                matches.splice(0, 1);
                //Apply matches
                var il = inserted.length;
                var ml = matches.length;
                var dl = default_matches.length;
                //The characters are added behind the selection (also it's impossible to expand closed selection shorter than two characters)
                selection.open = true;
                //Number of characters from the beginning
                var chars = 0;
                // -1: nothing is inserted after last fragment...
                for (var i = 0; i < il - 1; i++) {
                    var insert_pos = chars + inserted[i].length + 1; //+1 because the empty space after the text is considered a character
                    //Replace $$ at this position by match
                    if (i < ml && matches[i].length > 0) {
                        //shift the selection
                        selection.update(insert_pos, insert_pos, matches[i].length - 1);
                        //
                        inserted[i] += matches[i];
                    }
                    //Try the default match if the match was empty
                    else if (i < dl && default_matches[i].length > 0) {
                        //Shift the selection
                        selection.update(insert_pos, insert_pos, default_matches[i].length - 1);
                        //
                        inserted[i] += default_matches[i];
                    } else {
                        //There is char decrease for every $$ fragment, because even empty
                        //fragment counts as a character
                        selection.update(chars, chars, -1);
                    }
                    //Iterate character length
                    chars += inserted[i].length;
                }
                //Turn the open back to false
                selection.open = false;
                /*
                //Recalculate cursor position
                var added = 0; //Number of characters before cursor position
                for(var i=0; i<pos_chunk; i++) {
                  added+=inserted[i].length;
                }
                //The selection consists of the length of previous chunks and the
                //Distance from last chunk
                selection = added+pos_offset;     */
                //Join the replacement back
                text[1] = inserted.join("");
                insert_done = true;

            }
            //Match failed, just apply the insert
            else {
                text[1] = inserted.join("");
                insert_done = true;
                //Substract `pos_chunk` from `selection`
                //this is necessary to make the offset mapping same even if there are no
                //matches
                selection -= pos_chunk;
                debugLog(selection);
            }
        }
    }
    //Replace any selected text
    if (!insert_done) {
        text[1] = inserted.replace(/\${2}/g, "");
    }
    //Save selection if it is overriden
    var selOld;
    if (selOverride != null) {
        selOld = this.getSelection();
    }
    //Changing the value, selection is lost
    this.input.value = text.join("");
    //Focus in the editor
    this.input.focus();
    //Move at the end of inserted character(s)
    //If selection wasn't overriden move relative to it
    if (!selOverride) {
        if (selection == null){
            this.setSelection(text[0].length + text[1].length);
        }
        else{
            this.setSelection(text[0].length + selection[0], text[0].length + selection[1]);
        }
    }
    //Otherwise, the selection is only changed if the text length changed and
    //the change affects the selection
    else {
        //First, unchanged fragment
        var first = text[0].length;
        //Second fragment with altered length
        var second = text[1].length + first;
        //The original length of second fragment
        var second_old = first + original_length;

        debugLog({first: first, second: second, second_old: second_old});
        debugLog("selection:", {start: selOld[0], end: selOld[1]});

        if (selOld[0] <= first && selOld[1] <= first){
            this.setSelection(selOld[0], selOld[1]);
        }
        else {
            for (i = 0; i <= 2; i++) {
                //The changed fragment was bordering the selection
                if (selOld[i] <= second_old) {
                    //Then include the fragment
                    selOld[i] = second;
                }
                //The changed fragment was in the middle of selection
                else if (selOld[i] > second_old) {
                    //Calculate the difference in length (can be negative)
                    selOld[i] = selOld[i] + (text[1].length - original_length);
                }
            }
            this.setSelection(selOld[0], selOld[1]);
        }
        //Also change the sel override range
        selOverride[0] = text[0].length;
        selOverride[1] = text[0].length + text[1].length;
    }
    //Return selection of the whole inserted text
    return new EditorSelection(text[0].length, text[0].length + text[1].length);

    //Finds last chunk which affects the selection
    //returns {index: chunk index, offset: offset in that chunk}
    function findSelectionChunk(chunks, offset) {
        for (var i = 0, chars = 0, l = chunks.length; i < l; i++) {
            chars += chunks[i].length;
            if (chars >= offset) {
                //substract the last size
                chars -= chunks[i].length;
                //Because the length of chunks chars shouldn't be 0, we substract 1 for
                //every insert sequence we pass
                pos_offset = offset - chars - i;

                pos_chunk = i;
                debugLog("pos_offset = ", pos_offset);
                debugLog("pos_chunk = ", pos_offset);
                break;
            }
        }
        return {
            index: pos_chunk,
            offset: pos_offset
        };
    }
}

EditorControler.prototype.textAtRange = function(start, stop) {
    if (start > stop) {
        var tmp = start;
        start = stop;
        stop = tmp;
    }
    return this.input.value.substr(start, stop - start);
}

/**
 *  This class represents permantntly a selection in the eritor
 *    The selection adjusts it's offsets as user writes in the editor
 *    Even though some operations destroy the selection, it is very stable
 *
 **/
function EditorSelection(a, b, editor) {
    if (a instanceof Array) {
        for (var i = 0; i < 2 && i < a.length; i++) {
            this[i] = a[i];
        }
    } else if (a != null){
        this[0] = a;
    }
    if (b != null){
        this[1] = b;
    }

    if (editor instanceof EditorControler) {
        this.attach(editor);
    }
}
EditorSelection.prototype = [0, 0];
EditorSelection.prototype.editor = null;
//This is not used yet, but will determine that the selection was destroyed completelly
EditorSelection.prototype.valid = true;
//This defines whether the selection eats characters added next to it
EditorSelection.prototype.open = false;

// RANGE OPERATIONS

EditorSelection.prototype.update = function(addStart, addEnd, diffLen) {
    var change_begin = Math.min(addStart, addEnd);
    var this_end = Math.max(this[0], this[1]);

    //First if the selection is *before* the offset it's not affected by any changes
    if (change_begin > this_end){
        return;
    }

    var origLen = Math.abs(addEnd - addStart);
    var newLen = origLen + diffLen;
    var newEnd = change_begin + newLen;


    debugLog("Changing range: ",[this[0], this[1]]);
    debugLog("  Add positions: ",[addStart, addEnd], "\n  Diff: ", diffLen, "\n  Result: ",[addStart, newEnd]);

    //In fact yes, you can delete unselected characters, but this should be handled
    //Before casting this function. Basically I'm mapping backspace to delete
    if (newEnd < 0){
        throw new Error("You can't delete characters that aren't selected.");
    }

    for (var i = 0; i <= 2; i++) {
        //Note that if the selection is at or before start it's unaffected

        /** [FIXED] There is still one little bug in the code,
         *    See the figure, [] is selection, | is user cursor:
         *    1. aaaaaa|[mMm]aaaa   //Press backspace
         *    2. aaaaa|m[Mm]aaaa
         *
         *  -- fixed by non-standard behavior when character before selection dissapears
         **/

        /** Another bug - selecting the selection and deleting it doesn't destroy it
         *    See the figure, [] is selection, {} is user selection (blue crap over text)
         *    1. a{aaa[mmmm]a}b     //Erase or replace the text
         *    2. a[]b  //Selection is there, though empty
         *    Expected: Selection will become invalid
         *
         *    Note that this must be different from following:
         *    1. b{[mmmm]}b     //Erase or replace the text
         *    2. a[]b  //Selection is there, and that's all right - it was emptied
         *
         *    As well, it should be possible to delete selection using delete/backspace
         *
         **/

        //The changed fragment was bordering the selection
        //[NOPE] (+1, because xxx|[mmm] is still OUT of selection)
        if (this.open) {
            if (this[i] < addEnd && this[i] > addStart) {
                //Then include the fragment in selection completely
                this[i] = newEnd;

            }
            //The changed fragment was in the middle of selection (or after)
            else if ((i == 1 ? this[i] >= addEnd : this[i] > addEnd)) {

                //Calculate the difference in length (can be negative)
                this[i] = this[i] + (diffLen);

            }
        } else {
            //The changed fragment was in the middle of selection (or after)
            if (this[i] >= addStart && this[i] < addEnd) {
                debugLog("  Middle: Shifting boundary to ", newEnd);
                //Then include the fragment in selection completely
                this[i] = newEnd;
            }
            //The changed fragment was in the middle of selection (or after)
            else if ((i == 0 ? this[i] >= addEnd : this[i] > addEnd)) {
                debugLog("  Border: Shifting boundary to ", this[i] + (diffLen));
                //Calculate the difference in length (can be negative)
                this[i] = this[i] + (diffLen);
            }
        }
    }
    debugLog("New range: ", [this[0], this[1]]);
}
Object.defineProperty(EditorSelection.prototype, "sel_length", {
    get: function() {
        Math.abs(this[0] - this[1]);
    }
});

//Shift whole selection back or further

EditorSelection.prototype.shift = function(offset) {
    this[0] += offset;
    this[1] += offset;
}

// TEXT OPERATIONS

//Returns the text in the range of the selection
EditorSelection.prototype.getContents = function(editor) {
    if (editor == null){
        editor = this.editor;
    }
    if (this.editor == null){
        throw new Error("No editor available to use...");
    }
    return editor.textAtRange(this[0], this[1]);
}
//Will call the editor insert function to insert text in first parameter
EditorSelection.prototype.setContents = function(text, editor) {
    if (editor == null){
        editor = this.editor;
    }
    if (this.editor == null){
        throw new Error("No editor available to use...");
    }
    return editor.insert(text, null, null, null, this);
}

Object.defineProperty(EditorSelection.prototype, "contents", {
    get: function() {
        return this.getContents();
    },
    set: function(txt) {
        return this.setContents(txt);
    }
});

// EDITOR OPERATIONS

//Make this a user selection in the editor
EditorSelection.prototype.apply = function(editor) {
    if (editor == null){
        editor = this.editor;
    }
    if (this.editor == null){
        throw new Error("No editor available to apply...");
    }

    editor.setSelection(this[0], this[1]);
}
//If any editor is attached, delete self from the selection array
//to surpress further updates
//If this is not called, the selection will NOT be garbage colected
//and WILL have a great performance impact
EditorSelection.prototype.detach = function() {
    if (this.editor) {
        var sels = this.editor.selections;
        for (var i = 0, l = sels.length; i < l; i++) {
            if (sels[i] == this) {
                sels.splice(i, 1);
                this.editor = null;
                break;
            }
        }
    }
}

//Attach to an editor instance
EditorSelection.prototype.attach = function(editor) {
    if (!this.editor) {
        editor.selections.push(this);
        this.editor = editor;
    } else if (editor != this.editor) {
        console.warn("This instance already has a editor attached, you must detach it first. This is not implicit!");
    }
}

//Disable array functions
EditorSelection.prototype.push = null;
EditorSelection.prototype.pop = null;
EditorSelection.prototype.sort = null;
