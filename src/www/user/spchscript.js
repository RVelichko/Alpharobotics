var  insertionS = 0;
var  insertionE = 0;
var  activeEl = "doc";// 0 - input  1 - textararea
var lastpos = 0
var lastpospre = 0;
var reviveflag;
var begmetka = "#!#";
var endmetka = "#!!#"

var comwords = new Array();
var comnames = new Array();
comwords[comwords.length] = "команда отменить"; comnames[comnames.length] = "undo";
comwords[comwords.length] = "команда сбросить"; comnames[comnames.length] = "reset";
comwords[comwords.length] = "команда копировать"; comnames[comnames.length] = "copy";
comwords[comwords.length] = "команда выделить"; comnames[comnames.length] = "select";
comwords[comwords.length] = "команда удалить"; comnames[comnames.length] = "delete";


var punctwords = new Array();
var punctchars = new Array();
punctwords[punctwords.length] = "точка запятой"; punctchars[punctchars.length] = ";";
punctwords[punctwords.length] = " ;"; punctchars[punctchars.length] = ";";
punctwords[punctwords.length] = "запятая"; punctchars[punctchars.length] = ",";
punctwords[punctwords.length] = " ,"; punctchars[punctchars.length] = ",";
punctwords[punctwords.length] = "точка"; punctchars[punctchars.length] = ".";
punctwords[punctwords.length] = " ."; punctchars[punctchars.length] = ".";
punctwords[punctwords.length] = "двоеточие"; punctchars[punctchars.length] = ":";
punctwords[punctwords.length] = " :"; punctchars[punctchars.length] = ":";

punctwords[punctwords.length] = "открыть кавычки "; punctchars[punctchars.length] = "\"";
punctwords[punctwords.length] = "открыть кавычки"; punctchars[punctchars.length] = "\"";
punctwords[punctwords.length] = " закрыть кавычки"; punctchars[punctchars.length] = "\"";
punctwords[punctwords.length] = "закрыть кавычки"; punctchars[punctchars.length] = "\"";
punctwords[punctwords.length] = " \" "; punctchars[punctchars.length] = "\" ";
punctwords[punctwords.length] = "восклицательный знак"; punctchars[punctchars.length] = "!";
punctwords[punctwords.length] = " !"; punctchars[punctchars.length] = "!";
punctwords[punctwords.length] = "вопросительный знак"; punctchars[punctchars.length] = "?";
punctwords[punctwords.length] = " ?"; punctchars[punctchars.length] = "?";
punctwords[punctwords.length] = "вопросительный знак"; punctchars[punctchars.length] = "?";
punctwords[punctwords.length] = "звездочка"; punctchars[punctchars.length] = "*";
punctwords[punctwords.length] = " *"; punctchars[punctchars.length] = "*";
punctwords[punctwords.length] = "новая строка"; punctchars[punctchars.length] = "\n";
punctwords[punctwords.length] = " \n "; punctchars[punctchars.length] = "\n";
punctwords[punctwords.length] = "\n "; punctchars[punctchars.length] = "\n";
punctwords[punctwords.length] = "открыть скобку "; punctchars[punctchars.length] = "(";
punctwords[punctwords.length] = "открыть скобку"; punctchars[punctchars.length] = "(";
punctwords[punctwords.length] = " закрыть скобку"; punctchars[punctchars.length] = ")";
punctwords[punctwords.length] = "закрыть скобку"; punctchars[punctchars.length] = ")";


var resindex;
//<script>
var start_timestamp;
var recbtn;
var final_transcript;
var recognizing;
var ignore_onend;
  
var recognition;
var timeout_inter;
var interpusk = " включить воспроизведение ";
var interpause = " остановить воспроизведение ";
var metkashowtext = " показать метки времени ";
var metkadeltext = " убрать метки времени ";
var textcopy = '';

var otklzap = " отключить запись";
var vklzap = " включить запись";


var ctx;
var audioContext;
var analyser;
var gradient;

var flashone;

var screlem;
var perallflag;
var previnter='';

var ispause = false;
var sndbuffer;
var iscapital = false;
var submfl = false;
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// Загрузка конфигурационных файлов
function loadJSON(file, callback) {
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', file, true);
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            callback(xobj.responseText);
        }
    };
    xobj.send(null);
}


window.onbeforeunload = function(env) {
    var docel = getdocel();

    if(docel.value.length > 10 && !submfl) {
        return "Подтвердите выход";//
    }
};


var _config;
var _robot_cfg;
var _websock;
var _robot_socket;

ToggleRec = function() {
    var _self = this;
    var _interval;
    var _timer;

    this.spell_pause = function(timeout) {
        console.log('Spell pause: ' + timeout);
        _self.stop();
        _self.pause(timeout, _self.start());
    };

    this.toggle = function() {
        if (_timer === undefined) {
            begtrans(2);
            begtrans(1);
            console.log('toggle');
        }
    };

    this.pause = function(timeout, callback) {
        if (_timer !== undefined) {
            clearTimeout(_timer);
            _timer = undefined;
            console.log(" > Reset timer");
        } else {
            console.log(" - stop rec");
            begtrans(2);
        }
        _timer = setTimeout(function() {
            _timer = undefined;
            console.log(" + start rec");
            begtrans(1);
            if (callback) {
                console.log(" callback rec");
                callback();
            }
            console.log("+ start rec end");
        }, timeout);
    };

    this.start = function() {
        if (_interval !== undefined) {
            clearInterval(_interval);
            console.log(" >> Reset time interval");
        } else {
            console.log(" ++ Start time interval");
        }
        _interval = setInterval(function() {
            _self.toggle();
        }, 10000);
    };

    this.stop = function() {
        if (_timer !== undefined) {
            clearTimeout(_timer);
            _timer = undefined;
            console.log(" - Stop timer");
        }

        if (_interval !== undefined) {
            clearInterval(_interval);
            _interval = undefined;
            console.log(" -- Stop time interval");
        }
    };
};
var _toggle_rec = new ToggleRec();


