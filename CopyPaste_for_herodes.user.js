// ==UserScript==
// @name        CopyPaste for herodes
// @namespace   whatever
// @description Přidá copy/paste operace do HERODESova generátoru grafů
// @include     http://herodes.feld.cvut.cz/mereni/grafy-new/vloz.php
// @include     file:///C:/MYSELF/programing/webprograming/fyzika-grafy.html
// @version     1
// @grant       none
// ==/UserScript==
//Globalni mrdky
var prubehy = [];

//CSS
var sheet = createStyleSheet();
//sheet.insertRule("", 0);

//Funkce na skok pres nekolik parent node (abych nemusel vypisovat .parentNode.parentNode...)
HTMLElement.prototype.parentNodeAt = function(step) {
 if(step<=0) {
   console.warn("Invalid argument to .parentNodeAt()",step);
   return this;
 }
 var el = this;
 for(var i = 0;i<step;i++) {
   el = el.parentNode;
 }
 return el;
}

function prepareModel() {
  //Tabulky probehu
  var prubehyDom = $('form table table table').not(':has(select)');
  //Vytvorit instance Prubeh
  for(var i=0; i<prubehyDom.length; i++) {
    prubehy.push(new Prubeh(prubehyDom[i]));
  }
}



//Pseudotrida pro prubeh funkce
function Prubeh(tabPrubehu) {
  this.prubehTable = tabPrubehu;
  //Pomoci parentNode se dostaneme k hlavni tabulce
  var mainTable = this.mainTable = tabPrubehu.parentNodeAt(8);
  //Zjistit pocet bunek a poradi prubehu
  var pocetBunek = mainTable.previousElementSibling;
  var order = pocetBunek.name.match(/^pocet_cl\[([0-9])\]$/)[1]*1-1;
  this.poradi = order;
  this.pocet_input = pocetBunek;
  //Vytvorime ovladaci prvky:
  var myRow = mainTable.insertRow(0);
  var cell = myRow.insertCell();
  cell.setAttribute("colspan", "2");
  //Hromadne vyplneni nejistot
  cell.appendChild($("<h3>Hromadné vyplňování nejistot:</h3>")[0]);
  
  var div = document.createElement("div");
  div.className = "input";
  div.appendChild(document.createTextNode("Zadejte nejistotu:"));
  var input = $("<input>", {class: "nejistota", value:"1"})[0];
  div.appendChild(input);
  
  var _this = this;
  div.appendChild($("<input>", {type:"button",
                                value:"Nastav",
                                class: "nejistota"
                  })
                  .click(function() {_this.nastavNejistotu(input.value*1);})
                  [0]
  );
  
  cell.appendChild(div);
  
  cell.appendChild($("<h3>Tabulka průběhu:</h3>")[0]);
  
  //Nacist bunky
  var bunky = this.bunky = new PolickaCollection(this);
  
  var $pole = $(tabPrubehu).find("tr");
  var inputy;
  var tmp;
  //console.log($pole);
  for(var i=0,l=$pole.length; i<l;i++) {
    inputy = $pole[i].getElementsByTagName("input");
    //console.log(inputy);
    bunky.push(inputy);
  }
  //console.log(bunky);
}

Prubeh.prototype.nastavNejistotu = function(n) {
  this.bunky.vychoziNejistota = n;
  this.bunky.nejistota = n;
}

