// ==UserScript==
// @name        StackPaste
// @namespace   whatever
// @description Allows you to paste any image directly into SE question textarea
// @include     */questions/ask
// @version     2014.11.20.12.18
// @
// @grant       none
// ==/UserScript==

/** CREATING DOM REFFERENCES **/
//Create div for pasted images
var paste = document.createElement("div");
paste.setAttribute("contenteditable", "true");
paste.style.position="fixed";
paste.style.top="-20px";
paste.style.maxWidth =
paste.style.maxHeight = "15px";
paste.style.overflow = "hidden";
document.body.appendChild(paste);

//Get the main input refference (will be used a lot)
var input = document.getElementById("wmd-input");
var editor = new EditorControler(input);

//Fkey (whatever it is)

var fkey;
try {
 fkey = document.getElementById("fkey").value;
}
catch(e) {
 fkey = -1;
}
/** LOADING SCRIPTS **/
function loadScript(scripts, name, index) {
  //Convert single string to array - not effective but easy
  if(!(scripts instanceof Array))
    scripts = [scripts];
  //Use first script src if no name is defined
  if(name==null) {
    name = scripts[0];
  }
  //Default index is 0
  if(index==null)
    index = 0;
  //In case wrong index was provided
  if(index>=scripts.length)
    throw new Error("Aray index out of bounds.");

  //Create request
  var req = new XMLHttpRequest();
  req.open("GET", scripts[index]);
  //Execute response text on success 
  req.onload = function() {
    scriptFromString(this.responseText);
  }
  //Iterate on error
  req.onerror = function() {
    if(index+1<scripts.length) {
      loadScript(scripts, name, index);
    }
    else {
      throw new Error("All sources failed for '"+name+"'.");
    }
  }
  req.send();
  
  function scriptFromString(str) {
    var script = document.createElement("script");
    script.textContent = str;
    document.body.appendChild(script);
  }
}

//Load canvas to file
loadScript([
  "http://www.corsproxy.com/blueimp.github.io/JavaScript-Canvas-to-Blob/js/canvas-to-blob.js",
  "canvas-to-blob.js"  
],
  "Canvas to Blob"
);



/** GET THE PASTED DATA **/

var lastPaste;
var lastPasteData;
//This event can retrieve files
paste.addEventListener('paste', function(event){
  var items = (event.clipboardData || event.originalEvent.clipboardData);
  
  /**Try to get a file**/
  var files = items.items || items.files;

  if(files.length>0) {
    //Read the file
    applyFile(files[0].getAsFile? files[0].getAsFile():files[0]);
    //Debug
    console.log("File found and processed.");
    //Focus back on the input
    input.focus();
    //The operation is eventually finished when some text appears in `paste` 
    event.preventDefault();
    event.cancelBubble = true;
    return false;
  }
  this.innerHTML = "";
  lastPaste = event;
  lastPaste.target = input;
  lastPasteData = lastPaste.clipboardData.getData("text/plain");
  console.log("Canceled event:", lastPaste, " (text data: \""+lastPaste.clipboardData.getData("text/plain")+"\")");
});
paste.addEventListener('input', function(event) {
  var images = this.getElementsByTagName("img");
  if(images.length!=0) {
    var im = images[0];
    //Not loaded - wait until it loads
    if(im.width==0||im.height==0) {
      im.onload = function() {applyImage(this)};
    }
    else
      applyImage(im); 
    lastPaste = null;   
  }
  else {
    console.log("No image in HTML.");
  }
  this.innerHTML = "";
  //Focus back on the input
  input.focus();
  //The paste event now must be dispatched in textarea:
  if(lastPaste!=null) {
    console.log("Old event: ", lastPaste, " (text data: \""+lastPaste.clipboardData.getData("text/plain")+"\")");
    console.log("Old data: ",lastPasteData);
    //Create new event that will inherit original event's properties
    //var e = new ClipboardEvent("paste");//document.createEvent(/*"ClipboardEvent"*/"Event");        
    //Inherit properties
    //e.clipboardData.setData(lastPasteData, "text/plain");// = lastPaste.clipboardData;
    //Use diferent target
    //e.originalTarget = e.target = input;
    //Dispatch on target
    //console.log("Dispatch event: ", e, " (text data: \""+e.clipboardData.getData("text/plain")+"\")");
    //input.dispatchEvent(e);
    editor.insert(lastPasteData, lastPasteData.length, null);
    lastPaste = null;
  }
});

