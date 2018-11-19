/**
 * Created by rostislav on 19.06.16.
 */

function SendMediaFile() {
    var ws = new WebSocket(window.config.multimedia_rest_url + '/rest/fupload');
    ws.binaryType = "arraybuffer";
    ws.onopen = function() {
        console.log("Connected.");
        var file = document.getElementById('uploaded-file').files[0];
        var rawData = new ArrayBuffer();
        ws.send(window.multimedia_save_path + '/' + file.name);
        var reader = new FileReader();
        reader.loadend = function() {
            console.log('end loading');
        };
        reader.onload = function(e) {
            rawData = e.target.result;
            ws.send(rawData);
            console.log('File "' + window.multimedia_save_path + '/' + file.name + '" has been transferred.');
        };
        reader.readAsArrayBuffer(file);
    };
    ws.onmessage = function(e) {
        var json = JSON.parse(e.data);
        console.log(JSON.stringify(json));
        if ('status' in json) {
            if (json['status'] === 'save') {
                getMultimedia();
            }
        }
    };
    ws.onclose = function() {
        console.log("Connection is closed...");
    };
    ws.onerror = function(e) {
        console.log(e.msg);
    };
}


function DeleteMediaFile(files) {
    var ws = new WebSocket(window.multimedia_rest_url + '/rest/fdelete');
    ws.onopen = function() {
        console.log("Connected.");
        var del = {
          paths:[]
        };
        for(var i in files) {
            del.paths[i] = {
                path:files[i]
            };
        }
        console.log('delete media: ' + JSON.stringify(del));
        ws.send(JSON.stringify(del));
    };
    ws.onmessage = function(e) {
        var json = JSON.parse(e.data);
        console.log(JSON.stringify(json));
        if ('status' in json) {
            if (json['status'] === 'ok') {
                getMultimedia();
            }
        }
    };
    ws.onclose = function() {
        console.log("Connection is closed...");
    };
    ws.onerror = function(e) {
        console.log(e.msg);
    };
}