Prubeh.prototype.insertTableAt = function(table,x,y) {   
  //Prvni radek na zkoumani formatu
  var frstrow = table.substr(0, table.indexOf("\n"));
  //Regexpy na ruzne typy formatovani
  var table_type_1 = /([0-9]+(?:([\.,])[0-9]+)?)(?:[^0-9,\.]([0-9]+(?:,[0-9]+)?))+/;
  
  var table_type_1_match = frstrow.match(table_type_1);
  if(table_type_1_match!=null) {
    console.log(table_type_1_match);
    //Nahradit carky teckama
    if(table_type_1_match[2]==",") {
      table = table.replace(/,/g, ".");    
    }
    //Budu prochazet radek po radce
    var rows = table.split("\n");
    var row_regexp = /([0-9]+(?:\.[0-9]+)?)/g;
    var match;

    //Optimalizace
    var collection = this.bunky;
    //Rozsirit tabulku
    if(rows.length+y>collection.length) {
      this.extend(rows.length+y-collection.length-1);
    }
    //A loop
    for(var i=0,l=rows.length; i<l; i++) {
      match = rows[i].match(row_regexp); /*
      //Je treba rozsirovat po 1, protoze nevime, zda vsechny radky jseou akceptovatelne
      if(collection.length<=y+i)
        this.extend(1);          */
      //console.log("Match: ", match);
      if(match!=null) {
        for(var j=0,lj=Math.min(match.length, 3-x); j<lj; j++) {
          collection.setValueAt(1*match[j],x+j, y+i);
          //if(isNaN(1*match[j]))
          //  console.warn("Invalid value: ",match[j], "from", match, "at", i);
        }
      }
    }  
  }
}
//Pocet poli, ktere je potreba pridat (nebo odebrat)
Prubeh.prototype.extend = function(fields, position) {
  if(typeof position!="number") {
    position = this.bunky.length;
  }
  if(position!=this.bunky.length)
    throw new Error("Pushing in the middle not supported yet.");
  //Optimalizace
  var bunky = this.bunky;
  //Prvek kam se vkladaj bunky (nemusi byt nutne <table> ale <tbody>)
  var table = $(this.prubehTable).find("tr")[0].parentNode;
  
  if(fields>0) {
    var length = bunky.length; 
    for(var i=0;i<fields; i++) {
      var p = new Policka(length+i);
      p.order = this.poradi;
      var tr = table.insertRow();
      //Vlozit bunky
      var cells = p.createHTML();
      //console.log(cells);
      for(var j=0,jl=cells.length; j<jl; j++) {
        tr.appendChild(cells[j]);
      }
      this.bunky.push(p);    
    } 
  }
  else {
    //Zaporne monzstvi - odebrat bunky
    throw new Error("Not implemented yet!");
  }
}

//Nejistota prirazena novym radkum
Prubeh.prototype.vychoziNejistota = 1;
//Pole existujicich bunek
Prubeh.prototype.bunky = null;  
//Nejnizsi hodnota bunky
Prubeh.prototype.nejnizsiBunka = 1;
//Poradi prubehu
Prubeh.prototype.poradi = 1;
//ELEMENTY
//Input co obsahuje pocet bunek
Prubeh.prototype.pocet_input = null;
//Hlavni tabulka se vsim
Prubeh.prototype.mainTable = null;
//Tabulka s bunkama
Prubeh.prototype.prubehTable = null;


//Pole s dodatecnyma funkcema na policka 
function PolickaCollection(prubeh) {
  this.prubeh = prubeh;

}
PolickaCollection.prototype = [];
//Prubeh
PolickaCollection.prototype.prubeh = null;
//Nejistota pro nove prvky
PolickaCollection.prototype.vychoziNejistota = 1;
PolickaCollection.prototype.justPush = PolickaCollection.prototype.push;
PolickaCollection.prototype.push = function(val) {
  //Je potreba vytvorit nove policko
  if((val instanceof Array||val instanceof HTMLCollection)&&val.length==4&&val[0].tagName!=null) {
    //alert("array");
    //throw new Error("Vsechno je v poradku");
    this.justPush(new Policka(val, this));
  }
  else if(val instanceof Policka) {
    //Priradit pozice
    val.order = this.prubeh.order;
    val.position = this.length;
    //Zpetna reference
    val.collection = this;
    //Push
    this.justPush(val);
  }
  //Updatovat pocet prubehu
  this.prubeh.pocet_input.value = this.length;
}
PolickaCollection.prototype.insertTableAt = function(table, x,y) {
  this.prubeh.insertTableAt(table,x,y);
}
PolickaCollection.prototype.setValueAt = function(value, x,y) {
  if(y>=this.length||y<0)
    throw new Error("Offset out of bounds: "+y);
  //console.log(y);
  var pole = this[y].inputAt(x);
  pole.value = value;
}

PolickaCollection.prototype.__defineGetter__("nejistota",function() {
  var avg = 0;
  var l = this.length;
  for(var i=0;i<l; i++) {
     avg+=this[i].nejistota;
  }
  return avg/l;
});
PolickaCollection.prototype.__defineSetter__("nejistota",function(val) {
  var l = this.length;
  console.log(val);
  for(var i=0;i<l; i++) {
     this[i].nejistota = val;
  }
  return val;
});

//Trida na policka (X, Y, nejistota, enable/disable)
function Policka(policka, collection) {
   //
   if(typeof policka=="object" && policka.length!=null) {
     this.x_input = policka[0];
     this.y_input = policka[1];
     this.nejistota_input = policka[2];
     this.enabled_input = policka[3];
     //zjistit pozici
     var name_regexp = /data_x([1-9])([0-9]+)/;
     var result = name_regexp.exec(this.x_input.name);
     this._order = result[1];
     this._position = result[2];
     
     //Nastavit eventy na policka
     this.setEvents();
     this.setAttributes();
   }
   else {
     this.createInputs();
     //Cislo poradi v poli
     if (typeof policka == "number") {
       this.position = policka;
     }
   }
   //Priradit kolekci
   if(typeof collection=="object")
     this.collection = collection;   

}
Policka.prototype.nejistota_input = null;
Policka.prototype.x_input = null;
Policka.prototype.y_input = null;
Policka.prototype.enabled_input = null;