//When pasting, focus on the PASTE element
input.addEventListener("keydown", function(e) {
  if(e.keyCode==86&&e.ctrlKey) {
    paste.focus();
    console.log("Focusing the div");
  }
});

/** IMAGE UPLOAD **/
var lastSelection;

function uploadToImgur(blob) {

  //Then just proceed with request
  var req = new XMLHttpRequest();
  req.open("POST", "http://"+location.host+"/upload/image");
  
  //FormData
  var formdata = new FormData();
  formdata.append("fkey", fkey);
  //Probably determines whether a file or a string is being sent (when getting image from URL)
  formdata.append("source", "computer");
  formdata.append("filename", blob, "image.png");
  req.onload = uploadOnload;
  
  
  //Start loading animation
  editor.insert("![$$](loading url...)", 3, /(.*)/);
  //At this point save the cursor selection
  //That will allow to insert text to the current position
  //while user is typping
  //Dynamic selection! must be cleared!!!
  lastSelection = editor.getSelection(true);           //The cursor is right after the thext wrapped in []
  
  var end = Math.min.apply(Math, lastSelection);
  //The beginning just after ']('
  lastSelection[0] = end + 2;
  //The beginning is after '['
  lastSelection[1] = end + 2 + "loading url...".length;

  
  //var animationOffset = 

  
  //Temporarily override using setTimeout for testing please
  //*
  
  req.send(formdata);
  /*  * /
  setTimeout(
    function() {
      uploadOnload.apply(
        {responseText: "window.parent.closeDialog(\"http://u8.8u.cz/randimg/random.png\");"},
        []
      );
    },
    3000
  );    // */
}
function uploadOnload() {
  var regex = /window\.parent\.closeDialog\("([^"]+)"\);/;
  var match = this.responseText.match(regex);
  //console.log(match);
  lastSelection.contents = match[1];
  //Cleanup
  lastSelection.detach();
  //editor.insert(match[1], null, null, null, lastSelection);
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


/*document.addEventListener("paste", function() {
  document.getElementById("paste").focus();
  //console.log("Before paste");
});*/

function applyImage(img) {
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext('2d');
  var width = img.width;
  var height = img.height;
  canvas.width = width;
  canvas.height = height;
  //Copy given image on canvas
  ctx.drawImage(img,0,0);
  if(width>650) {
    if(confirm("Image is unnecesarily big. Do you want to resize it before processing?"))
      canvasResizeTo(800,800,canvas);
  }

  //document.body.appendChild(canvas);
  canvas.toBlob(function(blob) {uploadToImgur(blob);});
}

