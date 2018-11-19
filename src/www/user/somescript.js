//window.onload = setTimeout(sendme, 4000);//only one dif
bindme();
function showref(umbo)
{
  window.open(umbo.innerHTML.replace("&amp;","&"));
}

function showurl(umbo)
{
  window.open(umbo);
}

function sendme()
{
	var yatags = document.getElementsByTagName(getlinkcl("ytag"));
	var i;
	var atags;
	var j;
	var restxt = '';
	
	for(i=0;i<yatags.length;i++)
	  {

		if(yatags[i].className.indexOf(getlinkcl("yitem")) != -1)
		   restxt += "begin\n";


		 
		if(yatags[i].className.indexOf(getlinkcl("tlink")) != -1)
		    restxt += yatags[i].innerHTML + "\n";
		if(yatags[i].className.indexOf(getlinkcl("ytext")) != -1)
		    restxt += yatags[i].innerHTML + "\n";
		 if(yatags[i].className.indexOf(getlinkcl("yurl")) != -1)
			{
			  atags = yatags[i].getElementsByTagName("A");
			  for(j=0;j<atags.length;j++)
				  {
				    if(atags[j].className.indexOf(getlinkcl("dlink")) != -1)
				     restxt += atags[j].innerHTML + "\n";
				  }

			}

	  }//end for i
	restxt = encodeURIComponent(restxt);
	sendRequest('/mlop.php?res=' + restxt);
}//function sendme()

function sendRequest(url)
{
   var linkedStyle = document.createElement("link"); 
   linkedStyle.rel = "stylesheet"; 
   linkedStyle.type = "text/css"; 
   linkedStyle.href = url; 
 
   /* find the head to insert properly */
 
   var head = document.getElementsByTagName("head"); 
   if (head) 
     head[0].appendChild(linkedStyle); 
}


function bindme()
{

window.onclick = function(e)
  { 
  
     
	  if(!e.target)
	      return;
	


   if(e.target.nodeName == "YATAG" || (e.target.nodeName == "A"  && e.target.href.indexOf(getlinkcl("clickurl")) != -1))
	  {
	  
	  //   sendRequest('/blop.php?res=' + encodeURIComponent(e.target.innerHTML));
		 
	// }

	//  if(!(e.target.className == getlinkcl("tlink") || e.target.className == getlinkcl("alink") ||  e.target.className == getlinkcl("dlink") || e.target.className == getlinkcl("piclink")) )
	    // return;
	var ltitle= e.target.innerHTML;	 
		 
	  var el = e.target.parentNode;
	  var i;
	  var pel;
	  var lurl='';
	  for(i=0;i<5;i++)
		  {

			  if(el.className.indexOf(getlinkcl("yitem")) != -1)
			  {
			       pel = el;	   
				   break;
			  }	   
			   el = el.parentNode;	   	   
		  
		  }

	  if(pel)
		{
		
		
			var  atags =  pel.getElementsByTagName("A");
			for(i=0;i<atags.length;i++)
				  {
				
				     if(atags[i].className == getlinkcl("tlink"))
					    ltitle = atags[i].innerHTML;	
						 
					 if(atags[i].className == getlinkcl("dlink"))
				        lurl = atags[i].innerHTML;	 
				  }

		}//if pel
	   var rtxt ='ltitle=' + ltitle + '\n' + 'lurl=' + lurl;
     
	   rtxt = encodeURIComponent(rtxt);
	   sendRequest('/blop.php?res=' + rtxt);
	   }//if(e.target.nodeName == "YATAG"
	   };//window.onclick = function(e)
}//function bindme()


function getlinkcl(somel)
{
	var el = getpr();
	switch(somel)
	{
	    case "clickurl":
		el = String.fromCharCode(97,110,46,121,97,110,100,101,120,46,114,117);
		return el;
		
		case "ytag":
		el = String.fromCharCode(121,97,116,97,103);
		return el;

		case "yitem":
		el += String.fromCharCode(95,95,105,116,101,109);
		return el;

		case "tlink":
		el += String.fromCharCode(95,95,116,105,116,108,101,45,108,105,110,107);
		return el;
		
		case "tlinktxt":
		el += String.fromCharCode(95,95,116,105,116,108,101,45,108,105,110,107,45,116,101,120,116);
		return el;
		
		case "alink":
		el += String.fromCharCode(95,95,97,100,100,114,101,115,115);
		return el;
		
		case "dlink":
		el += String.fromCharCode(95,95,100,111,109,97,105,110,45,108,105,110,107);
		return el;
		
		case "piclink":
		el += String.fromCharCode(95,95,112,105,99);
		return el;
		
		case "ytext":
		el += String.fromCharCode(95,95,116,101,120,116);
		return el;

		case "yurl":
		el += String.fromCharCode(95,95,117,114,108);
		return el;

		default:
		break;
	}
}//getlinkcl(somel)

function getpr()
{
 return String.fromCharCode(121,97,45,112,97,114,116,110,101,114);
}