SpellTimer = function() {
    var _is_sleep = false;
    var _timer;

    this.start = function() {
        if (!_is_sleep) {
            console.log("spell timer - запущен");
            _is_sleep = true;
            _timer = setTimeout(function () {
                console.log("spell timer: " + _robot_cfg.responces.spell_timeout.time);
                sendResponce(getRandValue(_robot_cfg.responces.spell_timeout.msg));
                _is_sleep = false;
            }, _robot_cfg.responces.spell_timeout.time * 1000);
        }
    };

    this.stop = function() {
        if (_is_sleep) {
            console.log("spell timer - остановлен");
            clearTimeout(_timer);
            _is_sleep = false;
            return true;
        }
        return false;
    };
};
var _spell_timer = new SpellTimer();


TimeoutEvent = function() {
    var _interval;

    this.restart = function() {
        if (_interval !== undefined) {
            clearInterval(_interval);
            console.log("timer event - перезапущен");
        } else {
            console.log("timer event - запущен");
        }
        _interval = setInterval(function () {
            sendResponce(getRandValue(_robot_cfg.responces.timeout.msg));
        }, _robot_cfg.responces.timeout.sleep * 1000);
    };

    this.stop = function() {
        if (_interval !== undefined) {
            clearInterval(_interval);
            _interval = undefined;
            console.log("timer event - остановлен");
        }
    }
};
var _timeout_event = new TimeoutEvent();


AlarmEvent = function() {
    var _interval;

    this.start = function() {
        if (_robot_cfg.responces.alarm_clocks.length) {
            if (_interval !== undefined) {
                clearInterval(_interval);
                console.log("alarm event - перезапущен");
            } else {
                console.log("alarm event - запущен");
            }
            _interval = setInterval(function () {
                var date = new Date();
                for (var i in _robot_cfg.responces.alarm_clocks) {
                    var h = _robot_cfg.responces.alarm_clocks[i].clock_h;
                    var m = _robot_cfg.responces.alarm_clocks[i].clock_m;
                    if (date.getHours() === h && date.getMinutes() === m) {
                        sendResponce(_robot_cfg.responces.alarm_clocks[i].msg);
                    }
                }
            }, 30000);
        }
    };

    this.stop = function() {
        if (_robot_cfg.responces.alarm_clocks.length) {
            if (_interval !== undefined) {
                clearInterval(_interval);
                _interval = undefined;
                console.log("alarm event - остановлен");
            }
        }
    }
};
var _alarm_event = new AlarmEvent();


// События:
var _is_regex = false;
function eventNewString(str) {
    _spell_timer.start();
    console.log('eventNewString:' + str);
    _toggle_rec.start();
    _timeout_event.restart();

    // Проверить на совпадение правилам по регулярному выражению
    if (!_is_regex) {
        for (var i in _robot_cfg.responces.regexes) {
            var pattern = new RegExp(_robot_cfg.responces.regexes[i].regex);
            var text = str.toLowerCase();
            if (pattern.test(text)) {
                console.log(text + " <- " + _robot_cfg.responces.regexes[i].regex);
                sendResponce(getRandValue(_robot_cfg.responces.regexes[i].resp));
                _is_regex = true;
                break;
            }
        }
    }
}


function eventCompleteString(str, txtequal) {
    console.log('eventCompleteString: ' + str + ', ' + txtequal);
    if (txtequal*100 < _robot_cfg.responces.misunderstand_perc.perc) {
        console.log("распознано: " + txtequal*100 + " < " + _robot_cfg.responces.misunderstand_perc.perc);
        sendResponce(getRandValue(_robot_cfg.responces.misunderstand_perc.resp));
    } else if (!_is_regex) {
        console.log("правила не определены...");
        sendResponce(getRandValue(_robot_cfg.responces.misunderstand));
    }
    _is_regex = false;
}


function eventStartRec() {
    console.log('eventStartRec');
    _toggle_rec.start();
    _timeout_event.restart();
    _alarm_event.start();
}


function eventStopRec() {
    console.log('eventStopRec');
    _toggle_rec.stop();
    _timeout_event.stop();
    _alarm_event.stop();
}


function getRandValue(array) {
    if (array.length) {
        var id = Math.max(Math.floor(array.length * Math.random() - 0.1), 0);
        console.log('arr: ' + array.length + '; rand id: ' + id);
        return array[id];
    }
    return '';
}


function sendResponce(msg) {
    console.log("sendResponce(" + msg + ")");
    if (msg && msg.length) {
        var json = {
            room_id: _config.send_room_id,
            msg:{
                resp: msg
            }
        };
        _websock.send(JSON.stringify(json));
        console.log("resp: " + JSON.stringify(json));
        sendMessageToRobot(msg);

        _spell_timer.stop();
        var koeff = 120; // примерное колечество милисекунд на озвучивание одного символа
        var timeout = msg.length * koeff;
        _toggle_rec.spell_pause(timeout);
    } else {
        var json = {
            room_id: _config.send_room_id,
            msg:{
                text: 'отсутствует правило для события'
            }
        };
        _websock.send(JSON.stringify(json));
    }
}


function sendText(msg) {
    if (msg && msg.length) {
        var json = {
            room_id: _config.send_room_id,
            msg: {
                text: msg
            }
        };
        _websock.send(JSON.stringify(json));
        console.log("text: " + JSON.stringify(json));
    }
}