Policka.prototype.nazvy_policek = ["x", "y", "nejistota", "enabled"];
//Poradi celeho prubehu
Policka.prototype._order = 0;
//Poradi policka
Policka.prototype._position = 0;
//Odkaz na kolekci ve ktere je policko
Policka.prototype.collection = null;

//Ziskat input podle offsetu (lepsi nez nazev)
Policka.prototype.inputAt = function(x) {
  switch(x) {
    case 0 : return this.x_input;
    case 1 : return this.y_input;
    case 2 : return this.nejistota_input;  
    case 3 : return this.enabled_input;  
  }
  return null;
}

//Vytvorit nove inputy
Policka.prototype.createInputs = function() {
  //Pouze pokud neexistuji
  if(this.x_input==null) {
    this.nejistota_input = document.createElement("input");
    this.x_input = document.createElement("input");
    this.y_input = document.createElement("input");
    this.enabled_input = document.createElement("input");
    
    this.nejistota_input.type = 
    this.x_input.type = 
    this.y_input.type = "text";
    this.enabled_input.type = "checkbox";
    
    this.nejistota_input.size = 
    this.x_input.size = 
    this.y_input.size = "4";
    //Dalsi vlastnosti
    this.setEvents();
    this.setAttributes();
  }
}
Policka.prototype.createHTML = function() {
  var cells = [];
  //Pro jistotu zavolat createInputs
  this.createInputs();
  //var inputs = [this.x_input,this.x_input,this.nejistota_input,this.enabled_input];
  var cell;
  
  if(this.x_input.parentNode!=null)
    throw new Error("My elements are already asigned!");
  
  for(var i=0;i<4;i++) {
    //Bunka na hezky mezirky (normalni lidi pouzivaj padding, ze...)
    if(i>0) {
      cell = document.createElement("td");
      cell.setAttribute("width", "10");
      cells.push(cell);    
    }
    //Bunka s popisem (pro checkbox neexistuje)
    if(i<3) {
      cell = document.createElement("td");
      cell.appendChild(this.HTMLLabelFor(this.nazvy_policek[i]));
      cells.push(cell);  
    }
    //Bunka s inputem
    cell = document.createElement("td");
    cell.appendChild(this[this.nazvy_policek[i]+"_input"]);
    //console.log(this[this.nazvy_policek[i]+"_input"]);
    cells.push(cell);  
  }
  return cells;  
}
Policka.prototype.HTMLLabelFor = function(inputName) {
  var propName = inputName+"_label"; 
  if(typeof this[propName]!="undefined")
    return this[propName];
  //Vrati span s prvky
  var span = document.createElement("span");
  //Hodnoty do labelu
  var name, index;
  
  switch(inputName) {
    case "x" : 
      name="x";
      index = "";
    break;
    case "y" : 
      name="y";
      index = "";
    break;
    case "nejistota" : 
      name="σ";
      index = "y";
    break;
  }
  //S nasledujicimi prvky se bude pracovat,
  //hodnoty se do nich daji podle nasledujiciho IF
  var i, sub;
  //Cache pro nasledujici IF
  var input = this[inputName+"_input"];
  //Pokud je z tabulky, HTML se najde v te tabulce
  if(input.parentNode!=null&&input.parentNode.parentNode!=null) {
    var cell = input.parentNode;
    var row = cell.parentNode;
    var data = row.cells[cell.cellIndex-1];
    
    i = data.getElementsByTagName("i")[0];
    sub = data.getElementsByTagName("sub")[0];
    //Smazat innerHTML - proste se vygeneruje nove
    i.innerHTML = sub.innerHTML = "";

    
  }
  else {
    //Vytvoreni novych elementu
    i = document.createElement("i");
    sub = document.createElement("sub");
  }
  //Text node pro data co b se eventuelne mohla menit
  var label_name = this[propName+"_name"] = document.createTextNode(name);
  var label_number = this[propName+"_index"] = document.createTextNode(this._position+1);
  //Pridame textnody do i a sub a pak do spanu
  i.appendChild(label_name);
  if(index!="")
    sub.appendChild(document.createTextNode(index));
  sub.appendChild(label_number);
  //Presunout/pridat prvky do spanu
  span.appendChild(i);
  span.appendChild(sub);
  //Zacachovat
  this[propName] = span;
  //Vratit span
  return span;
}
//Updatuje ciselne hodnoty v popiscich bunek (x1 atd)
Policka.prototype.updateLabels = function() {
  for(var i=0; i<4; i++) {
    var nazev = this.nazvy_policek[i];
    //Vygenerovat HTML
    this.HTMLLabelFor(nazev);
    //Upravit hodnotu
    this[nazev+"_label_index"].data = this._position+1;
  }
}
//Zmenit jmeno inputu
Policka.prototype.updateName = function() {
  var num = (this._order+1)+""+(this._position+1);

  this.nejistota_input.name = "data_x"+num;
  this.x_input.name = "data_y"+num;
  this.y_input.name = "data_s"+num;
  this.enabled_input.name = "nepouz"+num;
}

