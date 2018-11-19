function getMultimedia() {
    loadJSON(window.multimedia_list_url, function(response) {
        console.log("multimedia: " + window.multimedia_list_url);
        window.multimedia = JSON.parse(response);
        console.log(JSON.stringify(window.multimedia));
        drawMultimedia();
    });
}

function drawMultimedia() {
    $('#multimedia-files').html(
        '<div class="row">' +
        '   <div class="col-xs-12">' +
        '       <div class="col-xs-1 text-center first-col"><a href="#" id="select-all">Выбрать все</a></div>' +
        '       <div class="col-xs-1 text-center">Превью</div>' +
        '       <div class="col-xs-10">Имя файла</div>' +
        '   </div>' +
        '</div>'
    );

    $.each(window.multimedia, function(key, file){
        $('#multimedia-files').append(
            '<div class="row">' +
            '   <div class="col-xs-12">' +
            '       <div class="col-xs-1 text-center first-col"><input type="checkbox" rel="' + file + '"></div>' +
            '       <div class="col-xs-1 text-center"><a class="show-big" href="' + window.multimedia_files_url + '/' + file + '"><img src="' + window.multimedia_files_url + '/' + file + '"></a></div>' +
            '       <div class="col-xs-10">' + file + '</div>' +
            '   </div>' +
            '</div>'
        );
    });

    $('.show-big').fancybox();

    $('.refresh-files').unbind('click').click(function(){
        getMultimedia();
    });

    $('#select-all').unbind('click').click(function(){
        //if($(this).hasClass('all-selected')) {
        //    $('#multimedia-files input[type=checkbox]').each(function () {
        //        $(this).prop('checked', false);
        //    });
        //    $(this).removeClass('all-selected');
        //} else {
            $('#multimedia-files input[type=checkbox]').each(function () {
                $(this).prop('checked', true);
            });
        //    $(this).addClass('all-selected');
        //}
        return false;
    });

    $('#delete-selected').unbind('click').click(function(){
        var deleteFiles = [];
        $('#multimedia-files input[type=checkbox]').each(function () {
            if($(this).prop("checked") == true) {
                deleteFiles.push(window.multimedia_save_path + '/' + $(this).attr('rel'));
            }
        });
        DeleteMediaFile(deleteFiles);
    });
}

$(document).ready(function() {
    loadJSON("robot_address.json", function(response) {
        window.config = JSON.parse(response);
        window.multimedia_rest_url = window.config.multimedia_rest_url;
        window.multimedia_list_url = window.config.multimedia_list_url;
        window.multimedia_files_url = window.config.multimedia_files_url.replace(/\/$/, '');
        window.multimedia_save_path = window.config.multimedia_save_path.replace(/\/$/, '');
        $('.multimedia .file-upload iframe').attr('src', window.config.multimedia_list_url);
        getMultimedia();
    });
});