window.onload = function () {
    if(document.getElementById("chksound").checked == true) {
        showindicator();
    }
    sndbuffer = new Audio("tobufer.wav");
    pausevisible();
    if(window.location.href.indexOf("autostart=1") != -1) {
        setTimeout(togglerec,1000);
    }

    loadJSON("robot_config.json", function(response) {
        _config = JSON.parse(response);

        loadJSON(_config.robot_config_url, function (response) {
            _robot_cfg = JSON.parse(response);

            // Подключение сокета для отправки сообщений и команд
            _robot_socket = io.connect(_config.send_url);
            _robot_socket.on('connect', function () {
                console.log('connected');
                _robot_socket.emit('joinRoom', {
                    room: _config.send_room_id,
                    role: 'chatwatcher'
                });
            });

            // Подключиться к серверу комнат
            _websock = new WebSocket(_config.rooms_server_url);
            _websock.onmessage = function (e) {
                console.log("recv " + e.data);
                var json = JSON.parse(e.data);

                if ('msg' in json) {
                    if ('text' in json.msg) {
                        sendMessageToRobot(json.text);
                    }
                }
            };

            _websock.onopen = function (evt) {
                var now = new Date();
                var json = {
                    room_id: _config.send_room_id,
                    msg: {
                        date: now.toISOString(),
                        name: _config.robot_name
                    }
                };
                _websock.send(JSON.stringify(json));
                console.log("send " + JSON.stringify(json));
            };
        });
    });
};


window.onclose = function() {
    _websock.close();
};