Policka.prototype.pasteTable = function(input, text) {
  if(this.collection!=null) {
    //Pozice odleva
    var xpos;
    $input = $(input);
    if($input.hasClass("x"))
      xpos = 0;
    else if($input.hasClass("y"))
      xpos = 1;
    if($input.hasClass("nejistota"))
      xpos = 2;
    //Pouxe pokud je prirazena kolekce
    
    this.collection.insertTableAt(text, xpos,this._position-1);   //Position -1 protoze nazvy se cislujou od 1 (demence)
  }
  else
    console.warn("I need parent collection to handle paste data.");
}


//Nastavi eventy (hlavne paste)
Policka.prototype.setEvents = function() {

  this.nejistota_input.addEventListener("paste", onpaste);
  this.x_input.addEventListener("paste", onpaste);
  this.y_input.addEventListener("paste", onpaste);
  this.enabled_input.addEventListener("paste", onpaste);
  
  var _this = this;
  
  function onpaste(event) {
    //Funguje jen pokud je v kolekci
    if(_this.collection==null)
      return true;
    
    var items = (event.clipboardData || event.originalEvent.clipboardData);
    
    var text = items.getData("text/plain");
    //console.log(items.getData("text/html"));
    
    if(text.indexOf("\n")!=-1) {
      //console.log(text);
      _this.pasteTable(this, text);
    
      event.preventDefault();
      return false;
    }
  }
}
//Prida HTML attributy (tabindex a css apod)
Policka.prototype.setAttributes = function() {
  this.nejistota_input.className = "nejistota";
  this.x_input.className = "x";
  this.y_input.className = "y";
  this.enabled_input.className = "enabled";
  //Tyhle dva inputy clovek nechce proskakovat tabulatorem
  this.nejistota_input.setAttribute("tabindex", "-1");
  this.enabled_input.setAttribute("tabindex", "-1");
}

Policka.prototype.fieldGetSet = function(name) {
  var fullname = name+"_input";
  Policka.prototype.__defineGetter__(
    name,
    geter
  );
  Policka.prototype.__defineSetter__(
    name,
    typedSetter
  );
  function geter() {
    return 1*this[fullname].value;
  }
  function typedSetter(val) {
    if(typeof val!="number")
      throw new Error("Value must be a number!"); 
    return this[fullname].value = val;
  }
}
/**Gettery a settery pro hodnoty policek **/
Policka.prototype.fieldGetSet("nejistota");
Policka.prototype.fieldGetSet("x");
Policka.prototype.fieldGetSet("y");
Policka.prototype.__defineGetter__(
  "enabled",
  function() {
    return !this.enabled_input.checked;
  }
);
Policka.prototype.__defineSetter__(
  "enabled",
  function(val) {this.enabled_input.checked = val?false:true;}
);

/** Update poradi**/
Policka.prototype.__defineGetter__("order",function() {return this._order;});

Policka.prototype.__defineSetter__(
  "order",
  function(val) {
    this._order = val;
    //Aktualizovat nazvy prvku
    this.updateName();
  }
);

Policka.prototype.__defineGetter__("position",function() {return this._position;});

Policka.prototype.__defineSetter__(
  "position",
  function(val) {
    this._position = val;
    this.updateName();
    this.updateLabels();
  }
);


//From: http://davidwalsh.name/add-rules-stylesheets
function createStyleSheet() {
	// Create the <style> tag
	var style = document.createElement("style");
	// Add a media (and/or media query) here if you'd like!
	// style.setAttribute("media", "screen")
	// style.setAttribute("media", "only screen and (max-width : 1024px)")
	// WebKit hack :(
	style.appendChild(document.createTextNode(""));

	// Add the <style> element to the page
	document.head.appendChild(style);

	return style.sheet;
}

//Tentokrat vyjimecne pouziju jQuery, protoze se mi nechce slozite ziskavat vsechny elementy...
if(typeof jQuery!="function") {
  var jQuery = document.createElement("script");
  jQuery.src = "//ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js";
  jQuery.onload = prepareModel;
  document.body.appendChild(jQuery);

}
else
  prepareModel();