function canvasResizeTo(w,h, canvas) {
  if(w<=0)
    w = Number.MAX_VALUE;
  if(h<=0)
    h = Number.MAX_VALUE;
  //New dimensions
  var nw, nh;
  //Ratios
  var wr, hr;
  //Old imensions
  var ow = canvas.width,
      oh = canvas.height;
  //calculate rations
  if (canvas.width >= canvas.height)
  {
    if (canvas.width <= w && canvas.height <= h)
        return canvas;  // no resizing required
    wr = w / canvas.width;
    hr = h / canvas.height;
  }
  else
  {
    if (canvas.height <= w && canvas.width <= h)
        return canvas; // no resizing required
    wr = h / canvas.width;
    hr = w / canvas.height;
  }
  //The actual ratio
  var ratio = Math.min(wr, hr);
  
  // set size proportional to image
  nw = ow*ratio;
  nh = oh*ratio;


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

//Clone event - http://stackoverflow.com/a/12593036/607407
function cloneEvent(eventObj, overrideObj){

   if(!overrideObj){ overrideObj = {}; }

   function EventCloneFactory(overProps){
       for(var x in overProps){
           this[x] = overProps[x];
       }
    }

    EventCloneFactory.prototype = eventObj;

    return new EventCloneFactory(overrideObj);

}
function EditorControler(field) {
  //Reference to the input field
  this.input = field;
  
  var _this = this;
  //Array of selections that needs to be updated when text changes
  this.selections = [];
  
  this.update = function() {

  }
  var _this = this;
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
    if(this.selections.length==0)
      return;
    
    var val = this.input.value;

    var sel = this.getSelection();
    //Old length, new length, difference of length
    var ol = originalVal.length;
    var nl = val.length;      
    var diffl = nl-ol;    //Positive if chars were added
   
    //Update all selections
    var sels = this.selections;

    
    //If the characters BEFORE selection dissapeared apply special behavior
    //This also only happens if the selection moves by the ammount of deleted chars (just for sure)
    if(diffl<0 && sel[0]-changeSel[0] == diffl) {
      changeSel[0]+=diffl;
    }

    
    for(var i=0, l=sels.length; i<l; i++) {
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
    while ((match = find.exec(val)) !== null)
    {
      //before match
      if(match.index>length) {
        tmp_str = val.substr(length, match.index-length);
        matches.push(tmp_str);
        info.push([length, match.index-length, false]);
        length+=tmp_str.length;
      }
      //Match
      matches.push(match[0]);
      length+=match[0].length;  
      info.push([length, match[0].length, true]);
    }
    //No matches - no replacing
    if(matches.length==0) {
      return;
    }
    //Add the missing end of the string after last match
    if(length<val.length) {
      matches.push(val.substr(length, val.length-length));
      info.push([length, val.length-length, false]);
    } 
    

    if(matches.length==1) {
      return;
    }
    //Get the value split by matches
    //matches = splitAt.apply(splitAt, matches);
    //Replace matches
    var inf;
    var m;
    var selChanged = false;
    for(var i=0, l=matches.length; i<l; i++) {
      inf = info[i];
      //If it's match
      if(inf[2]) {
        m = matches[i];
        m = m.replace(find, replace);
        matches[i] = m;
        //check if the cursor was behind the match
        if(m.length!=inf[1]) {
          //move cursors
          selChanged = selChanged || checkSelection(cursor, [inf[0], inf[1]], [inf[0], m.length]);
        }  
      }      
    }
    function checkSelection(sel, range, newRange) {
      var changed = false;
      //Only if range length has changed
      if(range[1]!=newRange[1]) {
        for(var i=0; i<2; i++) {
          //Cursor is after the change and needs to be re-aligned
          if(sel[i]>range[1]) {
            //console.log("Difference:",range[1]-newRange[1]);
            sel[i]+=newRange[1]-range[1];
            changed = true;
          }       
          //Cursor is in the range 
          else if(sel[i]>=range[0]) {
            sel[i]=i==0?newRange[1]:range[1];
            changed = true;
          }
        } 
      }
      return changed;   
    }
    //Change value
    this.input.value = matches.join("");
    //Move cursor
    if(selChanged) {
      this.setSelection(cursor[0], cursor[1]);
      //console.log("Selection at ", cursor);
    }
    //Render changes
    this.update();
    return;
  }
  function splitAt(string) {
    if(arguments.length==1)
      return [string];
    var tmp = [];
    var tmp_string;
    //Save the starting fragment even if not requested
    if(arguments[1]>0) {
      tmp_string = string.substr(0, arguments[1]);
      tmp_string.startOffset = 0;
      tmp.push(tmp_string);
    }
    //Remember length and save original offset for each piece
    var length = tmp[0].length;
    for(var i=1; (i+1)<arguments.length; i++) {
      tmp_string = string.substr(arguments[i], arguments[i+1]-arguments[i]);
      tmp_string.startOffset = length;
      length+=tmp_string.length;
      tmp.push(tmp_string);
    }   
    //Save end fragment even if not requested (if not empty)
    if(arguments[arguments.length-1]<(string.length)) {
      var tmp_string = string.substr(arguments[arguments.length-1]);
      tmp_string.startOffset = length;       
      tmp.push(tmp_string);
    }
    return tmp;
  }
  window.splitAt = splitAt;
  
  this.changed  = function(set) {
    if(set==true||this.lastValue==null) {
      this.lastValue = this.trimValue(this.input.value);
      return true;
    }
    //console.log(this.lastValue, this.input.value.replace(/[\s]*/,""), this.lastValue != this.input.value.replace(/[\s]*/,""));
    return this.lastValue != this.trimValue(this.input.value);
  }
  this.trimValue = function(val) {
    return val.replace(/(^[\s]+|[\s]+$)/g,"")
              .replace(/[\s]{2,}/g," ");
              
  }
  this.setValue = function(v) {
    this.input.value = v;
  }
  //Dynamic selections MUST be destroyed!
  this.getSelection = function(dynamic) {
    return new EditorSelection(this.input.selectionStart, this.input.selectionEnd, dynamic?this:null);
  }
  this.setSelection = function(start, end) {
      if(this.input != null) {
          if(this.input.createTextRange) {
              var range = this.input.createTextRange();
              if(end==null)
                range.move('character', start);
              else {
                range.collapse(true);
                range.moveStart('character', start);
                range.moveEnd('character', end);
              }
              range.select();
          }
          else {
              if(this.input.selectionStart) {
                  this.input.focus();
                  if(end==null)
                    end = start;
                  this.input.setSelectionRange(start, end);
              }
              else
                  this.input.focus();
          }
      }
  }
}
  /**
   *  Param:
   *     inserted: the string to be inserted
   *     selection: where to put the cursor (relativelly to inserted)
   *     wrap_selected: regular expression to replace in selected text
   *                    use $$ to retrieve matches in first argument
   *      
   *                    true to wrap selected text in () or wrap     
   *     selOverride: the selection that should be replaced, instead of
   *                  cursor selection             
   **/      
EditorControler.prototype.insert = function(inserted, selection, wrap_selected, wrap, selOverride) {
  var sel = selOverride?selOverride:this.getSelection();
  
  //console.log("Selection:",sel);
  var text = [
    this.input.value.substr(0, sel[0]),     //Before selected
    this.input.value.substr(sel[0], sel[1]-sel[0]),//Selected
    this.input.value.substr(sel[1])         //After selected
  ];
  var original_length = text[1].length;
  //console.log("Divided text:",text);
  //Remember if last inserting method was successfull
  //Here I'm just avoiding many repeated code in else {}
  var insert_done = false;
  //Will try to wrap the selected text instead of replacing it
  if(wrap_selected!=null&&text[1].length>0) {
    if(wrap_selected instanceof RegExp) {
      //console.log("Regexping the insert.");
      //Split the insertment by the insert marks $$
      inserted = inserted.split(/\${2}/);
      //Calculate in which part the intended cursor position belongs
      var pos_chunk = 0;   //Chunk index
      var pos_offset = 0;  //Position from chunk beginning
      for(var i=0, chars=0, l=inserted.length; i<l; i++) {
        chars+=inserted[i].length;
        if(chars>=selection) {
          //substract the last size
          chars-=inserted[i].length;
          //Because the length of inserted chars shouldn't be 0, we substract 1 for
          //every insert sequence we pass
          pos_offset = selection-chars-i;

          pos_chunk=i;
          //console.log("pos_offset = ", pos_offset);
          //console.log("pos_chunk = ", pos_offset);
          break;
        }  
      }
      //Match stuff in selected text
      var matches = text[1].match(wrap_selected); 
      if(matches!=null) {

        //Apply matches
        for(var i=1; i<matches.length&&i<=inserted.length; i++) {
          //Replace $$ at this position by match
          inserted[i-1]+=matches[i];
        }
        //Recalculate cursor position
        var added = 0; //Number of characters before cursor position
        for(var i=0; i<pos_chunk; i++) {
          added+=inserted[i].length;
        }
        selection = added+pos_offset;
        //Join the replacement back
        text[1] = inserted.join("");
        insert_done = true;

      }
      //Match failed, just apply the insert
      else {
        text[1] = inserted.join("");
        insert_done = true;
      }
    }
    if(!insert_done) {
      //Add length of added characters to position offset
      selection+=2+text[1].length;
      if(typeof wrap=="string") {
        wrap = [wrap.substr(0, Math.floor(wrap.length/2)),wrap.substr(Math.floor(wrap.length/2))];
      }
      else {
        wrap = ["{", "}"];
      }
      //console.log(text);
      //Simply put text before and wrap it in () for sure
      text[1] = wrap[0]+text[1]+wrap[1]+inserted;
      insert_done = true;        
    }
  }
  //Replace any selected text
  if(!insert_done) {
    text[1] = inserted.replace(/\${2}/g,"");
  }
  //Save selection if it is overriden
  var selOld;
  if(selOverride!=null) {
    selOld = this.getSelection();
  }
  //Changing the value, selection is lost
  this.input.value = text.join("");
  //Focus in the editor
  this.input.focus();
  //Move at the end of inserted character(s)
  //If selection wasn't overrider move relative to it
  if(!selOverride) {
    if(selection==null)
      this.setSelection(text[0].length+text[1].length);
    else if(selection instanceof Array) {
      this.setSelection(text[0].length+selection[0], text[0].length+selection[1]);
    }
    else {
      console.log("Moving cursor at ", text[0].length, "+",selection, "=",text[0].length+selection);  
      this.setSelection(text[0].length+selection);
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
      
      //console.log({first: first, second: second, second_old: second_old});
      //console.log("selection:", {start: selOld[0], end: selOld[1]});
      
      if(selOld[0]<=first && selOld[1]<=first)
        this.setSelection(selOld[0], selOld[1]);
      else {
        for(var i=0; i<=2; i++) {
          //The changed fragment was bordering the selection
          if(selOld[i]<=second_old) {
            //Then include the fragment 
            selOld[i] = second;
          }
          //The changed fragment was in the middle of selection
          else if(selOld[i]>second_old) {
            //Calculate the difference in length (can be negative)
            selOld[i] = selOld[i] + (text[1].length - original_length);
          }
        }
        this.setSelection(selOld[0], selOld[1]);
      }
      //Also change the sel override range
      selOverride[0] = text[0].length;
      selOverride[1] = text[0].length+text[1].length;
  }

}
//Updates selection with regard to the number of characters added at certain offset
EditorControler.prototype.updateSelection = function(sel, addStart, addEnd, diffLen) {
  //First if the selection is *before* the offset it's not affected by any changes
  if(addStart>sel[0] && addStart>sel[1])
    return;
    
  var origLen = Math.abs(addEnd - addStart);
  var newLen = origLen + diffLen;
  var newEnd = addEnd + diffLen;
  if(newEnd<0)
    throw new Error("You can't delete characters that aren't selected.");
  
  for(var i=0; i<=2; i++) {
    //The changed fragment was bordering the selection
    if(selOld[i]<=addEnd) {
      //Then include the fragment in selection completely
      selOld[i] = newEnd;
    }
    //The changed fragment was in the middle of selection (or after)
    else if(selOld[i]>addEnd) {
      //Calculate the difference in length (can be negative)
      selOld[i] = selOld[i] + (diffLen);
    }
  }
}
EditorControler.prototype.textAtRange = function(start, stop) {
  if(start>stop) {
     var tmp = start;
     start = stop;
     stop = tmp;  
  }
  return this.input.value.substr(start, stop-start);
}

EditorControler.prototype.animateChar = function(chars, offset, period, index) {
  // [  "—",  "\\",   "|",   "/"]
  // ["   ", ".  ", ".. ", "..."]
  //This is the first animation
  if(index==null) {
    var _this = this;
    index = 0;
    return setInterval(
      function() {
          index++;
          if(index>=chars.length)
            index=0;
          console.log("Animation step #"+index+" \""+chars[index]+"\".");
          //this.animateChar(chars, offset, period, index);
          _this.insert(chars[index], null, null, null, offset);
          offset[1] = offset[0] + chars[index].length;
      },
      period
    );
  }
}
/**
 *  This class represents permantntly a selection in the eritor
 *    The selection adjusts it's offsets as user writes in the editor
 *    Even though some operations destroy the selection, it is very stable
 *
 **/   
function EditorSelection(a,b, editor) {
  if(a instanceof Array) {
    for(var i=0; i<2 && i<a.length; i++) {
      this[i] = a[i];
    }
  }
  else if(a!=null)
    this[0] = a;
  if(b!=null)
    this[1] = b;      
  
  if(editor instanceof EditorControler) {
    editor.selections.push(this);
    this.editor = editor;
  }
} 
EditorSelection.prototype = [0,0];
EditorSelection.prototype.editor = null;
EditorSelection.prototype.valid = true;

EditorSelection.prototype.update = function(addStart, addEnd, diffLen) {
  var change_begin = Math.min(addStart, addEnd);
  var this_end = Math.max(this[0], this[1]);

  //First if the selection is *before* the offset it's not affected by any changes
  if(change_begin>this_end)
    return;
    
  var origLen = Math.abs(addEnd - addStart);
  var newLen = origLen + diffLen;
  var newEnd = change_begin + newLen;
  
  //console.log("Orig: ",[addStart, addEnd], "\nDiff: ", diffLen, "\nResult: ",[addStart, newEnd]);
  
  //In fact yes, you can delete unselected characters.
  if(newEnd<0)
    throw new Error("You can't delete characters that aren't selected.");
  
  for(var i=0; i<=2; i++) {
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
    if(this[i]<=addEnd && this[i]>addStart) {
      //Then include the fragment in selection completely
      this[i] = newEnd;
    }
    //The changed fragment was in the middle of selection (or after)
    else if(this[i]>addEnd) {
      //Calculate the difference in length (can be negative)
      this[i] = this[i] + (diffLen);
    }
  }
  //console.log("New range: ",[this[0], this[1]]);
}
Object.defineProperty(EditorSelection.prototype, "sel_length", {
    get: function() {Math.abs(this[0]-this[1]);}
});
EditorSelection.prototype.getContents = function(editor) {
  if(editor==null)
    editor = this.editor;
  if(this.editor==null)
    throw new Error("No editor available to use...");
  return editor.textAtRange(this[0], this[1]);  
}
EditorSelection.prototype.setContents = function(text, editor) {
  if(editor==null)
    editor = this.editor;
  if(this.editor==null)
    throw new Error("No editor available to use...");
  return editor.insert(text, null, null, null, this);
}
Object.defineProperty(EditorSelection.prototype, "contents", {
    get: function() {return this.getContents();},
    set: function(txt) {return this.setContents(txt);}
});

EditorSelection.prototype.apply = function(editor) {
  if(editor==null)
    editor = this.editor;
  if(this.editor==null)
    throw new Error("No editor available to apply...");
    
  editor.setSelection(this[0], this[1]);
}
EditorSelection.prototype.detach = function() {
  if(this.editor) {
    var sels = this.editor.selections;
    for(var i=0,l=sels.length; i<l; i++) {
      if(sels[i]==this) {
        sels.splice(i, 1);
        break;    
      }
    }
  }
}
//Disable array functions
EditorSelection.prototype.push = null;
EditorSelection.prototype.pop = null;
EditorSelection.prototype.sort = null;