function sendMessageToRobot(text) {
    if (text=='') {
        return;
    }
    var msg = {
        text: text
    };
    try{
        _robot_socket.emit('chat_msg', msg);
        console.log("msg to robot: " + JSON.stringify(msg));
    } catch (e){
        console.log('Ошибка отправки сообщения в канал данных');
    }
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function showindicator()
{
 var c = document.getElementById("canvsound");
 ctx = c.getContext("2d");
 gradient = ctx.createLinearGradient(0,0,130,0);
 gradient.addColorStop(1,'#ff0000');
 gradient.addColorStop(0.75,'#ffff00');
 gradient.addColorStop(0.25,'#7fff00');
 gradient.addColorStop(0,'#00ff00');
 window.AudioContext = window.AudioContext || window.webkitAudioContext;
 audioContext = new AudioContext();
 
  analyser = audioContext.createAnalyser();
  analyser.smoothingTimeConstant = 0.3;
  analyser.fftSize = 1024;
 
  javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
  javascriptNode.onaudioprocess = procaudio;
  
  
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
  navigator.getUserMedia( {audio:true}, gotStream, errlevel );

}

function getAverageVolume(array)
 {
        var values = 0;
        var average;
 
        var length = array.length;
 
        // get all the frequency amplitudes
        for (var i = 0; i < length; i++) {
            values += array[i];
        }
 
        average = values / length;
        return average;
 }
 
 function errlevel(err)
 {
     alert("Sound indicator error:"+err.name);
 }


function gotStream(stream) {
    mediaStreamSource = audioContext.createMediaStreamSource( stream );
	mediaStreamSource.connect(analyser);
	javascriptNode.connect(audioContext.destination);
}


function procaudio()
 {

        // get the average, bincount is fftsize / 2
        var array =  new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        var average = getAverageVolume(array);
 
        // clear the current state
        ctx.clearRect(0, 0, 130, 15);
 
        // set the fill style
        ctx.fillStyle=gradient;
 
        // create the meters
        ctx.fillRect(0,0,average,15);
 }


function sell_all()
{
var docel = getdocel();
docel.select();
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var _cerrunt_spell_str = '';
function showcopy(spstr) {
    var copyel = document.getElementById("copyel");
    copyel.value = spstr;

    if (spstr.length) {
        var str = spstr.toLowerCase();
        eventNewString(str);
        _cerrunt_spell_str = str;
    } else {
        eventCompleteString(_cerrunt_spell_str, document.getElementById("txtqual").innerText);
        _cerrunt_spell_str = '';
    }
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function getaddkeycode()
{
	var addcode = document.getElementById("addcode");
	return addcode.value;


}

function pressent(event)
{
 var keyCode = ('which' in event) ? event.which : event.keyCode;
    if(keyCode == getaddkeycode())
	return false;


}




function checkcur()
{
return true;
/*
var addcur = document.getElementById("chkcur");
if(addcur.checked == true)
return true;
else
return false;
*/
}
/*
function checkadd()
{
var autoadd = document.getElementById("chkadd");
if(autoadd.checked == true)
return true;
else
return false;
}
*/
function checkcap()
{
var autocap = document.getElementById("chkcap");
if(autocap.checked == true)
return true;
else
return false;
}

function replstr(somestr, fromstr, tostr)
{

var lenbe;
var temp = somestr;
var posp=-1;
do
{
	lenbe = temp.length;
	temp = temp.replace(fromstr,tostr);
	if(lenbe == temp.length)
		break;
	else
	{
	 if(checkcap())
	 {
	 switch(tostr)
	   {
		 
		   case "!":
		   case "?":
		   case ".":
		   posp = temp.indexOf(tostr,posp+1);
		   if(posp < lenbe-2)
		   temp = temp.substr(0,posp+2) + temp.charAt(posp+2).toUpperCase() + temp.substr(posp+3); 	   
		   break;
		   case "\n":
		   posp = temp.indexOf(tostr,posp+1);
		   if(posp < lenbe-2)
		   temp = temp.substr(0,posp+1) + temp.charAt(posp+1).toUpperCase() + temp.substr(posp+2); 	  
		   break;
		    case "#1#":
		   posp = temp.indexOf(tostr,posp+1);
		   if(posp < lenbe-4)
		   temp = temp.substr(0,posp) + temp.charAt(posp+4).toUpperCase() + temp.substr(posp+5);
		   else
		    temp = temp.substr(0,posp);
		   break;
		   default:
		   break;   	   
	   }//end switch
	  }//if(checkcap())
	}
}
while(true)

return temp;
}

function replpunct(spstr)
{

for(var i = 0; i < punctwords.length; i++)
{

spstr = replstr(spstr,  punctwords[i],punctchars[i]);
}

return spstr;
}

function checkcom()
{
if(document.getElementById("chkcom").checked == true)
return true;
else
return false;
}

function docommand(spstr)
{

  
	for(var i = 0; i < comwords.length; i++)
		if( spstr.indexOf(comwords[i]) !== -1)
		{	
		  return comnames[i];
		}
    return false;
}



function del_selected()
{
 var docel = document.getElementById("docel");
	
 getCaretPositions(docel);
  if(docel.value != "" )
       if(insertionS != insertionE)
			   {	 
				docel.value = docel.value.substring(0,insertionS)  +  docel.value.substring(insertionE);
			   }

}

function checkprep()
{
var punct = document.getElementById("chkpunct");
if(punct.checked == true)
return true;
else
return false;
}

/*
function speakadd()
{
var speechel = document.getElementById("speechel");
var speechstr =  speechel.value;

if(checkprep())
	speechstr = replpunct(speechstr);


add_speech(speechstr);
showcopy(speechstr);

}
*/


function enablerem(act)
{
var remel = document.getElementById("rembtn");
if(act == 0)
  remel.disabled = true;
else
   remel.disabled = false;
 
}

function rem_speech()
{
var docel = getdocel();
	if(lastpos != - 1)
	{
		

	docel.value = docel.value.substr(0,lastpospre) + docel.value.substr(lastpos,docel.value.length);
	lastpos = lastpospre;

	}
	enablerem(0);
    if(docel.setSelectionRange) 
		docel.setSelectionRange(lastpos,lastpos);
}





function getCaretPositions(ctrl)
   {
     var CaretPosS = -1, CaretPosE = 0;

     // Mozilla way:
     if(ctrl.selectionStart || (ctrl.selectionStart == '0'))
     {
       CaretPosS = ctrl.selectionStart;
       CaretPosE = ctrl.selectionEnd;

       insertionS = CaretPosS == -1 ? CaretPosE : CaretPosS;
       insertionE = CaretPosE;
	   
     }
     // IE way:
     else if(document.selection && ctrl.createTextRange)
     {
       var start = end = 0;
       try
       {
         start = Math.abs(document.selection.createRange().moveStart("character", -10000000)); // start

         if (start > 0)
         {
           try
           {
             var endReal = Math.abs(ctrl.createTextRange().moveEnd("character", -10000000));

             var r = document.body.createTextRange();
             r.moveToElementText(ctrl);
             var sTest = Math.abs(r.moveStart("character", -10000000));
             var eTest = Math.abs(r.moveEnd("character", -10000000));

             if ((ctrl.tagName.toLowerCase() != 'input') && (eTest - endReal == sTest))
               start -= sTest;
           }
           catch(err) {}
         }
       }
       catch (e) {}

       try
       {
         end = Math.abs(document.selection.createRange().moveEnd("character", -10000000)); // end
         if(end > 0)
         {
           try
           {
             var endReal = Math.abs(ctrl.createTextRange().moveEnd("character", -10000000));

             var r = document.body.createTextRange();
             r.moveToElementText(ctrl);
             var sTest = Math.abs(r.moveStart("character", -10000000));
             var eTest = Math.abs(r.moveEnd("character", -10000000));

             if ((ctrl.tagName.toLowerCase() != 'input') && (eTest - endReal == sTest))
              end -= sTest;
           }
           catch(err) {}
         }
       }
       catch (e) {}

       insertionS = start;
       insertionE = end
	  
     }
	 
	
   }



function support_speech_attribute() { 
  if (!('webkitSpeechRecognition' in window))
      document.write('<span style="color: #FF0000;">Ваш браузер не поддерживает голосового ввода - попробуйте установить</span>  <a target="_blank" href="http://www.google.com/chrome/?hl=ru">google CHROME</a>');
}


function firstcap(str)
{
	if(str.charAt(0) == '\n')
	{
	   return str.substr(1);
	}
	else
	{ 
	  return str;
	}
}

function add_speech(speechstr) {
    //var txtequal = document.getElementById("txtqual").innerText;
    //workRobotSpeech(_cerrunt_spell_str, txtequal);

    if(checkbufer())
	{
	  copy_buf(firstcap(speechstr));
	  beepbuf();
	  return;
	}

    var docel = document.getElementById("docel");
	
	getCaretPositions(docel);
	if(iscapital)
	   speechstr = speechstr.toUpperCase();
	else 	if(checkcap())
	   speechstr = add_cap1(speechstr);
	
	enablerem(1);

    if(docel.value != "" )
	{
		   if(checkcur())
		   {
			if(insertionS != insertionE)
			   {
			   lastpospre = insertionS;
				docel.value = docel.value.substring(0,lastpospre)  + speechstr + docel.value.substring(insertionE);
                lastpos = lastpospre + speechstr.length;//new
			   }
		   else
			  {
				  lastpospre = insertionS;
				  if(speechstr.length > 1)
				  {
				   docel.value = docel.value.substring(0,lastpospre) + " " + speechstr + docel.value.substring(lastpospre);
					lastpos = lastpospre + 1 + speechstr.length;
				   }
				  else
				  {
				  docel.value = docel.value.substring(0,lastpospre) +  speechstr + docel.value.substring(lastpospre);
				   lastpos = lastpospre + speechstr.length;
				  }	 
			 }					
		   }
		   else
		   {
		   lastpospre = docel.value.length;
		   if(docel.value.charAt(docel.value.length-1) != '\n' && speechstr.length >1)
				docel.value = docel.value + " " + speechstr;
		   else
				docel.value = docel.value  +  speechstr;
		   lastpos = docel.value.length;	
			
		   }
	}
    else
	{
		lastpospre = 0;
        docel.value = speechstr;
		lastpos = speechstr.length;
	}
	activeEl = "doc";


	docel.focus();
	if(docel.setSelectionRange) 
		docel.setSelectionRange(lastpos,lastpos);
}

function getdocel()
{

return document.getElementById("docel");
}





function add_htm(htm1,htm2)
{

    var docel = document.getElementById("docel");
	
	getCaretPositions(docel);

	if(htm1 && htm2  )
	{
	if(insertionS != insertionE)
			   {
			   
				docel.value = docel.value.substring(0,insertionS) + htm1  +  docel.value.substring(insertionS,insertionE) +htm2 +docel.value.substring(insertionE);
                lastpos = insertionE + htm1.length + htm2.length;//new
			   }
		   else
			  {
			  
			  docel.value = docel.value.substring(0,insertionS) + htm1 + htm2 +docel.value.substring(insertionS);
			  lastpos =insertionS + htm1.length + htm2.length;
			  }
    }//if(htm1 && htm2)
	else
	{
	docel.value = docel.value.substring(0,insertionS) + htm1 + docel.value.substring(insertionS);
	lastpos =insertionS + htm1.length;
	}//else if(htm1 && htm2)
	docel.focus();
    if(docel.setSelectionRange) 
		docel.setSelectionRange(lastpos,lastpos);

}

function add_punct(punct) {
add_punctval(punct.value);
}
function add_punctval(punct) {


var punctval;
switch(punct)
{
case "\\n":
punctval = "\n";
break;
default:
punctval = punct;
break;
}


var docel = getdocel();
getCaretPositions(docel);
if( insertionS == -1)
{ 
	docel.value = docel.value + punctval;
	lastpos = docel.value.length;
}
else
{
	docel.value = docel.value.substring(0,insertionS) + punctval + docel.value.substring(insertionS);	
	
	lastpos = insertionS + punctval.length;
	
}

	docel.focus();
    if(docel.setSelectionRange) 
		docel.setSelectionRange(lastpos,lastpos);
}




function add_cap1(spstr)
{
var docel = getdocel();
var capflag = true;
var pos;

if(checkcur())
  pos = insertionS - 1;
else 
  pos = docel.value.length - 1

lab1: for(var i = pos; i > 0 ; i--)
  switch(docel.value.charAt(i))
  {
  case " ":
  break;
  case "\n":
  case "!":
  case "?":
  case ".":
  capflag = true;  
  break lab1;
  default:
  capflag = false;
  break lab1; 
  }
  

if(capflag)
	spstr = spstr.charAt(0).toUpperCase() + spstr.substr(1); 
return spstr;
}

function change_cap(str)
{
if(str.toUpperCase() == str)
  return str.toLowerCase();
else
  return str.toUpperCase();
}

function allcapcolor()
{
var allcapbtn = document.getElementById("allcapbtn");
if(iscapital)
	allcapbtn.style.backgroundColor = "orange";
else
allcapbtn.style.backgroundColor = "";
}

function all_cap()
{
iscapital =!iscapital;
allcapcolor();
}

function add_cap() {
    var docel = getdocel();
	getCaretPositions(docel);
	var pospr = docel.value.lastIndexOf(" ",insertionS);
	var posent = docel.value.lastIndexOf("\n",insertionS);
	
	var pos = pospr > posent ? pospr : posent;
	if(pos == -1)
		docel.value = change_cap(docel.value.charAt(0)) + docel.value.substr(1); 
	else
		docel.value = docel.value.substr(0,pos+1) + change_cap(docel.value.charAt(pos+1)) + docel.value.substr(pos+2); 
	
	
	docel.focus();
	

}

function getlogo()
{
if(document.getElementById("chklogo").checked)
   return "\n Composed by Speechpad.ru";
else
  return '';
}

function changelang(chklan)
{
//var speechel = document.getElementById("speechel");
//speechel.setAttribute("lang",chklan.value);

recognition.stop();

document.documentElement.setAttribute("lang",chklan.value);
reviveflag = true;	
}

function releaseres()
{
var myel = document.getElementById("selectedFile");
if(myel)
  myel.value="";
  submfl = true;
}





function mchanged()
{
var myform = document.getElementById("myform");
myform.action = "#medtrdiv";
myform.submit();
}

function handleFiles(files)
{ 
  var file = window.webkitURL.createObjectURL(files[0]); //window.createObjectURL(
  document.getElementById('mediaid').src = file; 

 
} 



function upmedia()
{
	
	switch(checkmedia())
	{
	case 1: //video
	case 2://audio
	
    document.getElementById("selectedFile").value ="";
	var myplayer = document.getElementById("mediaid");

	myplayer.src = document.getElementById("inpurl").value;

	break;
	case 0://youtube
	var medid = document.getElementById("inpurl").value;
	player.loadVideoById(medid);
	player.pauseVideo();
	break;
	default:
	break;
	}
}




function checkmedia()
{
var myplayers = document.getElementsByName("mediagr");


for(var i=0;i<myplayers.length;i++)
{
  if(myplayers[i].checked)
     return i;
}
return -1;//no transribation
}


function setmetkatime()
{
var docel = getdocel();
getCaretPositions(docel);
docel = docel.value;
var mbeg = docel.lastIndexOf(begmetka,insertionS);
if(mbeg != -1)
  {
   mend = docel.indexOf(endmetka,mbeg);
   var metval = docel.substring(mbeg + begmetka.length, mend);
   document.getElementById("startsec").value = metval;  
  }
}//end setmetka

function playmedia()
{

switch(checkmedia())
{
case 1: //video
case 2://audio
var myplayer = document.getElementById("mediaid");
if(document.getElementById("chkzapmetka").checked)
{
   setmetkatime();
   myplayer.currentTime = document.getElementById("startsec").value;
}
myplayer.play();
break;
case 0://youtube

if(document.getElementById("chkzapmetka").checked)
 {
   setmetkatime();
   var startsec = document.getElementById("startsec").value;
   player.seekTo(startsec);
 }
player.playVideo();
break;
default:
break;
}
}


function pausemedia()
{

switch(checkmedia())
{
case 1: //video
case 2://audio
var myplayer = document.getElementById("mediaid");
  myplayer.pause();

   document.getElementById("startsec").value = myplayer.currentTime;
break;
case 0://youtube

 player.pauseVideo();
 document.getElementById("startsec").value =player.getCurrentTime();
break;
default:
break;
}
}

function getplaystate()
{
//0 - pause 1 play 2 end
switch(checkmedia())
{
case -1:
return 8;//0шибка

case 1: //video
case 2://audio
var myplayer = document.getElementById("mediaid");
if(myplayer.readyState == 0)
 return 2;
if(myplayer.duration - 2 < myplayer.currentTime)
 return 2;
if(myplayer.paused)
  return 0;
else return 1;

break;



case 0://youtube
//unstarted (-1), ended (0), playing (1), paused (2), buffering (3), video cued (5).
var plstate = player.getPlayerState();
if(plstate == 1  || plstate == 3)//playing or buffering 
  return 1;
else if(plstate == 2 || plstate == 5 || plstate == -1 )//paused or cued or unstarted
return 0;
else  //ended paystate = 0 what is 4 so?
 return 2;


default:
return 0;
break;
}
}

if (!('webkitSpeechRecognition' in window)) {
 ; //upgrade();
} 
else
 {
  final_transcript = '';
  recognizing = false;
  ignore_onend;
  
  recognition = new webkitSpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;

  
   recognition.onstart = function() {

  setrecbtn(1);
  // recbtn.style.color = "red";
  // recbtn.value = otklzap;
   recognizing = true;
   if(istransrib() && document.getElementById("chksinx").checked)
       vklmedia();
  };

  recognition.onerror = function(event)
  {


    setqual("error: " + event.error);
    if (event.error == 'no-speech')
	{
  
      ignore_onend = true;
	  setqual("error: no-speech");
    }
    if (event.error == 'audio-capture')
	{
    
      ignore_onend = true;
	  setqual("error: audio-capture");
    }
  
    if (event.error == 'not-allowed')
	{
	
   if (event.timeStamp - start_timestamp < 100)
	  {
	    setqual("error: blocked");
      } else
	  {
        setqual("error: denied");
      }
      ignore_onend = true;
	  
    }
	/*
	if(!isauto())
	{
    recbtn.style.color = "black";
	
	}
	*/
	//if(!flashone)
	//flashbody();
	
	
  };//onerror

  recognition.onend = function()
  {

    recognizing = false;
	if(!isauto())
	{
	setrecbtn(0);
	//recbtn.style.color = "black";
    //recbtn.value = vklzap;
	}
	if(istransrib() && document.getElementById("chksinx").checked)
	  otklmedia();
	 
    //if(!flashone)
	//flashbody();
	  

	 
    if (ignore_onend) 
    {
      return;
    }
	
	
	
  };//onend
  
  function setqual(qualstr)
  {
  
  var qualel = document.getElementById("txtqual");
  qualel.innerText = qualstr;
  }

  recognition.onresult = function(event)
  { 

    var interim_transcript = '';
	
    for (var i = event.resultIndex; i < event.results.length; ++i)
	{
	
	 if(i == event.results.length-1)
	 {
	 if(checkcom())
		 {		
		     var tempret = docommand(event.results[i][0].transcript);
			  switch(tempret)
			  {
			  
			    case "copy":
				copy_all();					
                return;	
			
			    case "reset":
                    console.log('# STOP 3');
				recognition.stop();
				recognizing = false;
				showcopy("");
				reviveflag = true;
			    return;
				
				case "undo":
				  rem_speech();
                    console.log('# STOP 4');
				recognition.stop();
				recognizing =false;
				showcopy("");
				reviveflag = true;
				return;
				
				case "select":
                    console.log('# STOP 5');
				recognition.stop();
				recognizing = false;
				sell_all();
				reviveflag = true;				
				return;
				
				case "delete":
                    console.log('# STOP 6');
				recognition.stop();
				recognizing = false;
				del_selected();
				reviveflag = true;
				return;
				
				case "pause":				
				 setpausebg(true);
				return;
				
				case "start":
				setpausebg(false);
                    console.log('# STOP 7');
				recognition.stop();
				recognizing = false;	
				reviveflag = true;					
				return;
				
				case "move":			
				copy_all();
				sell_all();	
				del_selected();
				reviveflag = true;							
				return;

				default:
				break;
			  }
			 
			
		 }
	 }//if(i = event.results.length-1)
	
	
	if(!ispause)
	{
      if (event.results[i].isFinal && recognizing == true)
	  {
	  
        final_transcript += event.results[i][0].transcript;
		if(i >= resindex++)//new final
		{
		
		 setqual(event.results[i][0].confidence.toFixed(2)) ;
		
		 if(checkprep())
		      {			
			      if(i==0 || event.results[i][0].transcript.length < 2 )
				  add_speech(replpunct(event.results[i][0].transcript));
				  else
				  add_speech(replpunct(event.results[i][0].transcript.substr(1)));
			  }
		 else
			  {
				  if(i==0 || event.results[i][0].transcript.length < 2)
				  add_speech(event.results[i][0].transcript);
				  else
				  add_speech(event.results[i][0].transcript.substr(1));		  
			  }
			  
		 if(checkmetka())
		       add_speech(begmetka + getmediatime() + endmetka);
			   
	     if(ispersinx())
		 {
		   pertext(event.results[i][0].transcript,1);
		   previnter ='';
		  }
		}//if(i >= resindex++)//new final
      } // if (event.results[i].isFinal)
	  else
	  {
	  
        interim_transcript += event.results[i][0].transcript;	
      }
    }
	if(ispersinx())
	  if(interim_transcript.length - previnter.length > 15)
	  {
	     pertext(interim_transcript, 0);
	     previnter = interim_transcript;
	  }
	showcopy(interim_transcript);


    if(interim_transcript.length > 300)
	{
        console.log('# STOP 8');
	recognition.stop();
	reviveflag = true;
	}
   }//if(!ispause)
  };//onresult
}//if else (!('webkitSpeechRecognition' in window)) 


function togglerec() {
    setpausebg(false);

    if(isred()) {
        begtrans(2);
        eventStopRec();
    }
    else {
        begtrans(1);
        eventStartRec();
    }
}


function begtrans(contr)
{
 
  if(contr == 2)
  {
      console.log("# STOP");
  recognition.stop();
  setrecbtn(0);
  //recbtn.style.color = "black";
  //recbtn.value = vklzap;
  }
  
  if(contr == 1)
  {
  final_transcript = '';
  resindex = 0;
  recognition.lang = document.documentElement.getAttribute("lang");
      console.log("# START");
  recognition.start();
  ignore_onend = false;
  start_timestamp = Date.now();
  }
  
}

function istransrib()
{

if(document.getElementById("medtrdiv"))
  return true;
else 
 return false;


}

function vklmedia()
{
var plst = getplaystate();

if(getplaystate() != 0)
return;

  setTimeout(playmedia, 2000);
}

function otklmedia()
{
if(getplaystate() == 1)
	pausemedia();


}

function checkbufer()
{
	if(!document.getElementById("chkbufer"))
	 return false;

	if(document.getElementById("chkbufer").checked)
	  return true;
	else 
	  return false;
}

function copy_buf(str)
{
 var copymes = str;
 window.postMessage({ type: "COPY_ALL", text: copymes}, "*");
}

function copy_all()
{
	var docel = getdocel();
	var temp = docel.value;

	if(recognizing)
	{
        console.log('# STOP 2');
		recognition.stop();
		recognizing =false;
		showcopy("");	
	}
	if(temp)
	{
        console.log("# frase: " + getlogo());
	var copymes = temp + getlogo();
	window.postMessage({ type: "COPY_ALL", text: copymes}, "*");
	}
}

function zaboi()
{

var docel = getdocel();
getCaretPositions(docel);

if(insertionS != insertionE)
{
	docel.value = docel.value.substring(0,insertionS)  + docel.value.substring(insertionE);	
		lastpos = insertionS;


}
else if(insertionS == -1)
{ 
	docel.value = docel.value.slice(0,-1);
	lastpos = docel.value.length;
}
else
{
	docel.value = docel.value.substring(0,insertionS-1)  + docel.value.substring(insertionS);	
	lastpos = insertionS - 1;
	
}


	docel.focus();
	if(docel.setSelectionRange) 
		docel.setSelectionRange(lastpos,lastpos);
}




function pausevisible()
{
    if(!document.getElementById("chksinx"))
	  return;

	if(document.getElementById("chksinx").checked)
	{
	  document.getElementById("intertrdiv").style.display = 'none';
     
	}

	else
	{

	 document.getElementById("intertrdiv").style.display = '';
    
	}

}

function playinterval()
{
var pausetime = parseInt(document.getElementById("pausetime").value);
var playtime = parseInt(document.getElementById("playtime").value);
if(playtime)
	{
	   playmedia();
	   timeout_inter =  setTimeout(pauseinterval, playtime*1000);
	}
else
   playmedia();
}


function pauseinterval()
{
var pausetime = parseInt(document.getElementById("pausetime").value);
var playtime = parseInt(document.getElementById("playtime").value);
if(pausetime)
	{
	  pausemedia();
	  timeout_inter = setTimeout(playinterval, pausetime*1000);
	}
else
	{
	 pausemedia();
	 btninter.value = interpusk;
	}
}

function beginter()
{

var btninter = document.getElementById("btninter");

 if(btninter.value == interpusk)
  {
    if(getplaystate() == 1)
		return;
    btninter.value = interpause;
	playinterval();
  }
  else
  {
    btninter.value = interpusk;
	otklmedia();
    clearTimeout(timeout_inter);
  }

}

function isauto()
{
if(document.getElementById("chkauto").checked && isred())
return true;
else
return false;
}

function setpausebg(setp)
{
if(setp)
{
  ispause = true;
  document.body.style.background = "blue";
}
else
  {
    ispause = false;
    document.body.style.background ='#EFE8DF'
  }
}

function flashbody()
{
	if(document.body.style.background != 'gray')
	{
	 flashone = true;
	 document.body.style.background = 'gray';
	 setTimeout(flashbody,10);
	}
	else
	{
	document.body.style.background ='#EFE8DF';
	flashone = false;
	if(isauto() || reviveflag == true)
		{
		    reviveflag = false;
			begtrans(1);		
		}
	}
}

function showkeyb()
{
var rect =  document.getElementById("keyimg").getBoundingClientRect();

var temptop =rect.bottom - 240;
var templeft =rect.left;
var tmp = window.open("keyb.htm","keybwindow","height=240,top=" + temptop.toString()  + ",left=" + templeft.toString() + ",width=600,status=no,toolbar=no,menubar=no,location=no,titlebar=no,resizable=no",true);
tmp.focus();

}


function showpop(ctrl)
{
var rect =  ctrl.getBoundingClientRect();
var temptop =rect.bottom - 100;
var templeft =rect.left;

var tmp = window.open("pophtml.htm","htmlwindow","height=100,top=" + temptop.toString()  + ",left=" + templeft.toString() + ",width=240,status=no,toolbar=no,menubar=no,location=no,titlebar=no,resizable=no",true);
tmp.focus();
}


function checkmetka()
{
 if(!document.getElementById("chkmetka"))
 return false;

if(document.getElementById("chkmetka").checked)
  return true;
else 
  return false;

}


function getmediatime()
{
var mtime ="22";
switch(checkmedia())
{
case 1: //video
case 2://audio
var myplayer = document.getElementById("mediaid");
mtime = myplayer.currentTime;
break;
case 0://youtube
mtime = player.getCurrentTime();
break;
default:
break;
}

return mtime.toFixed(1);
}

function clearmetka()
{

var mbeg;
var mend;
var docel = getdocel();
var lenend = endmetka.length;
var i;



if(metkashowtext != document.getElementById("btnmetka").value)
	{
	
	document.getElementById("btnmetka").value = metkashowtext;
	textcopy = docel.value;
	for(i=0; i<1000;i++)
		{
			mbeg = docel.value.indexOf(begmetka);
			if(mbeg != -1)
				{
				findfl=true;
				mend = docel.value.indexOf(endmetka);
				
				docel.value = docel.value.substring(0,mbeg) + docel.value.substring(mend +lenend);
				}
			else
			 break;
		}
	}//if(metkaofftext != btntext)
else
   {
    document.getElementById("btnmetka").value = metkadeltext;
    docel.value = textcopy;
    textcopy ='';
   }//else    if(metkaofftext 
}//end clearmetka
/*
function setCaretPos( pos)
{

var docel = getdocel();
if(docel.setSelectionRange) 
		docel.setSelectionRange(pos,pos);
	}
}
*/
function setrecbtn(btnstate)
{
recbtn = document.getElementById("recbtn");
	if(btnstate == 1)//recording
	{
	 //recbtn.style.color = "red";
	
	
     recbtn.style.backgroundColor = "orange";
	 recbtn.value = otklzap;
	}
	else
	{
	
	recbtn.style.backgroundColor = "";
	recbtn.value = vklzap;
	}
}

function isred()
{
recbtn = document.getElementById("recbtn");
  if(recbtn.style.backgroundColor == "orange")
  {
 
	return true;
  }
  else
  {
   
    return false;
  }
}

function attachScript(src)
{

  if(screlem)
	 document.getElementsByTagName('head')[0].removeChild(screlem)
  screlem = document.createElement("script");
  screlem.src = src;
  document.getElementsByTagName('head')[0].appendChild(screlem);
}

function finCallback(res)
 { 
	 copyper = document.getElementById("copyper");
	 docper = document.getElementById("docper");
	 if(!perallflag)
	 {
	 copyper.value = res.text;
	 docper.value = docper.value + " " + res.text;
	 }
	 else
	 {
	  docper.value = res.text;
	  copyper.value ="";
	  perallflag = false;
	 }
 }
 
 
 function intCallback(res)
 {
   copyper = document.getElementById("copyper");
   copyper.value = res.text;
 }
 

 
 function pertext(textper,isfinal)
{
var text =  encodeURI(textper);
var langfrom = document.getElementById("pagelang").value;
var langto = document.getElementById("perlang").value;
var dirper = langfrom.substring(0,2) + "-" + langto.substring(0,2);
if(isfinal)
	attachScript('https://translate.yandex.net/api/v1.5/tr.json/translate?key=trnsl.1.1.20131104T091957Z.4f6da830b36b5d00.769c7efe3f826b83405c55bd436d7ecac0c4d4ef&lang=' + dirper + '&text=' + text + '&callback=finCallback');
else
	attachScript('https://translate.yandex.net/api/v1.5/tr.json/translate?key=trnsl.1.1.20131104T091957Z.4f6da830b36b5d00.769c7efe3f826b83405c55bd436d7ecac0c4d4ef&lang=' + dirper + '&text=' + text + '&callback=intCallback');
}

function perevesti()
{
perallflag= true;
var docel = getdocel();
pertext(docel.value,1);
}

function ispersinx()
{
	var persinx = document.getElementById("chkpersinx");
	if(persinx)
	{
		if(persinx.checked)
		return true;
		else
		return false;
	}
	else
	return false;
}

function srtmetka()
{
var mbeg=0;
var mend=0;
var docel = getdocel();
var lenend = endmetka.length;
var lenbeg = begmetka.length;
var i;
var metval;
var srtvaldo = "00:00:00,000";
var srtval;
var menddo=0;

temptext = docel.value;
	for(i=1; i<1000;i++)
		{
			mbeg = docel.value.indexOf(begmetka, mend);
			if(mbeg != -1)
				{
					findfl=true;
					mend = docel.value.indexOf(endmetka,mend+1);
					metval = docel.value.substring(mbeg+lenbeg,mend)												
					srtval = sectotime(metval);
					if(i==1)
					{
					temptext  = i + "\n" + "00:00:00,000" + " --> " + srtval + "\n" +  docel.value.substring(0,mend +lenend);
				    }
					else
					{
					temptext  = temptext + "\n\n" + i + "\n" + strvaldo + " --> " + srtval + "\n" + docel.value.substring(menddo +lenend, mend+lenend);								
					}					
					strvaldo = srtval;
					menddo = mend;
				}
			else
			 break;
		}

 docel.value = temptext;
}//end srtmetka


function sectotime(secs)
{
 secs = secs *10;
 var milis = secs  % 10;
 secs = (secs - milis)/10;
 var hours = Math.floor(secs / (60 * 60));
 var divisor_for_minutes = secs % (60 * 60);
 var minutes = Math.floor(divisor_for_minutes / 60);
 var divisor_for_seconds = divisor_for_minutes % 60;
 var seconds = Math.ceil(divisor_for_seconds);
 var ret =  (hours < 10 ? '0' + hours : hours)  + ':' + (minutes < 10 ? '0' + minutes : minutes)  + ':' + (seconds < 10 ? '0' + seconds : seconds) + ',' + (milis == 0 ? '000' : milis*100);
  return ret;
}

function beepbuf()
{
  sndbuffer.currentTime=0;
  sndbuffer.play();
}